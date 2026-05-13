/**
 * api.ts — centralised fetch wrapper
 *
 * In production (Vercel) every request goes through /api-proxy/* which is a
 * same-origin serverless function that forwards the call to Laravel Cloud.
 * This eliminates the __cf_bm / SameSite cookie rejections and CORS issues
 * that occur when the browser talks directly to laravel.cloud.
 *
 * In local dev (vite) the proxy path also works because vite.config.ts
 * forwards /api-proxy to the same backend URL.
 */

/**
 * PROXY_BASE is always same-origin → no CORS, no cross-domain cookie issues.
 * BASE_URL is kept for display purposes only (URL bar, cURL copy).
 */
export const PROXY_BASE = '/api-proxy';
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

    // Route through same-origin proxy — fixes __cf_bm / SameSite rejections
    const url = `${PROXY_BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const duration = Math.round(performance.now() - start);
    let data: T | null = null;
    let text = '';
    try {
      text = await res.text();
      if (text) data = JSON.parse(text) as T;
    } catch {
      // If parsing fails, we store the raw text in data (as any) so the 
      // UI can display the "Raw: ..." error correctly.
      data = text as unknown as T;
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
