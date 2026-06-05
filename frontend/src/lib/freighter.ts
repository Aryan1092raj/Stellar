import {
  isAllowed,
  isConnected as checkFreighterConnection,
  requestAccess,
  setAllowed,
} from '@stellar/freighter-api';

export const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/';

const DEFAULT_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 250;

type FreighterWindow = Window & {
  freighter?: boolean;
  freighterApi?: unknown;
};

export type FreighterDiagnostics = {
  isBrowser: boolean;
  isEmbeddedPreview: boolean;
  hasFreighterFlag: boolean;
  hasLegacyFreighterApi: boolean;
  connectionReported: boolean;
  connectionError?: string;
  allowedReported?: boolean;
  allowedError?: string;
  browserName: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreighterWindow() {
  if (typeof window === 'undefined') return false;

  return window as FreighterWindow;
}

function hasInjectedFreighter() {
  const freighterWindow = getFreighterWindow();
  if (!freighterWindow) return false;

  return Boolean(freighterWindow.freighter || freighterWindow.freighterApi);
}

function isEmbeddedPreview() {
  if (typeof window === 'undefined') return false;

  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getBrowserName() {
  if (typeof navigator === 'undefined') return 'unknown browser';

  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome') || ua.includes('CriOS')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'unknown browser';
}

export function freighterErrorMessage(error: unknown, fallback = 'Freighter request failed') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

export async function isFreighterAvailable({
  retries = DEFAULT_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: {
  retries?: number;
  retryDelayMs?: number;
} = {}) {
  if (typeof window === 'undefined') return false;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (hasInjectedFreighter()) return true;

    try {
      const connection = await checkFreighterConnection();
      if (!connection.error && connection.isConnected) return true;
    } catch {
      // Freighter may not have injected yet. Retry briefly below.
    }

    if (attempt < retries) {
      await delay(retryDelayMs);
    }
  }

  return false;
}

export async function getFreighterDiagnostics({
  retries = DEFAULT_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: {
  retries?: number;
  retryDelayMs?: number;
} = {}): Promise<FreighterDiagnostics> {
  if (typeof window === 'undefined') {
    return {
      isBrowser: false,
      isEmbeddedPreview: false,
      hasFreighterFlag: false,
      hasLegacyFreighterApi: false,
      connectionReported: false,
      browserName: 'server',
    };
  }

  let connectionReported = false;
  let connectionError: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const freighterWindow = getFreighterWindow();
    const hasFreighterFlag = Boolean(freighterWindow && freighterWindow.freighter);
    const hasLegacyFreighterApi = Boolean(freighterWindow && freighterWindow.freighterApi);

    if (hasFreighterFlag || hasLegacyFreighterApi) {
      connectionReported = true;
      break;
    }

    try {
      const connection = await checkFreighterConnection();
      connectionReported = Boolean(connection.isConnected);
      connectionError = connection.error
        ? freighterErrorMessage(connection.error)
        : undefined;

      if (connectionReported) break;
    } catch (error) {
      connectionError = freighterErrorMessage(error);
    }

    if (attempt < retries) {
      await delay(retryDelayMs);
    }
  }

  let allowedReported: boolean | undefined;
  let allowedError: string | undefined;

  if (connectionReported) {
    try {
      const allowed = await isAllowed();
      allowedReported = allowed.isAllowed;
      allowedError = allowed.error
        ? freighterErrorMessage(allowed.error)
        : undefined;
    } catch (error) {
      allowedError = freighterErrorMessage(error);
    }
  }

  const freighterWindow = getFreighterWindow();

  return {
    isBrowser: true,
    isEmbeddedPreview: isEmbeddedPreview(),
    hasFreighterFlag: Boolean(freighterWindow && freighterWindow.freighter),
    hasLegacyFreighterApi: Boolean(freighterWindow && freighterWindow.freighterApi),
    connectionReported,
    connectionError,
    allowedReported,
    allowedError,
    browserName: getBrowserName(),
  };
}

export function formatFreighterUnavailableMessage(diagnostics: FreighterDiagnostics) {
  if (!diagnostics.isBrowser) {
    return 'Freighter can only connect from a browser page.';
  }

  const status = `Diagnostics: browser=${diagnostics.browserName}, embedded=${diagnostics.isEmbeddedPreview ? 'yes' : 'no'}, window.freighter=${diagnostics.hasFreighterFlag ? 'yes' : 'no'}, extensionMessaging=${diagnostics.connectionReported ? 'yes' : 'no'}.`;

  if (diagnostics.isEmbeddedPreview) {
    return `Freighter is installed, but wallet extensions usually cannot connect inside VS Code/Codex web preview iframes. Open http://127.0.0.1:3000 in the real browser profile where the Freighter extension is enabled, then refresh. ${status}`;
  }

  if (diagnostics.browserName === 'Safari') {
    return `Freighter is installed as an app, but this Safari page cannot see the Freighter browser extension yet. Open Safari Settings > Extensions, enable Freighter, allow it for 127.0.0.1, then refresh this page. ${status}`;
  }

  return `Freighter is installed as an app, but this page cannot see the Freighter browser extension yet. Enable the extension for this browser profile and allow site access to http://127.0.0.1:3000, then refresh. ${status}`;
}

export async function assertFreighterAvailable() {
  const diagnostics = await getFreighterDiagnostics();
  if (!diagnostics.connectionReported) {
    throw new Error(formatFreighterUnavailableMessage(diagnostics));
  }
}

export async function requestFreighterAddress() {
  await assertFreighterAvailable();

  const allowed = await isAllowed();
  if (allowed.error) {
    throw new Error(freighterErrorMessage(allowed.error, 'Could not check Freighter permissions'));
  }

  if (!allowed.isAllowed) {
    const allowResult = await setAllowed();
    if (allowResult.error) {
      throw new Error(freighterErrorMessage(allowResult.error, 'Freighter access was rejected'));
    }

    if (!allowResult.isAllowed) {
      throw new Error('Freighter access was not approved');
    }
  }

  const access = await requestAccess();
  if (access.error || !access.address) {
    throw new Error(freighterErrorMessage(access.error, 'Freighter did not return a wallet address'));
  }

  return access.address;
}
