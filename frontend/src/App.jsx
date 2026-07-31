import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Network as VisNetwork } from 'vis-network';
import {
  Network, Database, ShieldCheck, FileText, Search, Upload,
  Sliders, CheckCircle2, RefreshCw, Lock, Sparkles, LogIn,
  LogOut, User, Clock, Activity, Eye, EyeOff, Send,
  AlertTriangle, FileCode, Terminal, Hash, X, Menu,
  TrendingUp, ChevronRight, Inbox, Shield
} from 'lucide-react';

/* ================================================================
   API LAYER
   ================================================================ */
const API = 'http://localhost:8000';
const api = {
  t: () => localStorage.getItem('rag_token'),
  set: (v) => localStorage.setItem('rag_token', v),
  clear: () => localStorage.removeItem('rag_token'),
  hdrs: () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('rag_token') ? { Authorization: `Bearer ${localStorage.getItem('rag_token')}` } : {}),
  }),
  async get(p) {
    try { const r = await fetch(API + p, { headers: this.hdrs() }); return r.ok ? r.json() : null; }
    catch { return null; }
  },
  async post(p, b) {
    try {
      const r = await fetch(API + p, { method: 'POST', headers: this.hdrs(), body: JSON.stringify(b) });
      const d = await r.json().catch(() => ({}));
      return { ok: r.ok, data: d };
    } catch { return { ok: false, data: { detail: 'Cannot reach server.' } }; }
  },
  async upload(p, form) {
    try {
      const h = {}; if (this.t()) h.Authorization = `Bearer ${this.t()}`;
      const r = await fetch(API + p, { method: 'POST', headers: h, body: form });
      const d = await r.json().catch(() => ({}));
      return { ok: r.ok, data: d };
    } catch { return { ok: false, data: { detail: 'Upload failed.' } }; }
  },
};

/* ================================================================
   MICRO-COMPONENTS
   ================================================================ */

const Spinner = ({ size = 15 }) => (
  <RefreshCw size={size} className="spin" />
);

const RiskBadge = ({ risk }) => {
  if (!risk) return null;
  const m = { LOW: 'badge-green', MEDIUM: 'badge-amber', HIGH: 'badge-red' };
  return <span className={`badge ${m[risk] || 'badge-slate'}`}>{risk} risk</span>;
};

const TrustRing = ({ score }) => {
  const s = Math.max(0, Math.min(100, score || 0));
  const r = 30; const c = 2 * Math.PI * r;
  const col = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <div style={{ position: 'relative', width: 74, height: 74 }}>
        <svg width="74" height="74" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="37" cy="37" r={r} stroke="#f0f2f7" strokeWidth="6" fill="none" />
          <circle cx="37" cy="37" r={r} stroke={col} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={c - (s / 100) * c}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s}</span>
          <span style={{ fontSize: 8, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>trust</span>
        </div>
      </div>
    </div>
  );
};

const PageHeader = ({ icon: Icon, color = '#6366f1', title, sub, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div className="section-icon">
        <Icon size={18} color={color} />
      </div>
      <div>
        <h2 className="page-title">{title}</h2>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
    </div>
    {action}
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9ca3af' }}>
    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
      <Icon size={24} color="#a5b4fc" />
    </div>
    <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{message}</p>
  </div>
);

/* ================================================================
   AUTH PAGE
   ================================================================ */
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', email: '', password: '', full_name: '', department: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    const res = await api.post(
      mode === 'login' ? '/auth/login' : '/auth/register',
      mode === 'login' ? { username: f.username, password: f.password } : f
    );
    if (res.ok && res.data?.access_token) { api.set(res.data.access_token); onLogin(res.data); }
    else setErr(res.data?.detail || 'Authentication failed.');
    setLoading(false);
  };

  return (
    <div className="auth-bg">
      <div className="auth-orb-1" />
      <div className="auth-orb-2" />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="scale-in">
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', padding: 14, borderRadius: 18, background: 'linear-gradient(135deg,#4f46e5,#8b5cf6)', boxShadow: '0 8px 28px rgba(79,70,229,0.50)', border: '1px solid rgba(255,255,255,0.18)', marginBottom: 14 }}>
            <Network size={26} color="#fff" />
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
            Enterprise <span className="gradient-text">Graph-RAG</span>
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>
            Knowledge Intelligence Platform · v2.0
          </p>
        </div>

        <div className="auth-card">
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, marginBottom: 26, border: '1px solid rgba(255,255,255,0.07)' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(''); }}
                className={`auth-mode-btn ${mode === m ? 'active' : 'inactive'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {err && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, marginBottom: 18, fontSize: 12.5, color: '#fca5a5', fontWeight: 500 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {err}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'username', label: 'Username', placeholder: 'your_username', type: 'text', show: true },
              { key: 'email', label: 'Email Address', placeholder: 'user@company.com', type: 'email', show: mode === 'register' },
              { key: 'full_name', label: 'Full Name', placeholder: 'Alex Smith', type: 'text', show: mode === 'register' },
              { key: 'department', label: 'Department', placeholder: 'Technology / HR / Legal', type: 'text', show: mode === 'register' },
            ].filter(fi => fi.show).map(fi => (
              <label key={fi.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>{fi.label}</span>
                <input type={fi.type} required value={f[fi.key]} placeholder={fi.placeholder}
                  onChange={e => setF(p => ({ ...p, [fi.key]: e.target.value }))}
                  className="auth-input" />
              </label>
            ))}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>Password</span>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} required value={f.password} placeholder="••••••••"
                  onChange={e => setF(p => ({ ...p, password: e.target.value }))}
                  className="auth-input" style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, display: 'flex' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 6, padding: '12px 20px', fontSize: 14, borderRadius: 11, width: '100%' }}>
              {loading ? <Spinner /> : <LogIn size={15} />}
              {loading ? 'Authenticating…' : mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
          Secured with JWT · Powered by Gemini 2.0 Flash
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN APP
   ================================================================ */
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('rag');
  const [sidebar, setSidebar] = useState(true);

  const [health, setHealth] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [ledger, setLedger] = useState({ blocks: [], chain_integrity: { valid: true } });
  const [docs, setDocs] = useState([]);
  const [history, setHistory] = useState([]);

  const [query, setQuery] = useState('');
  const [queryRes, setQueryRes] = useState(null);
  const [weights, setWeights] = useState({ vector: 0.4, keyword: 0.3, graph: 0.3 });
  const [dept, setDept] = useState('');
  const [reranker, setReranker] = useState(true);
  const [querying, setQuerying] = useState(false);

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamDone, setStreamDone] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [ingDocId, setIngDocId] = useState(null);
  const [ingLogs, setIngLogs] = useState([]);
  const [ingDone, setIngDone] = useState(false);

  const visRef = useRef(null);
  const [selNode, setSelNode] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (api.t()) api.get('/auth/me').then(d => d?.id && setUser(d));
  }, []);

  const refresh = useCallback(async () => {
    const [h, t, g, l, d, hist] = await Promise.all([
      api.get('/api/health'), api.get('/api/system/telemetry'),
      api.get('/api/graph/visualization'), api.get('/api/blockchain/ledger'),
      api.get('/api/documents'), api.get('/api/history'),
    ]);
    if (h?.status)             setHealth(h);
    if (t?.qdrant_vector_store) setTelemetry(t);
    if (g?.nodes)              setGraphData(g);
    if (Array.isArray(l?.blocks)) setLedger(l);
    if (Array.isArray(d))      setDocs(d);
    if (Array.isArray(hist))   setHistory(hist);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* vis-network */
  useEffect(() => {
    if (tab !== 'graph' || !visRef.current || !graphData?.nodes?.length) return;
    const nodes = graphData.nodes.slice(0, 300).map(n => ({
      id: n.id, label: n.label, group: n.type,
      title: `${n.type} · PR: ${n.pagerank}`,
      size: Math.max(12, Math.min(32, 12 + (n.pagerank || 0) * 800)),
    }));
    const edges = (graphData.edges || []).slice(0, 600).map(e => ({
      from: e.from, to: e.to, label: e.label || '', arrows: 'to',
      font: { align: 'middle', size: 10, color: '#9ca3af' },
    }));
    const net = new VisNetwork(visRef.current, { nodes, edges }, {
      nodes: {
        shape: 'dot', font: { size: 12, color: '#1a1d2e', face: 'Inter' },
        borderWidth: 2.5, shadow: { enabled: true, color: 'rgba(0,0,0,0.12)', size: 6 },
      },
      groups: {
        ORGANIZATION: { color: { background: '#eff6ff', border: '#3b82f6', highlight: { background: '#dbeafe', border: '#2563eb' } } },
        TECHNOLOGY:   { color: { background: '#f5f3ff', border: '#7c3aed', highlight: { background: '#ede9fe', border: '#6d28d9' } } },
        CONCEPT:      { color: { background: '#ecfdf5', border: '#059669', highlight: { background: '#d1fae5', border: '#047857' } } },
        METRIC:       { color: { background: '#fffbeb', border: '#d97706', highlight: { background: '#fef3c7', border: '#b45309' } } },
        PERSON:       { color: { background: '#fdf2f8', border: '#db2777', highlight: { background: '#fce7f3', border: '#be185d' } } },
        LOCATION:     { color: { background: '#ecfeff', border: '#0891b2', highlight: { background: '#cffafe', border: '#0e7490' } } },
        ENTITY:       { color: { background: '#f8fafc', border: '#94a3b8', highlight: { background: '#f1f5f9', border: '#64748b' } } },
      },
      edges: { color: { color: '#e5e7eb', highlight: '#6366f1' }, width: 1.5, smooth: { type: 'continuous' } },
      physics: {
        forceAtlas2Based: { gravitationalConstant: -28, centralGravity: 0.004, springLength: 240, springConstant: 0.15 },
        maxVelocity: 140, solver: 'forceAtlas2Based',
        stabilization: { iterations: 160 },
      },
    });
    net.on('click', p => setSelNode(p.nodes[0] ? graphData.nodes.find(n => n.id === p.nodes[0]) : null));
    return () => net.destroy();
  }, [tab, graphData]);

  /* ingestion log polling */
  useEffect(() => {
    if (!ingDocId || ingDone) return;
    const iv = setInterval(async () => {
      const r = await api.get(`/api/documents/${ingDocId}/logs`);
      if (r?.logs) setIngLogs(r.logs);
      if (r?.is_complete) { setIngDone(true); clearInterval(iv); refresh(); }
    }, 700);
    return () => clearInterval(iv);
  }, [ingDocId, ingDone, refresh]);

  if (!user) return <AuthPage onLogin={d => setUser(d)} />;

  /* actions */
  const seed = async () => {
    setSeeding(true);
    await api.post('/api/seed_demo', {});
    await refresh();
    setSeeding(false);
  };

  const runQuery = async (e) => {
    e.preventDefault(); if (!query.trim()) return;
    setQuerying(true); setQueryRes(null); setStreamText(''); setStreamDone(null);
    const r = await api.post('/api/query', {
      query, vector_weight: +weights.vector, keyword_weight: +weights.keyword,
      graph_weight: +weights.graph, top_k: 5, department_filter: dept || null, use_reranker: reranker,
    });
    if (r.ok) { setQueryRes(r.data); refresh(); }
    else alert(r.data?.detail || 'Query failed');
    setQuerying(false);
  };

  const runStream = async (e) => {
    e.preventDefault(); if (!query.trim()) return;
    setStreaming(true); setStreamText(''); setStreamDone(null); setQueryRes(null);
    try {
      const r = await fetch(API + '/api/query/stream', {
        method: 'POST', headers: api.hdrs(),
        body: JSON.stringify({ query, vector_weight: +weights.vector, keyword_weight: +weights.keyword, graph_weight: +weights.graph, top_k: 5, department_filter: dept || null, use_reranker: reranker }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setStreamText(`Error: ${d.detail || 'Failed'}`); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === 'token') { acc += p.text; setStreamText(acc); }
            if (p.type === 'done') setStreamDone(p);
          } catch { }
        }
      }
      refresh();
    } catch (err) { setStreamText(`Error: ${err.message}`); }
    finally { setStreaming(false); }
  };

  const doUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true); setIngLogs([]); setIngDone(false); setIngDocId(null);
    const form = new FormData(); form.append('file', file); form.append('department', dept || '');
    const r = await api.upload('/api/upload', form);
    if (r.ok && r.data?.document_id) setIngDocId(r.data.document_id);
    else alert(r.data?.detail || 'Upload failed');
    setUploading(false); e.target.value = '';
  };

  /* nav config */
  const NAV = [
    { key: 'rag',          icon: Search,      label: 'RAG Studio',          badge: null },
    { key: 'graph',        icon: Network,     label: 'Knowledge Graph',     badge: health?.knowledge_graph?.total_nodes || null },
    { key: 'documents',    icon: FileText,    label: 'Document Library',    badge: docs.length || null },
    { key: 'verification', icon: ShieldCheck, label: 'AI Verifier',         badge: null },
    { key: 'blockchain',   icon: Lock,        label: 'Blockchain Ledger',   badge: health?.blockchain_height ? `#${health.blockchain_height}` : null },
    { key: 'telemetry',    icon: Terminal,    label: 'Component Telemetry', badge: null },
    { key: 'history',      icon: Clock,       label: 'Chat History',        badge: history.length || null },
  ];

  /* ============================================================ */
  return (
    <div className="app-layout">

      {/* ── TOPBAR ────────────────────────────────────────────── */}
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSidebar(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: 6, borderRadius: 7, display: 'flex', transition: 'color 0.15s' }}>
            {sidebar ? <X size={17} /> : <Menu size={17} />}
          </button>
          <div className="topbar-logo">
            <div className="logo-icon"><Network size={17} color="#fff" /></div>
            <div>
              <div className="topbar-title">Graph-RAG</div>
              <div className="topbar-sub">Enterprise Intelligence Platform</div>
            </div>
          </div>
        </div>

        {/* Centre Stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { i: Database, v: health?.vector_store_chunks || 0, l: 'vectors',     c: '#818cf8' },
            { i: Network,  v: health?.knowledge_graph?.total_nodes || 0, l: 'nodes', c: '#34d399' },
            { i: Lock,     v: `#${health?.blockchain_height || 1}`, l: 'blocks',  c: '#a78bfa' },
          ].map(({ i: I, v, l, c }) => (
            <div key={l} className="stat-pill">
              <I size={12} color={c} />
              <span className="stat-pill-val">{v}</span>
              <span>{l}</span>
            </div>
          ))}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={seed} disabled={seeding} className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8 }}>
            {seeding ? <Spinner size={12} /> : <Sparkles size={12} />}
            Seed Demo Data
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px 6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={13} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{user.username}</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{user.role}</div>
            </div>
            <button onClick={() => { api.clear(); setUser(null); }} className="btn btn-danger" style={{ padding: '5px 8px', borderRadius: 7, marginLeft: 4, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <div className="app-body">

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebar ? '' : 'collapsed'}`}>
          <div className="sidebar-inner">
            <div className="nav-section-label">Workspace</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(({ key, icon: Icon, label, badge }) => (
                <button key={key} onClick={() => setTab(key)} className={`nav-item ${tab === key ? 'active' : ''}`}>
                  <Icon size={15} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </button>
              ))}
            </nav>

            <div className="sidebar-divider" style={{ marginTop: 'auto' }} />
            <div className="nav-section-label">Quick Upload</div>
            <div className="upload-widget">
              <input type="text" value={dept} onChange={e => setDept(e.target.value)}
                placeholder="Department tag (optional)"
                style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', fontSize: 11.5, outline: 'none', marginBottom: 8, fontFamily: 'var(--font-sans)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, background: 'rgba(99,102,241,0.14)', border: '1px dashed rgba(129,140,248,0.40)', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 11.5, fontWeight: 600, color: '#a5b4fc', transition: 'all 0.18s' }}>
                <Upload size={12} />
                {uploading ? 'Processing…' : 'Select & Upload File'}
                <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
              </label>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content">

          {/* ======================================================
              RAG STUDIO
              ====================================================== */}
          {tab === 'rag' && (
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <PageHeader icon={Search} title="RAG Studio" sub="Hybrid Vector · BM25 Keyword · Knowledge Graph retrieval with Gemini 2.0 AI" />

              {/* Retrieval Sliders */}
              <div className="card card-p" style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Sliders size={14} color="#6366f1" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Hybrid Retrieval Weights</span>
                    <span className="badge badge-indigo" style={{ fontSize: 9.5 }}>RRF Fusion</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>
                    <input type="checkbox" checked={reranker} onChange={e => setReranker(e.target.checked)} />
                    Neural Re-Ranker
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {[
                    { k: 'vector', l: 'Vector Similarity', sub: 'Qdrant · all-MiniLM-L6-v2', col: '#6366f1' },
                    { k: 'keyword', l: 'BM25 Keyword', sub: 'Custom BM25 · TF-IDF', col: '#8b5cf6' },
                    { k: 'graph', l: 'Knowledge Graph', sub: 'NetworkX · PageRank', col: '#10b981' },
                  ].map(({ k, l, sub, col }) => (
                    <div key={k} style={{ background: '#f8f9ff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1d2e' }}>{l}</div>
                          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{sub}</div>
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{weights[k]}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.1" value={weights[k]}
                        onChange={e => setWeights(p => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <form onSubmit={runQuery} style={{ position: 'relative', marginBottom: 22 }}>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Ask anything — 'How many casual leaves do employees get?' or 'What is our AI tech stack?'"
                  className="input search-input"
                  style={{ paddingRight: 190 }}
                />
                <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6 }}>
                  <button type="submit" disabled={querying} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                    {querying ? <Spinner size={13} /> : <Search size={13} />} Instant
                  </button>
                  <button type="button" onClick={runStream} disabled={streaming} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                    {streaming ? <Spinner size={13} /> : <Send size={13} />} Stream AI
                  </button>
                </div>
              </form>

              {/* Stream Output */}
              {(streaming || streamText) && (
                <div className="card card-accent slide-up" style={{ padding: 24, marginBottom: 20, borderColor: streaming ? 'rgba(99,102,241,0.35)' : 'rgba(16,185,129,0.30)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
                    <Activity size={14} color={streaming ? '#6366f1' : '#10b981'} className={streaming ? 'pulse' : ''} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d2e' }}>
                      {streaming ? 'Streaming from Gemini 2.0 Flash…' : 'Stream Complete'}
                    </span>
                    {streamDone && <RiskBadge risk={streamDone.hallucination_risk} />}
                  </div>
                  <p className={streaming ? 'cursor-blink' : ''} style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' }}>
                    {streamText}
                  </p>
                  {streamDone && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-light)', display: 'flex', gap: 16, alignItems: 'center' }}>
                      <TrustRing score={streamDone.trust_score} />
                      <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-mono)', lineHeight: 2 }}>
                        <div>Trust: <strong style={{ color: '#6366f1' }}>{streamDone.trust_score}%</strong></div>
                        <div>Verdict: <strong style={{ color: '#374151' }}>{streamDone.agent_verdict}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instant Response */}
              {queryRes && (
                <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Answer */}
                  <div className="card" style={{ padding: 26, border: '1px solid rgba(16,185,129,0.22)', boxShadow: '0 4px 16px rgba(16,185,129,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ padding: 10, borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)', flexShrink: 0 }}>
                          <CheckCircle2 size={18} color="#10b981" />
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1a1d2e' }}>Verified Knowledge Answer</h3>
                          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            <span className="badge badge-slate" style={{ fontSize: 10 }}>⚡ {queryRes.latency_ms}ms</span>
                            <RiskBadge risk={queryRes.hallucination_risk} />
                          </div>
                        </div>
                      </div>
                      <TrustRing score={queryRes.trust_score} />
                    </div>
                    <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' }}>{queryRes.answer}</p>
                    {/* Blockchain Seal */}
                    <div style={{ padding: '12px 16px', background: '#f5f3ff', border: '1px solid rgba(139,92,246,0.20)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Lock size={11} color="#7c3aed" />
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Blockchain Seal · Block #{queryRes.blockchain_seal?.block_index}</span>
                      </div>
                      <div className="hash-code" style={{ color: '#6366f1' }}>{queryRes.blockchain_seal?.block_hash}</div>
                    </div>
                  </div>

                  {/* Source Chunks */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 10 }}>
                      Retrieved Evidence Chunks ({queryRes.retrieved_chunks?.length || 0})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
                      {(queryRes.retrieved_chunks || []).map((c, i) => (
                        <div key={i} className="card card-p" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4f46e5', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{c.filename}</span>
                            <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>p.{c.page_num}</span>
                          </div>
                          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.content}</p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span className="badge badge-indigo" style={{ fontSize: 9 }}>RRF {c.hybrid_score?.toFixed(4)}</span>
                            {c.department && <span className="badge badge-blue" style={{ fontSize: 9 }}>{c.department}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!queryRes && !streamText && !streaming && !querying && (
                <EmptyState icon={Sparkles} message={<>Ask a question above, or click <strong style={{ color: '#6366f1' }}>Seed Demo Data</strong> in the top bar to populate sample HR and Technology documents for instant testing.</>} />
              )}
            </div>
          )}

          {/* ======================================================
              KNOWLEDGE GRAPH
              ====================================================== */}
          {tab === 'graph' && (
            <div style={{ maxWidth: 1080, margin: '0 auto' }}>
              <PageHeader icon={Network} color="#10b981" title="Knowledge Graph Explorer"
                sub={`${health?.knowledge_graph?.total_nodes || 0} entities · ${health?.knowledge_graph?.total_edges || 0} semantic relationships`} />
              <div style={{ display: 'flex', gap: 18, minHeight: 580 }}>
                <div className="graph-wrap" ref={visRef} style={{ flex: 1 }} />
                <div className="card card-p" style={{ width: 228, flexShrink: 0, padding: 18 }}>
                  {selNode ? (
                    <div className="scale-in">
                      <span className={`badge ${({ TECHNOLOGY: 'badge-purple', ORGANIZATION: 'badge-blue', CONCEPT: 'badge-green', METRIC: 'badge-amber', PERSON: 'badge-red', LOCATION: 'badge-blue' }[selNode.type] || 'badge-slate')}`}>{selNode.type}</span>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a1d2e', margin: '10px 0 14px', wordBreak: 'break-word' }}>{selNode.label}</h3>
                      <div className="divider" style={{ marginBottom: 14 }} />
                      {[['PageRank', selNode.pagerank, '#6366f1'], ['Degree', selNode.degree_centrality, '#10b981'], ['Frequency', selNode.frequency, '#f59e0b']].map(([k, v, c]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12.5 }}>
                          <span style={{ color: '#9ca3af' }}>{k}</span>
                          <span style={{ color: c, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                        </div>
                      ))}
                      <button onClick={() => setSelNode(null)} className="btn btn-ghost" style={{ width: '100%', marginTop: 14, fontSize: 12 }}>
                        <X size={12} /> Deselect
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 14 }}>Entity Types</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {[['ORGANIZATION','#3b82f6','🏢'],['TECHNOLOGY','#7c3aed','⚡'],['CONCEPT','#10b981','💡'],['METRIC','#f59e0b','📊'],['PERSON','#ec4899','👤'],['LOCATION','#0891b2','📍']].map(([t, c, em]) => (
                          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>{em} {t}</span>
                          </div>
                        ))}
                      </div>
                      <div className="divider" style={{ margin: '14px 0' }} />
                      <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>Click any node to inspect its metrics.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================
              DOCUMENT LIBRARY
              ====================================================== */}
          {tab === 'documents' && (
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
              <PageHeader icon={FileText} color="#3b82f6" title="Document Library" sub="Upload and manage enterprise knowledge sources" />

              <label className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 24px', cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 22, borderStyle: 'dashed', borderColor: 'rgba(99,102,241,0.28)', textAlign: 'center', transition: 'all 0.2s' }}>
                <div style={{ padding: 16, borderRadius: 16, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', marginBottom: 14 }}>
                  <Upload size={26} color="#6366f1" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1d2e', marginBottom: 5 }}>
                  {uploading ? 'Uploading document…' : 'Drop file or click to upload'}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>PDF · DOCX · XLSX · TXT · Markdown</div>
                <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
              </label>

              {/* Ingestion Terminal */}
              {ingLogs.length > 0 && (
                <div className="terminal slide-up" style={{ marginBottom: 22 }}>
                  <div className="terminal-header">
                    <div className="terminal-dot" style={{ background: ingDone ? '#10b981' : '#f59e0b' }} />
                    <div className="terminal-dot" style={{ background: '#374151' }} />
                    <div className="terminal-dot" style={{ background: '#374151' }} />
                    <span style={{ marginLeft: 4, fontSize: 11.5, fontWeight: 700, color: ingDone ? '#6ee7b7' : '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {ingDone ? '✓ Ingestion Complete' : '⟳ Live Ingestion Pipeline'}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4b5563' }}>{ingDocId?.slice(0, 8)}…</span>
                  </div>
                  <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {ingLogs.map((log, i) => (
                      <div key={i} className="terminal-line">
                        <span className="t-time">{log.timestamp?.slice(11, 19)}</span>
                        <span className={`step-dot ${log.status === 'COMPLETED' ? 'done' : 'active'}`} />
                        <span className={`t-step ${log.status === 'COMPLETED' ? 'done' : 'active'}`}>
                          {log.step}/{log.total_steps}
                        </span>
                        <span className={`t-msg ${log.status === 'COMPLETED' ? 'done' : ''}`}>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doc list */}
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 10 }}>
                Indexed Documents ({docs.length})
              </div>
              {docs.length === 0 ? <EmptyState icon={Inbox} message="No documents yet. Upload a file or seed demo data." />
                : docs.map(doc => (
                  <div key={doc.document_id} className="card" style={{ padding: '15px 20px', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', border: '1px solid rgba(59,130,246,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={17} color="#3b82f6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                      <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{doc.chunk_count} chunks</span>
                        <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{doc.page_count} pages</span>
                        <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{(doc.file_size / 1024).toFixed(1)} KB</span>
                        {doc.department && <span className="badge badge-blue" style={{ fontSize: 9.5 }}>{doc.department}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{new Date(doc.upload_timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
            </div>
          )}

          {/* ======================================================
              AI VERIFIER
              ====================================================== */}
          {tab === 'verification' && (
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
              <PageHeader icon={ShieldCheck} color="#10b981" title="Multi-Agent AI Verifier" sub="Fact-Checker Agent · Citation Auditor · Hallucination Risk Guard" />
              {queryRes?.multi_agent_report ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                    {[
                      { icon: Shield, label: 'Trust Score', value: `${queryRes.multi_agent_report.trust_score}%`, col: '#10b981', bg: '#ecfdf5', border: 'rgba(16,185,129,0.25)' },
                      { icon: TrendingUp, label: 'Grounding Score', value: `${queryRes.multi_agent_report.grounding_score}%`, col: '#6366f1', bg: '#eff2ff', border: 'rgba(99,102,241,0.22)' },
                      { icon: AlertTriangle, label: 'Hallucination Risk', value: queryRes.multi_agent_report.hallucination_risk, col: queryRes.multi_agent_report.hallucination_risk === 'LOW' ? '#10b981' : '#f59e0b', bg: '#fffbeb', border: 'rgba(245,158,11,0.22)' },
                    ].map(({ icon: I, label, value, col, bg, border }) => (
                      <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: 22, textAlign: 'center' }}>
                        <I size={22} color={col} style={{ margin: '0 auto 10px', display: 'block' }} />
                        <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{value}</div>
                        <div style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 600, marginTop: 4 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="card card-p">
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 10 }}>Agent Verdict</div>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, color: '#374151' }}>{queryRes.multi_agent_report.agent_verdict}</p>
                  </div>
                </div>
              ) : <EmptyState icon={ShieldCheck} message="Ask a question in RAG Studio to run multi-agent verification analysis." />}
            </div>
          )}

          {/* ======================================================
              BLOCKCHAIN LEDGER
              ====================================================== */}
          {tab === 'blockchain' && (
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
              <PageHeader icon={Lock} color="#7c3aed" title="Blockchain Audit Ledger" sub="SHA-256 Merkle-tree immutable tamper-proof audit trail"
                action={<span className={`badge ${ledger?.chain_integrity?.valid ? 'badge-green' : 'badge-red'}`}>
                  {ledger?.chain_integrity?.valid ? '✓ Chain Valid' : '✗ Tampered'}
                </span>} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...(ledger.blocks || [])].reverse().map((block, i) => (
                  <div key={block.index} className="card card-p">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', border: '1px solid rgba(139,92,246,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Lock size={15} color="#7c3aed" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1d2e' }}>Block #{block.index}</span>
                          {i === 0 && <span className="badge badge-purple" style={{ fontSize: 9 }}>Latest</span>}
                          {block.index === 0 && <span className="badge badge-amber" style={{ fontSize: 9 }}>Genesis</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{block.timestamp}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 4 }}>Block Hash</div>
                    <div className="hash-code" style={{ color: '#6366f1' }}>{block.hash}</div>
                    {block.merkle_root && <>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginTop: 12, marginBottom: 4 }}>Merkle Root</div>
                      <div className="hash-code" style={{ color: '#10b981' }}>{block.merkle_root}</div>
                    </>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================
              COMPONENT TELEMETRY
              ====================================================== */}
          {tab === 'telemetry' && (
            <div style={{ maxWidth: 980, margin: '0 auto' }}>
              <PageHeader icon={Terminal} color="#6366f1" title="Component Telemetry & Live Logs" sub="Real-time metrics for all platform subsystems"
                action={<button onClick={async () => { const d = await api.get('/api/system/telemetry'); if (d?.qdrant_vector_store) setTelemetry(d); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}><RefreshCw size={13} /> Refresh</button>} />
              {telemetry ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(400px,1fr))', gap: 18 }}>
                  {/* Qdrant */}
                  <div className="telemetry-card" style={{ borderTop: '3px solid #6366f1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ padding: 9, borderRadius: 11, background: '#eff2ff', border: '1px solid rgba(99,102,241,0.22)' }}>
                          <Database size={16} color="#6366f1" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1d2e' }}>Qdrant Vector Store</div>
                          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>all-MiniLM-L6-v2 · {telemetry.qdrant_vector_store?.vector_dimension}D Cosine</div>
                        </div>
                      </div>
                      <span className="badge badge-indigo">Operational</span>
                    </div>
                    {[['Storage Mode', telemetry.qdrant_vector_store?.storage_mode], ['Collection', 'enterprise_chunks'], ['Indexed Chunks', telemetry.qdrant_vector_store?.indexed_chunks], ['Distance Metric', telemetry.qdrant_vector_store?.distance_metric]].map(([k, v]) => (
                      <div key={k} className="telemetry-row">
                        <span className="telemetry-key">{k}</span>
                        <span className="telemetry-val" style={{ color: '#6366f1' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* KG */}
                  <div className="telemetry-card" style={{ borderTop: '3px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ padding: 9, borderRadius: 11, background: '#ecfdf5', border: '1px solid rgba(16,185,129,0.22)' }}>
                          <Network size={16} color="#10b981" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1d2e' }}>Knowledge Graph</div>
                          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>NetworkX · JSON Persistence</div>
                        </div>
                      </div>
                      <span className="badge badge-green">Active</span>
                    </div>
                    {[['Total Nodes', telemetry.knowledge_graph?.total_nodes], ['Total Edges', telemetry.knowledge_graph?.total_edges], ['Graph Density', telemetry.knowledge_graph?.graph_density]].map(([k, v]) => (
                      <div key={k} className="telemetry-row">
                        <span className="telemetry-key">{k}</span>
                        <span className="telemetry-val" style={{ color: '#10b981' }}>{v}</span>
                      </div>
                    ))}
                    {telemetry.knowledge_graph?.top_pagerank_entities?.length > 0 && <>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginTop: 12, marginBottom: 8 }}>Top PageRank</div>
                      {telemetry.knowledge_graph.top_pagerank_entities.map((e, i) => (
                        <div key={i} className="telemetry-row">
                          <span className="telemetry-key">{e.label}</span>
                          <span className="telemetry-val" style={{ color: '#10b981' }}>{e.pagerank}</span>
                        </div>
                      ))}
                    </>}
                  </div>

                  {/* Blockchain */}
                  <div className="telemetry-card" style={{ borderTop: '3px solid #7c3aed' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ padding: 9, borderRadius: 11, background: '#f5f3ff', border: '1px solid rgba(139,92,246,0.22)' }}>
                          <Lock size={16} color="#7c3aed" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1d2e' }}>Blockchain Ledger</div>
                          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>SHA-256 · Merkle Tree</div>
                        </div>
                      </div>
                      <span className="badge badge-purple">Sealed</span>
                    </div>
                    {[['Block Height', `#${telemetry.blockchain_audit_ledger?.block_height}`], ['Status', telemetry.blockchain_audit_ledger?.status], ['Audit Events', telemetry.blockchain_audit_ledger?.total_audit_events]].map(([k, v]) => (
                      <div key={k} className="telemetry-row">
                        <span className="telemetry-key">{k}</span>
                        <span className="telemetry-val" style={{ color: '#7c3aed' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10.5, color: '#9ca3af', marginBottom: 4 }}>Merkle Root</div>
                      <div className="hash-code" style={{ color: '#7c3aed' }}>{telemetry.blockchain_audit_ledger?.merkle_root?.slice(0, 32)}…</div>
                    </div>
                  </div>

                  {/* BM25 */}
                  <div className="telemetry-card" style={{ borderTop: '3px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ padding: 9, borderRadius: 11, background: '#fffbeb', border: '1px solid rgba(245,158,11,0.22)' }}>
                          <FileCode size={16} color="#f59e0b" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1d2e' }}>BM25 Keyword Engine</div>
                          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>Custom BM25 · Pickle Persistence</div>
                        </div>
                      </div>
                      <span className="badge badge-amber">Ready</span>
                    </div>
                    {[['Engine', telemetry.bm25_keyword_store?.engine], ['Indexed Docs', telemetry.bm25_keyword_store?.indexed_documents], ['Vocabulary Size', telemetry.bm25_keyword_store?.vocabulary_size], ['Avg Doc Length', telemetry.bm25_keyword_store?.avg_doc_length]].map(([k, v]) => (
                      <div key={k} className="telemetry-row">
                        <span className="telemetry-key">{k}</span>
                        <span className="telemetry-val" style={{ color: '#b45309' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Verifier — full width */}
                  <div className="telemetry-card" style={{ borderTop: '3px solid #10b981', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                      <div style={{ padding: 9, borderRadius: 11, background: '#ecfdf5', border: '1px solid rgba(16,185,129,0.22)' }}>
                        <ShieldCheck size={16} color="#10b981" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1d2e' }}>Multi-Agent Verification Pipeline</div>
                        <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>3 cooperative agents · Real-time grounding analysis</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {(telemetry.multi_agent_verifier?.agents || []).map((a, i) => (
                        <div key={i} style={{ flex: 1, padding: 16, background: '#ecfdf5', borderRadius: 12, border: '1px solid rgba(16,185,129,0.18)', textAlign: 'center' }}>
                          <CheckCircle2 size={18} color="#10b981" style={{ margin: '0 auto 8px', display: 'block' }} />
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{a}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8f9ff', borderRadius: 9, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#6b7280' }}>
                      Formula: <span style={{ color: '#6366f1', fontWeight: 700 }}>{telemetry.multi_agent_verifier?.trust_formula}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 18 }}>
                  {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 220 }} />)}
                </div>
              )}
            </div>
          )}

          {/* ======================================================
              CHAT HISTORY
              ====================================================== */}
          {tab === 'history' && (
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
              <PageHeader icon={Clock} color="#f59e0b" title="Chat History" sub={`${history.length} past queries`}
                action={<button onClick={async () => { const d = await api.get('/api/history'); if (Array.isArray(d)) setHistory(d); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}><RefreshCw size={13} /> Refresh</button>} />
              {history.length === 0 ? <EmptyState icon={Clock} message="No query history yet. Ask a question in RAG Studio." />
                : history.map((item, i) => (
                  <div key={item.id || i} className="card card-p" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ padding: 8, borderRadius: 9, background: '#eff2ff', border: '1px solid rgba(99,102,241,0.18)', flexShrink: 0 }}>
                          <Search size={13} color="#6366f1" />
                        </div>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1a1d2e', lineHeight: 1.5 }}>{item.query}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <RiskBadge risk={item.hallucination_risk} />
                        <span className="badge badge-indigo" style={{ fontSize: 9.5 }}>{item.trust_score}% trust</span>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#6b7280', lineHeight: 1.7 }}>{item.answer}</p>
                    <div style={{ fontSize: 10.5, color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>{new Date(item.timestamp).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
