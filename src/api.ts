export const BASE_URL =
  import.meta.env.VITE_API_URL ??
  'https://breast-cancer-detection-backend-main-p7c9cg.laravel.cloud/api';

export interface ApiResponse<T = unknown> {
  data: T | null;
  status: number;
  ok: boolean;
  duration: number;
  error?: string;
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<ApiResponse<T>> {
  const start = performance.now();
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...extraHeaders,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',   // sends the HttpOnly auth_token cookie
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const duration = Math.round(performance.now() - start);
    let data: T | null = null;
    try {
      const text = await res.text();
      if (text) data = JSON.parse(text) as T;
    } catch {
      /* non-JSON body */
    }
    return { data, status: res.status, ok: res.ok, duration };
  } catch (e: unknown) {
    const duration = Math.round(performance.now() - start);
    return {
      data: null,
      status: 0,
      ok: false,
      duration,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}
