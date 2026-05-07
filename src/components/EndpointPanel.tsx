import { useState } from 'react';
import { apiRequest, BASE_URL } from '../api';
import type { Endpoint } from '../types';

interface Props { endpoint: Endpoint; }

function statusClass(s: number) {
  if (s === 0) return 'status-0';
  if (s < 300) return 'status-2xx';
  if (s < 400) return 'status-3xx';
  if (s < 500) return 'status-4xx';
  return 'status-5xx';
}

function statusLabel(s: number) {
  const m: Record<number, string> = {
    200: '200 OK', 201: '201 Created', 202: '202 Accepted', 204: '204 No Content',
    400: '400 Bad Request', 401: '401 Unauthorized', 403: '403 Forbidden',
    404: '404 Not Found', 422: '422 Unprocessable', 500: '500 Server Error', 0: 'Network Error',
  };
  return m[s] ?? `${s}`;
}

export default function EndpointPanel({ endpoint }: Props) {
  const [pathValues, setPathValues] = useState<Record<string, string>>(
    Object.fromEntries((endpoint.pathParams ?? []).map(p => [p.key, p.example]))
  );
  const [queryValues, setQueryValues] = useState<Record<string, string>>(
    endpoint.queryParams ? { ...endpoint.queryParams } : {}
  );
  const hasBody = endpoint.defaultBody !== undefined && ['POST', 'PUT', 'DELETE'].includes(endpoint.method);
  const [bodyText, setBodyText] = useState(
    endpoint.defaultBody ? JSON.stringify(endpoint.defaultBody, null, 2) : ''
  );
  const [bodyError, setBodyError] = useState('');
  const [response, setResponse] = useState<{ data: unknown; status: number; ok: boolean; duration: number; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const resolvePath = () => {
    let p = endpoint.path;
    for (const [key, val] of Object.entries(pathValues)) p = p.replace(`:${key}`, val || `:${key}`);
    const qs = Object.entries(queryValues).filter(([, v]) => v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    return qs.length ? `${p}?${qs.join('&')}` : p;
  };

  const fire = async () => {
    setBodyError('');
    let body: unknown = undefined;
    if (hasBody && bodyText.trim()) {
      try { body = JSON.parse(bodyText); }
      catch { setBodyError('Invalid JSON body'); return; }
    }
    setLoading(true);
    const res = await apiRequest(endpoint.method, resolvePath(), body);
    setLoading(false);
    setResponse(res);
  };

  const copyAsCurl = () => {
    let body = '';
    if (hasBody && bodyText.trim()) {
      try { body = JSON.stringify(JSON.parse(bodyText)); }
      catch { /* use raw */ body = bodyText; }
    }

    const curl = `curl -X ${endpoint.method} "${BASE_URL}${resolvePath()}" \\
  -H "Accept: application/json" ${hasBody ? '\\\n  -H "Content-Type: application/json" ' : ''}\\
  ${hasBody ? `-d '${body.replace(/'/g, "'\\''")}'` : ''} \\
  --cookie "auth_token=YOUR_TOKEN_HERE"`;

    navigator.clipboard.writeText(curl.trim());
  };

  const resolvedPath = resolvePath();

  return (
    <div className="endpoint-panel">
      {/* Title */}
      <div>
        <div className="panel-title">
          <span className={`method-badge method-${endpoint.method}`}>{endpoint.method}</span>
          {endpoint.label}
        </div>
        <p className="panel-desc" style={{ marginTop: 6 }}>{endpoint.description}</p>
      </div>

      {/* URL Bar */}
      <div className="url-bar">
        <span className="url-base">{BASE_URL}</span>
        <span className="url-path">{resolvedPath}</span>
        <button className="btn btn-xs btn-ghost" style={{ marginLeft: 'auto', flexShrink: 0 }}
          onClick={() => navigator.clipboard.writeText(BASE_URL + resolvedPath)}>⎘</button>
      </div>

      {/* Path Params */}
      {(endpoint.pathParams ?? []).length > 0 && (
        <div>
          <label className="label">Path Parameters</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(endpoint.pathParams ?? []).map(p => (
              <div key={p.key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, alignItems: 'center' }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: '#fbbf24' }}>:{p.key}</div>
                <input id={`path-${endpoint.id}-${p.key}`} type="text" className="input"
                  placeholder={p.example} value={pathValues[p.key] ?? ''}
                  onChange={e => setPathValues(prev => ({ ...prev, [p.key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Params */}
      {Object.keys(queryValues).length > 0 && (
        <div>
          <label className="label">Query Parameters <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(queryValues).map(([key, val]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, alignItems: 'center' }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: '#a78bfa' }}>{key}</div>
                <input id={`query-${endpoint.id}-${key}`} type="text" className="input"
                  placeholder={`${key}…`} value={val}
                  onChange={e => setQueryValues(prev => ({ ...prev, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      {hasBody && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <label className="label" style={{ margin: 0 }}>Request Body <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(JSON)</span></label>
            <button className="btn btn-xs btn-ghost" onClick={() => setBodyText(JSON.stringify(endpoint.defaultBody, null, 2))}>Reset</button>
          </div>
          <textarea id={`body-${endpoint.id}`} className="input" value={bodyText}
            onChange={e => { setBodyText(e.target.value); setBodyError(''); }}
            spellCheck={false} rows={Math.min(12, bodyText.split('\n').length + 1)} />
          {bodyError && <div className="alert alert-error" style={{ marginTop: 8 }}>⚠ {bodyError}</div>}
        </div>
      )}

      {/* Fire */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button id={`fire-${endpoint.id}`} className="btn btn-primary" onClick={fire} disabled={loading} style={{ minWidth: 140 }}>
          {loading ? <><div className="spinner" /> Sending…</> : <>{endpoint.method === 'GET' ? '⚡' : '🚀'} Send Request</>}
        </button>
        <button className="btn btn-ghost" onClick={copyAsCurl} title="Copy as cURL">
          cURL ⎘
        </button>
      </div>

      {/* Response */}
      <div className="response-box">
        <div className="response-header">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Response</span>
          {response && (
            <>
              <span className={`status-badge ${statusClass(response.status)}`}>{statusLabel(response.status)}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{response.duration}ms</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-xs btn-ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))}>⎘ Copy</button>
                <button className="btn btn-xs btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setResponse(null)}>✕ Clear</button>
              </div>
            </>
          )}
        </div>
        {response ? (
          <div className="response-body">
            {response.error
              ? <span style={{ color: '#f87171' }}>🔴 {response.error}</span>
              : JSON.stringify(response.data, null, 2)
            }
          </div>
        ) : (
          <div className="response-idle">Hit "Send Request" to see the response</div>
        )}
      </div>
    </div>
  );
}
