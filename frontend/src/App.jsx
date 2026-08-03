import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Network as VisNetwork } from 'vis-network';
import {
  Network, Database, ShieldCheck, FileText, Search, Upload,
  Sliders, CheckCircle2, RefreshCw, Lock, Sparkles, LogIn,
  LogOut, User, Clock, Activity, Eye, EyeOff, Send,
  AlertTriangle, FileCode, Terminal, Hash, X, Menu,
  TrendingUp, ChevronRight, Inbox, Shield, Cpu, Layers, Palette
} from 'lucide-react';

/* ================================================================
   API CLIENT
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
    } catch { return { ok: false, data: { detail: 'Cannot connect to backend server.' } }; }
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
   SPATIAL MICRO-COMPONENTS
   ================================================================ */
const Spinner = ({ size = 16 }) => (
  <RefreshCw size={size} className="spin text-cyan-400" />
);

const RiskBadge = ({ risk }) => {
  if (!risk) return null;
  const m = { LOW: 'badge-green', MEDIUM: 'badge-amber', HIGH: 'badge-red' };
  return <span className={`badge ${m[risk] || 'badge-slate'}`}>{risk} RISK</span>;
};

const TrustRing = ({ score }) => {
  const s = Math.max(0, Math.min(100, score || 0));
  const r = 32; const c = 2 * Math.PI * r;
  const col = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
          <circle cx="40" cy="40" r={r} stroke={col} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={c - (s / 100) * c}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 6px ${col})` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s}</span>
          <span style={{ fontSize: 8.5, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>TRUST</span>
        </div>
      </div>
    </div>
  );
};

const PageHeader = ({ icon: Icon, color = 'var(--accent-primary)', title, sub, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div className="section-icon">
        <Icon size={22} color={color} />
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
  <div style={{ textAlign: 'center', padding: '70px 24px', color: 'var(--text-secondary)' }}>
    <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(99,102,241,0.12)', border: '1px solid var(--border-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'var(--glow-accent)' }}>
      <Icon size={26} color="var(--accent-primary)" />
    </div>
    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>{message}</div>
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

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }} className="scale-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'linear-gradient(135deg,var(--accent-secondary),var(--accent-primary))', boxShadow: 'var(--glow-accent)', border: '1px solid rgba(255,255,255,0.2)', marginBottom: 16 }}>
            <Network size={32} color="#fff" />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Enterprise <span className="gradient-text">Graph-RAG</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            Dynamic Spatial Intelligence · v2.0
          </p>
        </div>

        <div className="auth-card">
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 28, border: '1px solid var(--border-subtle)' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(''); }}
                className={`auth-mode-btn ${mode === m ? 'active' : 'inactive'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {err && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 12, marginBottom: 20, fontSize: 13, color: '#fda4af', fontWeight: 600 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {err}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'username', label: 'Username', placeholder: 'your_username', type: 'text', show: true },
              { key: 'email', label: 'Email Address', placeholder: 'user@company.com', type: 'email', show: mode === 'register' },
              { key: 'full_name', label: 'Full Name', placeholder: 'Alex Smith', type: 'text', show: mode === 'register' },
              { key: 'department', label: 'Department', placeholder: 'Technology / HR / Legal', type: 'text', show: mode === 'register' },
            ].filter(fi => fi.show).map(fi => (
              <label key={fi.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{fi.label}</span>
                <input type={fi.type} required value={f[fi.key]} placeholder={fi.placeholder}
                  onChange={e => setF(p => ({ ...p, [fi.key]: e.target.value }))}
                  className="auth-input" />
              </label>
            ))}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>Password</span>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} required value={f.password} placeholder="••••••••"
                  onChange={e => setF(p => ({ ...p, password: e.target.value }))}
                  className="auth-input" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 8, padding: '13px 22px', fontSize: 14.5, borderRadius: 12, width: '100%' }}>
              {loading ? <Spinner size={16} /> : <LogIn size={16} />}
              {loading ? 'Authenticating…' : mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN MULTI-THEME APP
   ================================================================ */
export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('rag_theme') || 'obsidian');
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

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rag_theme', theme);
  }, [theme]);

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

  /* Spatial vis-network layout */
  useEffect(() => {
    if (tab !== 'graph' || !visRef.current || !graphData?.nodes?.length) return;
    const nodes = graphData.nodes.slice(0, 300).map(n => ({
      id: n.id, label: n.label, group: n.type,
      title: `${n.type} · PageRank: ${n.pagerank}`,
      size: Math.max(14, Math.min(36, 14 + (n.pagerank || 0) * 900)),
    }));
    const edges = (graphData.edges || []).slice(0, 600).map(e => ({
      from: e.from, to: e.to, label: e.label || '', arrows: 'to',
      font: { align: 'middle', size: 10, color: 'var(--text-muted)' },
    }));
    const net = new VisNetwork(visRef.current, { nodes, edges }, {
      nodes: {
        shape: 'dot', font: { size: 12, color: 'var(--text-primary)', face: 'Plus Jakarta Sans' },
        borderWidth: 2, shadow: { enabled: true, color: 'rgba(0,0,0,0.4)', size: 8 },
      },
      groups: {
        ORGANIZATION: { color: { background: '#0284c7', border: '#38bdf8', highlight: { background: '#0369a1', border: '#7dd3fc' } } },
        TECHNOLOGY:   { color: { background: '#7c3aed', border: '#a78bfa', highlight: { background: '#6d28d9', border: '#c4b5fd' } } },
        CONCEPT:      { color: { background: '#059669', border: '#34d399', highlight: { background: '#047857', border: '#6ee7b7' } } },
        METRIC:       { color: { background: '#d97706', border: '#fbbf24', highlight: { background: '#b45309', border: '#fcd34d' } } },
        PERSON:       { color: { background: '#db2777', border: '#f472b6', highlight: { background: '#be185d', border: '#fbcfe8' } } },
        LOCATION:     { color: { background: '#0891b2', border: '#67e8f9', highlight: { background: '#0e7490', border: '#a5f3fc' } } },
        ENTITY:       { color: { background: '#475569', border: '#94a3b8', highlight: { background: '#334155', border: '#cbd5e1' } } },
      },
      edges: { color: { color: 'var(--border-glass)', highlight: 'var(--accent-primary)' }, width: 1.5, smooth: { type: 'continuous' } },
      physics: {
        forceAtlas2Based: { gravitationalConstant: -30, centralGravity: 0.005, springLength: 220, springConstant: 0.16 },
        maxVelocity: 140, solver: 'forceAtlas2Based',
        stabilization: { iterations: 160 },
      },
    });
    net.on('click', p => setSelNode(p.nodes[0] ? graphData.nodes.find(n => n.id === p.nodes[0]) : null));
    return () => net.destroy();
  }, [tab, graphData, theme]);

  /* Live Ingestion Log Polling */
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

  /* Handlers */
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
    else alert(r.data?.detail || 'Query execution failed');
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

  const NAV = [
    { key: 'rag',          icon: Search,      label: 'Spatial RAG Studio',   badge: null },
    { key: 'graph',        icon: Network,     label: 'Knowledge Graph',     badge: health?.knowledge_graph?.total_nodes || null },
    { key: 'documents',    icon: FileText,    label: 'Document Library',    badge: docs.length || null },
    { key: 'verification', icon: ShieldCheck, label: 'Multi-Agent Verifier', badge: null },
    { key: 'blockchain',   icon: Lock,        label: 'Blockchain Ledger',   badge: health?.blockchain_height ? `#${health.blockchain_height}` : null },
    { key: 'telemetry',    icon: Terminal,    label: 'System Telemetry',    badge: null },
    { key: 'history',      icon: Clock,       label: 'Chat History',        badge: history.length || null },
  ];

  return (
    <div className="app-layout">

      {/* ── TOPBAR ────────────────────────────────────────────── */}
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebar(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, borderRadius: 8, display: 'flex', transition: 'all 0.2s' }}>
            {sidebar ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="topbar-logo">
            <div className="logo-icon"><Network size={20} color="#fff" /></div>
            <div>
              <div className="topbar-title">Enterprise Graph-RAG</div>
              <div className="topbar-sub">Spatial Multi-Theme Studio</div>
            </div>
          </div>
        </div>

        {/* Live Telemetry Pills */}
        <div className="hidden lg:flex items-center space-x-3">
          {[
            { i: Database, v: health?.vector_store_chunks || 0, l: 'vectors',     c: 'var(--accent-primary)' },
            { i: Network,  v: health?.knowledge_graph?.total_nodes || 0, l: 'nodes', c: 'var(--accent-success)' },
            { i: Lock,     v: `#${health?.blockchain_height || 1}`, l: 'blocks',  c: 'var(--accent-tertiary)' },
          ].map(({ i: I, v, l, c }) => (
            <div key={l} className="stat-pill">
              <I size={13} color={c} />
              <span className="stat-pill-val">{v}</span>
              <span>{l}</span>
            </div>
          ))}
        </div>

        {/* Theme Switcher & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          
          {/* Dynamic Theme Selector */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: 3 }}>
            {[
              { id: 'obsidian', label: '🌌 Obsidian' },
              { id: 'cyberpunk', label: '💎 Cyberpunk' },
              { id: 'emerald', label: '🍃 Emerald' },
              { id: 'pearl', label: '☀️ Pearl' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  padding: '4px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, transition: 'all 0.2s',
                  background: theme === t.id ? 'var(--accent-secondary)' : 'transparent',
                  color: theme === t.id ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button onClick={seed} disabled={seeding} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12.5, borderRadius: 10 }}>
            {seeding ? <Spinner size={14} /> : <Sparkles size={14} />}
            Seed Demo Data
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent-secondary),var(--accent-primary))', display: 'flex', alignItems: 'center', justifyCenter: 'center', boxShadow: 'var(--glow-accent)' }}>
              <User size={14} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user.username}</div>
              <div style={{ fontSize: 9.5, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{user.role}</div>
            </div>
            <button onClick={() => { api.clear(); setUser(null); }} className="btn btn-danger" style={{ padding: '6px 10px', borderRadius: 8, marginLeft: 4 }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <div className="app-body">

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebar ? '' : 'collapsed'}`}>
          <div className="sidebar-inner">
            <div className="nav-section-label">Spatial Modules</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV.map(({ key, icon: Icon, label, badge }) => (
                <button key={key} onClick={() => setTab(key)} className={`nav-item ${tab === key ? 'active' : ''}`}>
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </button>
              ))}
            </nav>

            <div className="sidebar-divider" style={{ marginTop: 'auto' }} />
            <div className="nav-section-label">Quick File Ingestion</div>
            <div className="upload-widget">
              <input type="text" value={dept} onChange={e => setDept(e.target.value)}
                placeholder="Department tag (e.g. Tech, HR)"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, outline: 'none', marginBottom: 10, fontFamily: 'var(--font-sans)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, background: 'rgba(99,102,241,0.18)', border: '1px dashed var(--border-neon)', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', transition: 'all 0.2s' }}>
                <Upload size={14} />
                {uploading ? 'Processing…' : 'Upload File'}
                <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
              </label>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main-content">

          {/* ======================================================
              SPATIAL RAG STUDIO
              ====================================================== */}
          {tab === 'rag' && (
            <div style={{ maxWidth: 940, margin: '0 auto' }}>
              <PageHeader icon={Search} color="var(--accent-primary)" title="Spatial RAG Studio" sub="Hybrid Vector · BM25 Keyword · Knowledge Graph Retrieval with Gemini 2.0 AI" />

              {/* RRF Weight Deck */}
              <div className="card card-p" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sliders size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Spatial RRF Retrieval Weights</span>
                    <span className="badge badge-blue">RRF Fusion</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={reranker} onChange={e => setReranker(e.target.checked)} />
                    Neural Re-Ranker
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  {[
                    { k: 'vector', l: 'Vector Similarity', sub: 'Qdrant · 384D MiniLM', col: 'var(--accent-primary)' },
                    { k: 'keyword', l: 'BM25 Keyword', sub: 'Custom BM25 · TF-IDF', col: 'var(--accent-tertiary)' },
                    { k: 'graph', l: 'Knowledge Graph', sub: 'NetworkX · PageRank', col: 'var(--accent-success)' },
                  ].map(({ k, l, sub, col }) => (
                    <div key={k} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{l}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{sub}</div>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{weights[k]}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.1" value={weights[k]}
                        onChange={e => setWeights(p => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Spatial Search Bar */}
              <form onSubmit={runQuery} style={{ position: 'relative', marginBottom: 24 }}>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Ask enterprise documents — e.g. 'How many casual leaves do employees get?' or 'What is our tech stack?'"
                  className="input search-input"
                  style={{ paddingRight: 210 }}
                />
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={querying} className="btn btn-ghost" style={{ padding: '9px 16px', fontSize: 13 }}>
                    {querying ? <Spinner size={14} /> : <Search size={14} />} Instant
                  </button>
                  <button type="button" onClick={runStream} disabled={streaming} className="btn btn-primary" style={{ padding: '9px 16px', fontSize: 13 }}>
                    {streaming ? <Spinner size={14} /> : <Send size={14} />} Stream AI
                  </button>
                </div>
              </form>

              {/* Spatial Stream Output */}
              {(streaming || streamText) && (
                <div className="card card-accent slide-up" style={{ padding: 28, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
                    <Activity size={16} color={streaming ? 'var(--accent-primary)' : 'var(--accent-success)'} className={streaming ? 'pulse' : ''} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {streaming ? 'Streaming from Gemini 2.0 Flash…' : 'Spatial Stream Complete'}
                    </span>
                    {streamDone && <RiskBadge risk={streamDone.hallucination_risk} />}
                  </div>
                  <p className={streaming ? 'cursor-blink' : ''} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {streamText}
                  </p>
                  {streamDone && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 20, alignItems: 'center' }}>
                      <TrustRing score={streamDone.trust_score} />
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 2 }}>
                        <div>Trust Score: <strong style={{ color: 'var(--accent-primary)' }}>{streamDone.trust_score}%</strong></div>
                        <div>Agent Verdict: <strong style={{ color: 'var(--text-primary)' }}>{streamDone.agent_verdict}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instant Response Card */}
              {queryRes && (
                <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div className="card card-p" style={{ border: '1px solid var(--accent-success)', boxShadow: 'var(--glow-accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 18 }}>
                      <div style={{ display: 'flex', gap: 14 }}>
                        <div style={{ padding: 12, borderRadius: 14, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', flexShrink: 0 }}>
                          <CheckCircle2 size={22} color="var(--accent-success)" />
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Verified Spatial Knowledge Answer</h3>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span className="badge badge-slate" style={{ fontSize: 10.5 }}>⚡ {queryRes.latency_ms}ms</span>
                            <RiskBadge risk={queryRes.hallucination_risk} />
                          </div>
                        </div>
                      </div>
                      <TrustRing score={queryRes.trust_score} />
                    </div>
                    <p style={{ margin: '0 0 22px', fontSize: 14.5, lineHeight: 1.85, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{queryRes.answer}</p>
                    
                    {/* Blockchain Seal */}
                    <div style={{ padding: '14px 18px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Lock size={13} color="var(--accent-tertiary)" />
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cryptographic Blockchain Seal · Block #{queryRes.blockchain_seal?.block_index}</span>
                      </div>
                      <div className="hash-code" style={{ color: 'var(--accent-primary)' }}>{queryRes.blockchain_seal?.block_hash}</div>
                    </div>
                  </div>

                  {/* Evidence Chunks */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 12 }}>
                      Retrieved Evidence Chunks ({queryRes.retrieved_chunks?.length || 0})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                      {(queryRes.retrieved_chunks || []).map((c, i) => (
                        <div key={i} className="card card-p" style={{ padding: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.filename}</span>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>p.{c.page_num}</span>
                          </div>
                          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.content}</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span className="badge badge-indigo" style={{ fontSize: 9.5 }}>RRF {c.hybrid_score?.toFixed(4)}</span>
                            {c.department && <span className="badge badge-blue" style={{ fontSize: 9.5 }}>{c.department}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!queryRes && !streamText && !streaming && !querying && (
                <EmptyState icon={Sparkles} message={<>Ask a question above, or click <strong style={{ color: 'var(--accent-primary)' }}>Seed Demo Data</strong> in the topbar to populate enterprise HR and Technology knowledge for immediate testing.</>} />
              )}
            </div>
          )}

          {/* ======================================================
              KNOWLEDGE GRAPH
              ====================================================== */}
          {tab === 'graph' && (
            <div style={{ maxWidth: 1140, margin: '0 auto' }}>
              <PageHeader icon={Network} color="var(--accent-success)" title="Knowledge Graph Explorer"
                sub={`${health?.knowledge_graph?.total_nodes || 0} entities · ${health?.knowledge_graph?.total_edges || 0} semantic relationships`} />
              <div style={{ display: 'flex', gap: 20, minHeight: 600, flexWrap: 'wrap' }}>
                <div className="graph-wrap" ref={visRef} style={{ flex: '1 1 500px', minHeight: 450 }} />
                <div className="card card-p" style={{ width: 260, flexShrink: 0, padding: 20 }}>
                  {selNode ? (
                    <div className="scale-in">
                      <span className={`badge ${({ TECHNOLOGY: 'badge-purple', ORGANIZATION: 'badge-blue', CONCEPT: 'badge-green', METRIC: 'badge-amber', PERSON: 'badge-red', LOCATION: 'badge-blue' }[selNode.type] || 'badge-slate')}`}>{selNode.type}</span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 16px', wordBreak: 'break-word' }}>{selNode.label}</h3>
                      <div className="divider" style={{ marginBottom: 16 }} />
                      {[['PageRank', selNode.pagerank, 'var(--accent-primary)'], ['Degree', selNode.degree_centrality, 'var(--accent-success)'], ['Frequency', selNode.frequency, 'var(--accent-warning)']].map(([k, v, c]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                          <span style={{ color: c, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                        </div>
                      ))}
                      <button onClick={() => setSelNode(null)} className="btn btn-ghost" style={{ width: '100%', marginTop: 16, fontSize: 12.5 }}>
                        <X size={14} /> Deselect
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 16 }}>Entity Classifications</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[['ORGANIZATION','#0284c7','🏢'],['TECHNOLOGY','#7c3aed','⚡'],['CONCEPT','#059669','💡'],['METRIC','#d97706','📊'],['PERSON','#db2777','👤'],['LOCATION','#0891b2','📍']].map(([t, c, em]) => (
                          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 8px ${c}` }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{em} {t}</span>
                          </div>
                        ))}
                      </div>
                      <div className="divider" style={{ margin: '16px 0' }} />
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>Click any node on the spatial canvas to inspect its centrality and metrics.</p>
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
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              <PageHeader icon={FileText} color="var(--accent-primary)" title="Document Library" sub="Upload and manage enterprise knowledge sources" />

              <label className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 28px', cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 24, borderStyle: 'dashed', borderColor: 'var(--border-neon)', textAlign: 'center', transition: 'all 0.25s' }}>
                <div style={{ padding: 18, borderRadius: 20, background: 'rgba(6,182,212,0.12)', border: '1px solid var(--border-neon)', marginBottom: 16, boxShadow: 'var(--glow-accent)' }}>
                  <Upload size={28} color="var(--accent-primary)" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {uploading ? 'Uploading document…' : 'Drop file or click to upload'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>PDF · DOCX · XLSX · TXT · Markdown</div>
                <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
              </label>

              {/* Ingestion Terminal */}
              {ingLogs.length > 0 && (
                <div className="terminal slide-up" style={{ marginBottom: 24 }}>
                  <div className="terminal-header">
                    <div className="terminal-dot" style={{ background: ingDone ? '#10b981' : '#f59e0b' }} />
                    <div className="terminal-dot" style={{ background: '#334155' }} />
                    <div className="terminal-dot" style={{ background: '#334155' }} />
                    <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 800, color: ingDone ? '#6ee7b7' : 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {ingDone ? '✓ Ingestion Complete' : '⟳ Spatial Pipeline Processing'}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-muted)' }}>{ingDocId?.slice(0, 8)}…</span>
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
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

              {/* Doc List */}
              <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Indexed Enterprise Documents ({docs.length})
              </div>
              {docs.length === 0 ? <EmptyState icon={Inbox} message="No documents uploaded yet. Select a file or click Seed Demo Data in the topbar." />
                : docs.map(doc => (
                  <div key={doc.document_id} className="card" style={{ padding: '18px 24px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(6,182,212,0.12)', border: '1px solid var(--border-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={20} color="var(--accent-primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-slate" style={{ fontSize: 10 }}>{doc.chunk_count} chunks</span>
                        <span className="badge badge-slate" style={{ fontSize: 10 }}>{doc.page_count} pages</span>
                        <span className="badge badge-slate" style={{ fontSize: 10 }}>{(doc.file_size / 1024).toFixed(1)} KB</span>
                        {doc.department && <span className="badge badge-blue" style={{ fontSize: 10 }}>{doc.department}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{new Date(doc.upload_timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
            </div>
          )}

          {/* ======================================================
              AI VERIFIER
              ====================================================== */}
          {tab === 'verification' && (
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              <PageHeader icon={ShieldCheck} color="var(--accent-success)" title="Multi-Agent AI Verifier" sub="Fact-Checker Agent · Citation Auditor · Hallucination Risk Guard" />
              {queryRes?.multi_agent_report ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
                    {[
                      { icon: Shield, label: 'Trust Score', value: `${queryRes.multi_agent_report.trust_score}%`, col: 'var(--accent-success)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
                      { icon: TrendingUp, label: 'Grounding Score', value: `${queryRes.multi_agent_report.grounding_score}%`, col: 'var(--accent-primary)', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)' },
                      { icon: AlertTriangle, label: 'Hallucination Risk', value: queryRes.multi_agent_report.hallucination_risk, col: queryRes.multi_agent_report.hallucination_risk === 'LOW' ? 'var(--accent-success)' : 'var(--accent-warning)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
                    ].map(({ icon: I, label, value, col, bg, border }) => (
                      <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: 24, textAlign: 'center', backdropFilter: 'blur(20px)' }}>
                        <I size={24} color={col} style={{ margin: '0 auto 12px', display: 'block' }} />
                        <div style={{ fontSize: 24, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 6 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="card card-p">
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>Fact-Checker Sentence Audit</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(queryRes.multi_agent_report.claims_verification || []).map((c, i) => (
                        <div key={i} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 14 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.claim}</span>
                          <span className={`badge ${c.status === 'VERIFIED' ? 'badge-green' : c.status === 'PARTIAL' ? 'badge-amber' : 'badge-red'}`}>
                            {c.status} ({c.grounding_score}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState icon={ShieldCheck} message="Execute a query in RAG Studio to view live multi-agent verification reports and sentence audit trace." />
              )}
            </div>
          )}

          {/* ======================================================
              BLOCKCHAIN LEDGER
              ====================================================== */}
          {tab === 'blockchain' && (
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              <PageHeader icon={Lock} color="var(--accent-tertiary)" title="Blockchain Audit Ledger" sub="Cryptographic SHA-256 Merkle Proof of Existence & Transaction Audit" />
              <div className="card card-p" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Hash size={18} color="var(--accent-tertiary)" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>SHA-256 Merkle Chain Validation</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Height: #{ledger.blocks?.length || 1} Blocks</div>
                    </div>
                  </div>
                  <span className={`badge ${ledger.chain_integrity?.valid ? 'badge-green' : 'badge-red'}`}>
                    {ledger.chain_integrity?.valid ? '✓ CHAIN INTEGRITY VALID' : '❌ COMPROMISED'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(ledger.blocks || []).map(b => (
                  <div key={b.index} className="card card-p">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-tertiary)', fontFamily: 'var(--font-mono)' }}>BLOCK #{b.index}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{b.timestamp}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      <div style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-muted)' }}>Block Hash:</strong> <span style={{ color: 'var(--accent-primary)' }}>{b.hash}</span></div>
                      <div style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-muted)' }}>Merkle Root:</strong> <span style={{ color: 'var(--accent-tertiary)' }}>{b.merkle_root}</span></div>
                      <div style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-muted)' }}>Prev Hash:</strong> <span style={{ color: 'var(--text-muted)' }}>{b.previous_hash}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================
              SYSTEM TELEMETRY
              ====================================================== */}
          {tab === 'telemetry' && (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <PageHeader icon={Terminal} color="var(--accent-primary)" title="System Telemetry" sub="Live diagnostic logs across vector, graph, keyword, and blockchain layers" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 18 }}>
                {[
                  { title: 'Qdrant Vector Store', icon: Database, data: telemetry?.qdrant_vector_store },
                  { title: 'Knowledge Graph Engine', icon: Network, data: telemetry?.knowledge_graph },
                  { title: 'BM25 Keyword Index', icon: Search, data: telemetry?.bm25_keyword_store },
                  { title: 'Blockchain Audit Ledger', icon: Lock, data: telemetry?.blockchain_audit_ledger },
                ].map(({ title, icon: I, data }) => (
                  <div key={title} className="telemetry-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <I size={18} color="var(--accent-primary)" />
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
                    </div>
                    {data ? Object.entries(data).map(([k, v]) => (
                      <div key={k} className="telemetry-row">
                        <span className="telemetry-key">{k.replace(/_/g, ' ')}</span>
                        <span className="telemetry-val">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    )) : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fetching telemetry diagnostics…</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================
              CHAT HISTORY
              ====================================================== */}
          {tab === 'history' && (
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              <PageHeader icon={Clock} color="var(--accent-tertiary)" title="Chat History" sub="Past user queries, trust scores, and execution latency logs" />
              {history.length === 0 ? <EmptyState icon={Clock} message="No previous conversation history found." />
                : history.map(h => (
                  <div key={h.id} className="card card-p" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>{h.query}</span>
                      <span className="badge badge-indigo" style={{ fontSize: 10 }}>Trust {h.trust_score}%</span>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{h.answer}</p>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
