import { apiRoutes } from './api/routes';

// ===== OTP FLOW =====

export async function sendOtp(email: string) {
  const res = await fetch(apiRoutes.otp.send, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to send OTP");
  }

  return res.json();
}

export async function verifyOtp(email: string, otp: string, role: string) {
  const res = await fetch(apiRoutes.otp.verify, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: otp, role }),
  });

  const data = await res.json();

  if (data.token) {
    saveSession(data.token, role);
    return true;
  }

  return false;
}

// ===== SESSION CORE =====

export function saveSession(token: string, role: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  localStorage.setItem("login_time", Date.now().toString());
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getRole() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("role");
}

// ===== JWT EXPIRY HANDLING =====

type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded && typeof decoded === "object" ? decoded as JwtPayload : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  const decoded = decodeJwt(token);
  if (!decoded?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return now >= decoded.exp;
}

// ===== SESSION RESTORE =====

export function restoreSession(): {
  token: string | null;
  role: string | null;
  isValid: boolean;
} {
  const token = getToken();
  const role = getRole();

  if (!token || !role) {
    return { token: null, role: null, isValid: false };
  }

  if (isTokenExpired()) {
    logout();
    return { token: null, role: null, isValid: false };
  }

  return { token, role, isValid: true };
}

// ===== GLOBAL LOGOUT =====

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.clear();
  window.location.href = "/login/donor";
}

// ===== AUTHORIZED FETCH (FOR ALL API CALLS) =====

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    logout();
    throw new Error("Session expired");
  }

  return res;
}
