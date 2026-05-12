import { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import { apiRequest } from '../api';


interface Patient { id: number; patient_identifier: string; name?: string; age?: number; }
interface Examination { id: number; status: string; patient_id: number; }
interface WsiUpload { id: number; original_filename: string; status: string; features_path?: string; }
interface XaiResult { patch_attention: { patch_index: number; attention: number }[]; gate_img: number; gate_clin: number; heatmap_b64?: string; }
interface PredictionResult {
  id: number; status: string; pred_label: string; is_lum_a: boolean;
  confidence_lum_a: number; confidence_non_lum_a: number;
  inference_type: string; n_checkpoints: number;
  patch_attention?: { patch_index: number; attention: number }[];
  gate_img?: number; gate_clin?: number;
}

const STEP_LABELS = ['Patient', 'WSI Upload', 'AI Prediction', 'Results'];
const STEP_ICONS  = ['👤', '🔬', '🤖', '📊'];

function ProgressBar({ pct, color = '#3b82f6' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}cc)`, borderRadius: 4, transition: 'width .4s ease' }} />
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < current; const active = i === current;
        const c = done ? '#22c55e' : active ? '#3b82f6' : 'var(--border)';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: done ? '#22c55e22' : active ? '#3b82f622' : 'var(--bg-elevated)', border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'all .3s' }}>
                {done ? '✓' : STEP_ICONS[i]}
              </div>
              <div style={{ fontSize: 10, color: active ? '#3b82f6' : done ? '#22c55e' : 'var(--text-muted)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>{label}</div>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : 'var(--border)', margin: '0 4px', marginBottom: 20, transition: 'background .3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PredictionWizard({ user }: { user: User }) {
  const [step, setStep]         = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selPatient, setSelPatient] = useState<Patient | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [exam, setExam]         = useState<Examination | null>(null);
  const [wsi, setWsi]           = useState<WsiUpload | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [xai, setXai]           = useState<XaiResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // new patient form
  const [newPat, setNewPat] = useState({ name: '', date_of_birth: '1975-01-01', gender: 'female', national_id: '' });

  useEffect(() => {
    apiRequest<any>('GET', '/doctor/patients').then(r => {
      if (r.ok && r.data) {
        const d = r.data.data ?? r.data;
        setPatients(Array.isArray(d) ? d : (d.data ?? []));
      }
    });
  }, []);

  const createPatient = async () => {
    setLoading(true); setError('');
    const r = await apiRequest<any>('POST', '/doctor/patients', newPat);
    setLoading(false);
    if (r.ok && r.data) {
      const p = r.data.data ?? r.data;
      setPatients(prev => [p, ...prev]);
      setSelPatient(p);
      setShowCreate(false);
    } else setError(r.data?.message ?? 'Failed to create patient');
  };

  const createExamAndWsi = async () => {
    if (!selPatient) return;
    setLoading(true); setError(''); setProgress(10); setStatus('Creating examination…');
    const er = await apiRequest<any>('POST', '/doctor/examinations', { patient_id: selPatient.id, notes: 'AI-assisted examination' });
    if (!er.ok) { setError(er.data?.message ?? 'Failed to create examination'); setLoading(false); return; }
    const e: Examination = er.data?.data ?? er.data;
    setExam(e);
    setProgress(30); setStatus('Registering WSI upload…');
    const wr = await apiRequest<any>('POST', '/doctor/wsi-uploads', {
      examination_id: e.id,
      file_path: `wsis/slide_${selPatient.id}_${Date.now()}.svs`,
      original_filename: `biopsy_patient_${selPatient.id}.svs`,
    });
    if (!wr.ok) { setError(wr.data?.message ?? 'Failed to register WSI'); setLoading(false); return; }
    const w: WsiUpload = wr.data?.data ?? wr.data;
    setWsi(w);
    setProgress(50); setStatus('Extracting CONCH features (simulated)…');
    await apiRequest<any>('POST', `/doctor/wsi-uploads/${w.id}/extract-features?simulate=1`, {});
    setProgress(70); setStatus('Features ready. Proceeding to prediction step…');
    setLoading(false);
    setStep(2);
  };

  const runPrediction = async () => {
    if (!exam || !wsi) return;
    setLoading(true); setError(''); setProgress(0); setStatus(`Dispatching AI prediction job for ${user.name}...`);

    // Get active model
    const mr = await apiRequest<any>('GET', '/admin/ai-models');
    const models = (mr.data?.data ?? mr.data?.data ?? []);
    const activeModel = Array.isArray(models) ? models.find((m: any) => m.is_active) : null;

    setProgress(15); setStatus('Sending to HuggingFace inference engine…');
    const pr = await apiRequest<any>('POST', '/doctor/predictions', {
      examination_id: exam.id,
      wsi_upload_id: wsi.id,
      ai_model_id: activeModel?.id ?? 1,
    });
    if (!pr.ok) { setError(pr.data?.message ?? 'Failed to dispatch prediction'); setLoading(false); return; }
    const pred: PredictionResult = pr.data?.data ?? pr.data;
    setPrediction(pred);
    setProgress(30); setStatus('Prediction queued. Polling status…');

    // Poll
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks++;
      const sr = await apiRequest<any>('GET', `/doctor/predictions/${pred.id}/status`);
      const latest = sr.data?.data ?? sr.data;
      setProgress(Math.min(30 + ticks * 8, 90));
      setStatus(`Inference running… (${ticks * 3}s elapsed)`);
      if (latest?.status === 'completed' || latest?.status === 'failed') {
        clearInterval(pollRef.current!);
        setPrediction(latest);
        setProgress(95); setStatus('Fetching XAI results…');
        // Fetch XAI
        const xr = await apiRequest<any>('GET', `/doctor/xai-results/${pred.id}`);
        if (xr.ok && xr.data) setXai(xr.data?.data ?? xr.data);
        setProgress(100); setStatus('Done!');
        setLoading(false);
        setStep(3);
      }
      if (ticks > 30) { clearInterval(pollRef.current!); setLoading(false); setStatus('Timed out. Try polling manually.'); }
    }, 3000);
  };

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', maxWidth: 720 };

  return (
    <div style={{ maxWidth: 740 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px' }}>🤖 AI Prediction Pipeline</h2>
      <StepIndicator current={step} />

      {/* ── Step 0: Patient ── */}
      {step === 0 && (
        <div style={card}>
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 16px', fontSize: 17 }}>👤 Select or Create Patient</h3>
          {patients.length > 0 && !showCreate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
              {patients.map(p => (
                <div key={p.id} id={`pat-${p.id}`} onClick={() => setSelPatient(p)}
                  style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${selPatient?.id === p.id ? '#3b82f6' : 'var(--border)'}`, background: selPatient?.id === p.id ? '#3b82f618' : 'var(--bg-elevated)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f622', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.patient_identifier}</div>
                    {p.age && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Age {p.age}</div>}
                  </div>
                  {selPatient?.id === p.id && <div style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: 18 }}>✓</div>}
                </div>
              ))}
            </div>
          )}
          <button id="btn-create-patient" onClick={() => setShowCreate(v => !v)}
            style={{ fontSize: 12, background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: 'var(--text-muted)', marginBottom: 16 }}>
            {showCreate ? '← Back to list' : '+ Create New Patient'}
          </button>
          {showCreate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {(['name', 'national_id'] as const).map(k => (
                <input key={k} className="input" placeholder={k === 'name' ? 'Full Name' : 'National ID'} value={newPat[k]}
                  onChange={e => setNewPat(p => ({ ...p, [k]: e.target.value }))} />
              ))}
              <input className="input" type="date" value={newPat.date_of_birth} onChange={e => setNewPat(p => ({ ...p, date_of_birth: e.target.value }))} />
              <select className="input" value={newPat.gender} onChange={e => setNewPat(p => ({ ...p, gender: e.target.value }))}>
                <option value="female">Female</option><option value="male">Male</option>
              </select>
              {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
              <button id="btn-save-patient" className="btn btn-primary" onClick={createPatient} disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : 'Save Patient'}
              </button>
            </div>
          )}
          <button id="btn-next-wsi" className="btn btn-primary" disabled={!selPatient} onClick={() => setStep(1)}
            style={{ opacity: selPatient ? 1 : 0.4, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
            Next: WSI Upload →
          </button>
        </div>
      )}

      {/* ── Step 1: WSI ── */}
      {step === 1 && (
        <div style={card}>
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 6px', fontSize: 17 }}>🔬 WSI Upload & Feature Extraction</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 20px' }}>
            Patient: <strong style={{ color: 'var(--text-primary)' }}>{selPatient?.patient_identifier}</strong>
          </p>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>This will:</div>
            {['Create an Examination for the patient', 'Register a WSI file path', 'Simulate CONCH feature extraction (patch→.pt)', 'Prepare features for the AI model'].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span style={{ color: '#22c55e' }}>✓</span> {t}
              </div>
            ))}
          </div>
          {loading && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</div>
              <ProgressBar pct={progress} color="#22c55e" />
            </div>
          )}
          {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>← Back</button>
            <button id="btn-create-exam-wsi" className="btn btn-primary" disabled={loading} onClick={createExamAndWsi}
              style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Processing…</> : '🔬 Create Exam & Extract Features'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Predict ── */}
      {step === 2 && (
        <div style={card}>
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 6px', fontSize: 17 }}>🤖 Run AI Prediction</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 20px' }}>
            Examination <strong style={{ color: 'var(--text-primary)' }}>#{exam?.id}</strong> · WSI <strong style={{ color: 'var(--text-primary)' }}>#{wsi?.id}</strong>
          </p>
          <div style={{ background: '#3b82f611', border: '1px solid #3b82f633', borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            The A6 Cross-Attention Fusion model will run across <strong>15 checkpoints</strong> with <strong>8× TTA</strong> each. Prediction may take 1–5 minutes on CPU.
          </div>
          {loading && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{status}</div>
              <ProgressBar pct={progress} color="#8b5cf6" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Auto-polling every 3 seconds…</div>
            </div>
          )}
          {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#ef444418', borderRadius: 8 }}>{error}</div>}
          <button id="btn-run-prediction" className="btn btn-primary" disabled={loading} onClick={runPrediction}
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', padding: '12px 28px', fontSize: 15, fontWeight: 700 }}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Running…</> : '🚀 Begin AI Prediction'}
          </button>
        </div>
      )}

      {/* ── Step 3: Results ── */}
      {step === 3 && prediction && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Verdict card */}
          <div style={{ ...card, border: `2px solid ${prediction.is_lum_a ? '#22c55e' : '#ef4444'}`, background: prediction.is_lum_a ? '#22c55e0a' : '#ef44440a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 52 }}>{prediction.is_lum_a ? '🟢' : '🔴'}</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: prediction.is_lum_a ? '#22c55e' : '#ef4444' }}>
                  {prediction.pred_label}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  {prediction.is_lum_a ? 'Luminal A breast cancer detected' : 'Non-Luminal A subtype detected'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Model: {prediction.inference_type} · {prediction.n_checkpoints} checkpoints
                </div>
              </div>
            </div>
          </div>

          {/* Confidence */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>📈 Confidence Scores</div>
            {[
              { label: 'Luminal A', val: prediction.confidence_lum_a, color: '#22c55e' },
              { label: 'Non-Luminal A', val: prediction.confidence_non_lum_a, color: '#ef4444' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{(val * 100).toFixed(1)}%</span>
                </div>
                <ProgressBar pct={val * 100} color={color} />
              </div>
            ))}
            {prediction.gate_img !== undefined && (
              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Image Gate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{((prediction.gate_img ?? 0) * 100).toFixed(1)}%</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Clinical Gate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{((prediction.gate_clin ?? 0) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Heatmap Image */}
          {xai?.heatmap_b64 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>🖼️ XAI Heatmap (Zoomed)</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Each cell shows a high-attention patch. Warmer colors (red/yellow) indicate areas the AI focused on most for this diagnosis.
              </div>
              <img
                src={`data:image/png;base64,${xai.heatmap_b64}`}
                alt="XAI Heatmap"
                style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
              />
            </div>
          )}

          {/* XAI attention */}
          {xai?.patch_attention && xai.patch_attention.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>🧠 Top Attention Patches (XAI)</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Top {Math.min(10, xai.patch_attention.length)} patches driving the model's decision — zoomed in, not the whole slide.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {xai.patch_attention.slice(0, 10).map((p, i) => (
                  <div key={p.patch_index} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '6px 10px', fontSize: 11, border: `1px solid ${i < 3 ? '#f59e0b' : 'var(--border)'}` }}>
                    <div style={{ color: i < 3 ? '#f59e0b' : 'var(--text-muted)' }}>#{i + 1} Patch {p.patch_index}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(p.attention * 100).toFixed(2)}%</div>
                  </div>
                ))}
              </div>
              {xai.gate_img !== undefined && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                  Fusion gate — Image: <strong style={{ color: '#3b82f6' }}>{((xai.gate_img) * 100).toFixed(1)}%</strong> · Clinical: <strong style={{ color: '#f59e0b' }}>{((xai.gate_clin ?? 0) * 100).toFixed(1)}%</strong>
                </div>
              )}
            </div>
          )}

          {/* Report + restart */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button id="btn-create-report" className="btn btn-primary"
              onClick={async () => {
                const r = await apiRequest<any>('POST', '/doctor/reports', {
                  examination_id: exam?.id,
                  title: `AI Report — ${prediction.pred_label} — Patient ${selPatient?.patient_identifier}`,
                  content: `Prediction: ${prediction.pred_label}\nConfidence LumA: ${(prediction.confidence_lum_a * 100).toFixed(1)}%\nConfidence Non-LumA: ${(prediction.confidence_non_lum_a * 100).toFixed(1)}%\nModel: ${prediction.inference_type}\nCheckpoints: ${prediction.n_checkpoints}`,
                });
                if (r.ok) alert('✅ Report created successfully!');
              }}
              style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
              📄 Generate Report
            </button>
            <button id="btn-new-prediction" className="btn" onClick={() => { setStep(0); setPrediction(null); setXai(null); setExam(null); setWsi(null); setSelPatient(null); setProgress(0); }}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              🔁 New Prediction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
