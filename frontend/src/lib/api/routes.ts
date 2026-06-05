const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';

function apiUrl(path: `/${string}`) {
  return `${API_BASE}${path}`;
}

export const apiRoutes = {
  health: apiUrl('/health'),
  apiHealth: apiUrl('/api/health'),
  auth: {
    google: apiUrl('/api/auth/google'),
  },
  otp: {
    send: apiUrl('/api/otp/send'),
    verify: apiUrl('/api/otp/verify'),
  },
  ngos: {
    list: apiUrl('/api/ngos'),
    create: apiUrl('/api/ngos'),
  },
  projects: {
    list: apiUrl('/api/projects'),
    create: apiUrl('/api/projects'),
    byId: (id: number | string) => apiUrl(`/api/projects/${id}`),
  },
  donations: {
    list: apiUrl('/api/donations'),
    create: apiUrl('/api/donations'),
    confirm: apiUrl('/api/donations/confirm'),
    verifyPrepare: (id: number | string) => apiUrl(`/api/donations/${id}/verify/prepare`),
    verifyConfirm: (id: number | string) => apiUrl(`/api/donations/${id}/verify/confirm`),
  },
  evidence: {
    prepare: apiUrl('/api/evidence/prepare'),
    confirm: apiUrl('/api/evidence/confirm'),
    retrieve: (cid: string) => apiUrl(`/api/evidence/retrieve/${cid}`),
    health: apiUrl('/api/evidence/health'),
  },
  chat: {
    message: apiUrl('/api/chat/message'),
    suggestions: apiUrl('/api/chat/suggestions'),
    health: apiUrl('/api/chat/health'),
  },
  external: {
    stellarPriceInr: 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=inr',
  },
} as const;

export { API_BASE };
