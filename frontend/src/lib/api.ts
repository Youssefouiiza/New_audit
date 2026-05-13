// Native Fetch API client with automatic JWT refresh (replaces axios)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

function getAccessToken(): string | null {
  try {
    const stored = sessionStorage.getItem('audit-auth-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const cookie = document.cookie.split('; ').find(c => c.startsWith('refreshToken='));
  const refreshToken = cookie?.split('=')[1];
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  const { useAuthStore } = await import('@/store/useAuthStore');
  useAuthStore.getState().setToken(data.accessToken);
  return data.accessToken;
}

export async function apiFetch(
  path: string,
  options: RequestInit & { isFormData?: boolean } = {}
): Promise<any> {
  const token = getAccessToken();
  const { isFormData, ...fetchOptions } = options;

  // For FormData, do NOT set Content-Type (browser sets it with boundary)
  const headers: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  // Merge any caller-provided headers (skip Content-Type for formdata)
  if (fetchOptions.headers) {
    const callerHeaders = fetchOptions.headers as Record<string, string>;
    Object.entries(callerHeaders).forEach(([k, v]) => {
      if (!(isFormData && k.toLowerCase() === 'content-type')) {
        headers[k] = v;
      }
    });
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  // 401 → try refresh once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });
    } else {
      const { useAuthStore } = await import('@/store/useAuthStore');
      useAuthStore.getState().logout();
      window.location.href = '/login';
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Erreur HTTP ${res.status}` }));
    throw new Error(err.message ?? `Erreur ${res.status}`);
  }

  if (res.status === 204 || res.status === 202) return null;
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return text;
  }
}
