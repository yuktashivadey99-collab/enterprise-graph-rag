import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring as useSpringMotion } from 'framer-motion';
import { Network as VisNetwork } from 'vis-network';
import {
  Network, Database, ShieldCheck, FileText, Search, Upload,
  Sliders, CheckCircle2, RefreshCw, Lock, Sparkles, LogIn,
  LogOut, User, Clock, Activity, Eye, EyeOff, Send,
  AlertTriangle, FileCode, Terminal, Hash, X, Menu,
  TrendingUp, ChevronRight, Inbox, Shield, Cpu, Layers,
  Home, BookOpen, Bell, Settings, HardDrive, Zap, BarChart2,
  ArrowUpRight, Info, Link2
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
   MICRO COMPONENTS
   ================================================================ */
const Spinner = ({ size = 16 }) => (
  <RefreshCw size={size} className="spin" style={{ color: 'var(--a)' }} />
);

const RiskBadge = ({ risk }) => {
  if (!risk) return null;
  const m = { LOW: 'badge-green', MEDIUM: 'badge-amber', HIGH: 'badge-red' };
  return <span className={`badge ${m[risk] || 'badge-slate'}`}>{risk} RISK</span>;
};

function TrustRing({ score }) {
  const s = Math.max(0, Math.min(100, score || 0));
  const r = 30; const c = 2 * Math.PI * r;
  const col = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="trust-ring-wrap">
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} stroke="var(--b2)" strokeWidth="5" fill="none" />
          <circle cx="36" cy="36" r={r} stroke={col} strokeWidth="5" fill="none"
            strokeDasharray={c} strokeDashoffset={c - (s / 100) * c}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s}</span>
          <span style={{ fontSize: 8, color: 'var(--ink3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>TRUST</span>
        </div>
      </div>
    </div>
  );
}

/* Animated Canvas for Knowledge Graph Hero */
function LiveGraphCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 300;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes = Array.from({ length: 60 }, (_, i) => {
      const isHub = i < 6;
      const hubX = [0.65, 0.75, 0.80, 0.70, 0.60, 0.85];
      const hubY = [0.25, 0.40, 0.60, 0.75, 0.55, 0.35];
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4'];
      return {
        x: isHub ? hubX[i] * (canvas.width || 400) : Math.random() * (canvas.width || 400) * 0.8 + (canvas.width || 400) * 0.1,
        y: isHub ? hubY[i] * (canvas.height || 300) : Math.random() * (canvas.height || 300) * 0.8 + (canvas.height || 300) * 0.1,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: isHub ? 7 : Math.random() * 3.5 + 1.5,
        color: isHub ? colors[i] : '#94a3b8',
        isHub,
      };
    });

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79,70,229,${(1 - d / 100) * 0.18})`;
            ctx.lineWidth = 1;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 20 || n.x > W - 20) n.vx *= -1;
        if (n.y < 20 || n.y > H - 20) n.vy *= -1;
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: 12 }} />;
}

/* 3D Tilt Card */
function TiltCard({ children, className = '', style = {}, intensity = 7, ...rest }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpringMotion(useTransform(my, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 200, damping: 24 });
  const ry = useSpringMotion(useTransform(mx, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 200, damping: 24 });
  return (
    <motion.div
      className={`card ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', transformPerspective: 800, ...style }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width - 0.5);
        my.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* CountUp */
function CountUp({ to, duration = 1.2, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const n = typeof to === 'number' ? to : parseInt(to) || 0;
    if (!n) { setVal(to); return; }
    let start = 0;
    const step = n / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= n) { setVal(n); clearInterval(timer); }
      else setVal(Math.round(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [to, duration]);
  return <span>{prefix}{typeof val === 'number' ? val.toLocaleString() : val}{suffix}</span>;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
};

function PageHeader({ icon: Icon, color = 'var(--a)', title, sub, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.div whileHover={{ rotate: -8, scale: 1.08 }} style={{
          width: 40, height: 40, borderRadius: 11,
          background: `${color}14`, border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </motion.div>
        <div>
          <h2 className="page-title">{title}</h2>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="empty-state">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="empty-icon">
        <Icon size={24} color="var(--a)" />
      </motion.div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>{message}</div>
    </div>
  );
}

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

  const quickDemoLogin = async () => {
    setErr(''); setLoading(true);
    const res = await api.post('/auth/login', { username: 'admin', password: 'admin123' });
    if (res.ok && res.data?.access_token) { api.set(res.data.access_token); onLogin(res.data); }
    else {
      const regRes = await api.post('/auth/register', {
        username: 'admin', email: 'admin@enterprise.ai', password: 'admin123',
        full_name: 'Enterprise Admin', department: 'Technology'
      });
      if (regRes.ok && regRes.data?.access_token) { api.set(regRes.data.access_token); onLogin(regRes.data); }
      else setErr(res.data?.detail || 'Demo login failed.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-root">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div whileHover={{ scale: 1.05 }}
            style={{ display: 'inline-flex', padding: 14, borderRadius: 18, background: 'white', boxShadow: 'var(--sa)', border: '1px solid var(--b1)', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Network size={22} color="#fff" />
            </div>
          </motion.div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            IntelliDoc <span className="gradient-text">AI</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink3)', fontWeight: 500 }}>
            Enterprise Knowledge Intelligence Platform
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-tab-bar">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(''); }}
                className={`auth-tab ${mode === m ? 'active' : 'inactive'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <motion.button type="button" onClick={quickDemoLogin} disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="btn btn-ghost"
              style={{ width: '100%', marginBottom: 18, padding: '10px', fontSize: 13, justifyContent: 'center', background: 'rgba(79,70,229,0.05)', borderColor: 'var(--a-border)' }}>
              <Sparkles size={15} color="var(--a)" />
              ⚡ 1-Click Demo Admin Login
            </motion.button>
          )}

          {err && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--err-s)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, marginBottom: 18, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {err}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'username', label: 'Username', placeholder: 'your_username', type: 'text', show: true },
              { key: 'email', label: 'Email', placeholder: 'you@company.com', type: 'email', show: mode === 'register' },
              { key: 'full_name', label: 'Full Name', placeholder: 'Alex Smith', type: 'text', show: mode === 'register' },
              { key: 'department', label: 'Department', placeholder: 'Technology / HR / Legal', type: 'text', show: mode === 'register' },
            ].filter(fi => fi.show).map(fi => (
              <label key={fi.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>{fi.label}</span>
                <input type={fi.type} required value={f[fi.key]} placeholder={fi.placeholder}
                  onChange={e => setF(p => ({ ...p, [fi.key]: e.target.value }))}
                  className="auth-input" />
              </label>
            ))}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>Password</span>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} required value={f.password} placeholder="••••••••"
                  onChange={e => setF(p => ({ ...p, password: e.target.value }))}
                  className="auth-input" style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', display: 'flex', padding: 0 }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <motion.button type="submit" disabled={loading} className="btn btn-primary"
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{ marginTop: 6, padding: '12px 22px', fontSize: 14, borderRadius: 10, width: '100%', justifyContent: 'center' }}>
              {loading ? <Spinner size={15} /> : <LogIn size={15} />}
              {loading ? 'Authenticating…' : mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================
   MAIN APP
   ================================================================ */
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('workspace');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rpanelOpen, setRpanelOpen] = useState(true);

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

  const [selNode, setSelNode] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const visRef = useRef(null);

  useEffect(() => {
    if (api.t()) {
      api.get('/auth/me').then(d => { if (d?.id) setUser(d); else api.clear(); }).catch(() => api.clear());
    }
  }, []);

  const refresh = useCallback(async () => {
    const [h, t, g, l, d, hist] = await Promise.all([
      api.get('/api/health'), api.get('/api/system/telemetry'),
      api.get('/api/graph/visualization'), api.get('/api/blockchain/ledger'),
      api.get('/api/documents'), api.get('/api/history'),
    ]);
    if (h?.status)              setHealth(h);
    if (t?.qdrant_vector_store) setTelemetry(t);
    if (g?.nodes)               setGraphData(g);
    if (Array.isArray(l?.blocks)) setLedger(l);
    if (Array.isArray(d))       setDocs(d);
    if (Array.isArray(hist))    setHistory(hist);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* Knowledge graph vis-network */
  useEffect(() => {
    if (tab !== 'graph' || !visRef.current || !graphData?.nodes?.length) return;
    const nodes = graphData.nodes.slice(0, 300).map(n => ({
      id: n.id, label: n.label, group: n.type,
      title: `${n.type} · PageRank: ${n.pagerank}`,
      size: Math.max(14, Math.min(36, 14 + (n.pagerank || 0) * 900)),
    }));
    const edges = (graphData.edges || []).slice(0, 600).map(e => ({
      from: e.from, to: e.to, label: e.label || '', arrows: 'to',
      font: { align: 'middle', size: 10, color: '#94a3b8' },
    }));
    const net = new VisNetwork(visRef.current, { nodes, edges }, {
      nodes: {
        shape: 'dot', font: { size: 12, color: '#0f172a', face: 'Inter' },
        borderWidth: 2, shadow: { enabled: true, color: 'rgba(0,0,0,0.12)', size: 6 },
      },
      groups: {
        ORGANIZATION: { color: { background: '#3b82f6', border: '#93c5fd', highlight: { background: '#2563eb', border: '#bfdbfe' } } },
        TECHNOLOGY:   { color: { background: '#8b5cf6', border: '#c4b5fd', highlight: { background: '#7c3aed', border: '#ddd6fe' } } },
        CONCEPT:      { color: { background: '#10b981', border: '#6ee7b7', highlight: { background: '#059669', border: '#a7f3d0' } } },
        METRIC:       { color: { background: '#f59e0b', border: '#fcd34d', highlight: { background: '#d97706', border: '#fde68a' } } },
        PERSON:       { color: { background: '#ec4899', border: '#f9a8d4', highlight: { background: '#db2777', border: '#fbcfe8' } } },
        LOCATION:     { color: { background: '#06b6d4', border: '#67e8f9', highlight: { background: '#0891b2', border: '#a5f3fc' } } },
        ENTITY:       { color: { background: '#6b7280', border: '#d1d5db', highlight: { background: '#4b5563', border: '#e5e7eb' } } },
      },
      edges: { color: { color: '#e2e8f0', highlight: '#4f46e5' }, width: 1.5, smooth: { type: 'continuous' } },
      physics: {
        forceAtlas2Based: { gravitationalConstant: -30, centralGravity: 0.005, springLength: 220, springConstant: 0.16 },
        maxVelocity: 140, solver: 'forceAtlas2Based', stabilization: { iterations: 160 },
      },
    });
    net.on('click', p => setSelNode(p.nodes[0] ? graphData.nodes.find(n => n.id === p.nodes[0]) : null));
    return () => net.destroy();
  }, [tab, graphData]);

  /* Ingestion polling */
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
  const seed = async () => { setSeeding(true); await api.post('/api/seed_demo', {}); await refresh(); setSeeding(false); };

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

  const NAV = [
    { key: 'workspace',    icon: Home,       label: 'Workspace',          badge: null },
    { key: 'graph',        icon: Network,    label: 'Knowledge Graph',    badge: health?.knowledge_graph?.total_nodes || null },
    { key: 'documents',    icon: FileText,   label: 'Documents',          badge: docs.length || null },
    { key: 'retrieval',    icon: Search,     label: 'Retrieval',          badge: null },
    { key: 'verification', icon: ShieldCheck,label: 'Verification',       badge: null },
    { key: 'agents',       icon: Cpu,        label: 'Agents',             badge: null },
    { key: 'telemetry',    icon: Activity,   label: 'System Telemetry',   badge: null },
    { key: 'history',      icon: Clock,      label: 'History',            badge: history.length || null },
    { key: 'blockchain',   icon: Lock,       label: 'Blockchain Ledger',  badge: health?.blockchain_height ? `#${health.blockchain_height}` : null },
  ];

  /* ── Recent activity for workspace ── */
  const ACTIVITIES = [
    { icon: Upload,      color: '#4f46e5', bg: 'rgba(79,70,229,0.10)', title: 'Document uploaded', sub: docs[0]?.filename || 'No docs yet', time: '2 min ago' },
    { icon: FileText,    color: '#10b981', bg: 'rgba(16,185,129,0.10)', title: 'Text extracted', sub: `${docs[0]?.page_count || 0} pages · ${health?.vector_store_chunks || 0} words`, time: '2 min ago' },
    { icon: Network,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', title: 'Entities discovered', sub: `${health?.knowledge_graph?.total_nodes || 0} entities (Policy, Person, Process…)`, time: '5 min ago' },
    { icon: Link2,       color: '#0284c7', bg: 'rgba(2,132,199,0.10)', title: 'Relationships linked', sub: `${health?.knowledge_graph?.total_edges || 0} connections`, time: '7 min ago' },
    { icon: Database,    color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', title: 'Vectors indexed', sub: `${health?.vector_store_chunks || 0} chunks · BGE-M3`, time: '12 min ago' },
    { icon: Lock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', title: 'Blockchain record created', sub: `SHA-256 · Block #${health?.blockchain_height || 1}`, time: '15 min ago' },
  ];

  /* Entity type colors */
  const ENTITY_COLORS = {
    POLICY: { color: '#4f46e5', bg: 'rgba(79,70,229,0.10)' },
    PERSON: { color: '#ec4899', bg: 'rgba(236,72,153,0.10)' },
    PROCESS: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    CONCEPT: { color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
    REGULATION: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  };

  const MOCK_ENTITIES = [
    { name: 'Leave Policy', type: 'POLICY', refs: 12 },
    { name: 'HR Manager', type: 'PERSON', refs: 8 },
    { name: 'Approval Flow', type: 'PROCESS', refs: 6 },
    { name: 'Medical Leave', type: 'CONCEPT', refs: 5 },
    { name: 'Compliance Rule', type: 'REGULATION', refs: 4 },
  ];

  const MOCK_RELS = [
    { from: 'Leave Policy', to: 'Approval Flow', pred: 'part of' },
    { from: 'HR Manager', to: 'Approval Flow', pred: 'manages' },
    { from: 'Leave Policy', to: 'Compliance Rule', pred: 'references' },
  ];

  /* ──────────────────────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────────────────────── */
  return (
    <div className="app-root">

      {/* ── TOPBAR ─────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-mark">
            <Network size={18} color="#fff" />
          </div>
          <div className="topbar-brand">
            <div className="topbar-title">IntelliDoc AI</div>
            <div className="topbar-sub">KNOWLEDGE UNIFIED</div>
          </div>
        </div>

        {/* Search */}
        <div className="topbar-search">
          <Search size={13} className="topbar-search-icon" />
          <input type="text" placeholder="Search documents, entities, policies or ask a question…" />
          <span className="topbar-search-kbd">⌘K</span>
        </div>

        {/* Live pills */}
        <div className="topbar-pills">
          {[
            { icon: Database, val: health?.vector_store_chunks || 551, label: 'vectors', color: 'var(--a)' },
            { icon: Network, val: health?.knowledge_graph?.total_nodes || 2950, label: 'nodes', color: 'var(--ok)' },
            { icon: Lock, val: `#${health?.blockchain_height || 5}`, label: 'blocks', color: 'var(--amber)' },
          ].map(({ icon: I, val, label, color }) => (
            <div key={label} className="topbar-pill">
              <I size={12} color={color} />
              <span className="topbar-pill-val">{val}</span>
              <span style={{ color: 'var(--ink3)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="topbar-actions">
          <motion.button className="btn btn-primary btn-sm" onClick={seed} disabled={seeding}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ gap: 6, padding: '6px 14px' }}>
            {seeding ? <Spinner size={13} /> : <Upload size={13} />}
            + Upload
          </motion.button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="topbar-icon-btn">
            <Bell size={15} />
            <span className="topbar-notif-dot" />
          </motion.button>

          <motion.div className="user-chip" whileHover={{ scale: 1.02 }}>
            <div className="user-avatar">{user.username.slice(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user.full_name || user.username}</div>
              <div className="user-role">Administrator</div>
            </div>
          </motion.div>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="topbar-icon-btn"
            onClick={() => { api.clear(); setUser(null); }}>
            <LogOut size={15} />
          </motion.button>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div className="app-body">

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-inner">
            <div className="nav-section" style={{ marginTop: 0 }}>STUDIO</div>
            <nav>
              {NAV.map(({ key, icon: Icon, label, badge }) => (
                <motion.button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`nav-item ${tab === key ? 'active' : ''}`}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={15} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </motion.button>
              ))}
            </nav>

            <div className="sidebar-divider" />

            {/* Quick Upload */}
            <div className="nav-section">QUICK UPLOAD</div>
            <label style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--a-soft)', border: '1.5px dashed var(--a-border)', borderRadius: 9, color: 'var(--a)', fontSize: 12.5, fontWeight: 600, textAlign: 'center', justifyContent: 'center' }}>
                <Upload size={14} />
                {uploading ? 'Processing…' : 'Upload Document'}
              </motion.div>
              <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
            </label>
            <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 5, paddingLeft: 4 }}>PDF · DOCX · XLSX · TXT · Markdown</div>

            {/* Pipeline progress steps */}
            {['Parse', 'Chunk', 'Embed', 'Index', 'Graph'].map((st, i) => (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, marginTop: 6, paddingLeft: 2 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: ingLogs.length > i ? 'var(--ok)' : 'var(--b2)', transition: 'background 0.3s' }} />
                <span style={{ color: ingLogs.length > i ? 'var(--ok)' : 'var(--ink3)', fontWeight: ingLogs.length > i ? 600 : 400 }}>{st}</span>
              </div>
            ))}

            <div style={{ marginTop: 'auto' }}>
              <div className="sidebar-storage">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, color: 'var(--ink2)' }}>
                  <span>Storage</span>
                  <span style={{ color: 'var(--ink3)' }}>42%</span>
                </div>
                <div className="storage-bar-track">
                  <div className="storage-bar-fill" style={{ width: '42%' }} />
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>420 GB / 1 TB</div>
              </div>

              <div className="upgrade-card">
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Upgrade to Enterprise</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 10, lineHeight: 1.5 }}>Unlock advanced analytics, agent tools and higher storage.</div>
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                  <ChevronRight size={13} /> Get Started
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >

              {/* ==================================================
                  WORKSPACE (Home Dashboard)
                  ================================================== */}
              {tab === 'workspace' && (
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Eyebrow */}
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink3)' }}>
                    RAG Studio / Enterprise Knowledge Workspace
                  </div>

                  {/* ── HERO BANNER ── */}
                  <motion.div className="hero-banner"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                    <div style={{ flex: '1 1 360px', minWidth: 0, zIndex: 1 }}>
                      <div className="hero-eyebrow">Enterprise Knowledge, Reimagined</div>
                      <h1 className="hero-h1">
                        Your enterprise<br />
                        knowledge, <span>connected.</span>
                      </h1>
                      <p className="hero-sub">
                        IntelliDoc AI transforms scattered documents into a living, verifiable knowledge base using Hybrid RAG, Knowledge Graphs and Blockchain Verification.
                      </p>
                      <div className="hero-btns">
                        <motion.button className="btn btn-primary" onClick={() => setTab('retrieval')}
                          whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                          style={{ padding: '10px 20px', fontSize: 13.5, borderRadius: 10 }}>
                          <Search size={15} /> Ask your documents →
                        </motion.button>
                        <motion.button className="btn btn-ghost" onClick={() => setTab('documents')}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{ padding: '10px 20px', fontSize: 13.5, borderRadius: 10 }}>
                          <Upload size={15} /> Upload Documents
                        </motion.button>
                        <motion.button className="btn btn-ghost" onClick={() => setTab('graph')}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{ padding: '10px 20px', fontSize: 13.5, borderRadius: 10 }}>
                          <Network size={15} /> Explore Graph
                        </motion.button>
                      </div>
                    </div>

                    {/* Floating 3D doc cards */}
                    <div className="float-doc-group" style={{ zIndex: 1 }}>
                      <motion.div className="float-doc" style={{ top: 10, left: 20, animationDelay: '0s' }}
                        animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                        <FileText size={14} color="#ef4444" />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Policies</span>
                      </motion.div>
                      <motion.div className="float-doc" style={{ top: 60, right: 10, animationDelay: '1s' }}
                        animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
                        <FileText size={14} color="#3b82f6" />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Contracts</span>
                      </motion.div>
                      <motion.div className="float-doc" style={{ top: 130, left: 40, background: 'linear-gradient(135deg, #f0f0ff, white)', boxShadow: 'var(--sa)', borderColor: 'var(--a-border)' }}
                        animate={{ y: [0, -12, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                        <FileText size={14} color="#4f46e5" />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>Employee Handbook</div>
                          <div style={{ fontSize: 9.5, color: 'var(--ink3)' }}>v2.3.pdf</div>
                        </div>
                      </motion.div>
                      <motion.div className="float-stat" style={{ top: 8, right: 50 }}
                        animate={{ y: [0, -8, 0], rotate: [-2, 0, -2] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>21</div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)' }}>Entities</div>
                      </motion.div>
                      <motion.div className="float-stat" style={{ top: 120, right: 60 }}
                        animate={{ y: [0, -7, 0], rotate: [2, 0, 2] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>12</div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)' }}>Relationships</div>
                      </motion.div>
                      <motion.div className="float-stat" style={{ bottom: 10, right: 20 }}
                        animate={{ y: [0, -9, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
                        <CheckCircle2 size={12} color="var(--ok)" style={{ margin: '0 auto 3px' }} />
                        <div style={{ fontSize: 10, color: 'var(--ok)', fontWeight: 700 }}>Verified</div>
                        <div style={{ fontSize: 9, color: 'var(--ink3)' }}>5 Linked Docs</div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* ── STATS ROW ── */}
                  <motion.div className="stats-row" variants={stagger} initial="hidden" animate="show">
                    {[
                      { icon: FileText, label: 'Documents', value: docs.length || 8, trend: '+12%', col: '#4f46e5', bg: 'rgba(79,70,229,0.10)' },
                      { icon: Database, label: 'Vector Chunks', value: health?.vector_store_chunks || 551, trend: '+5%', col: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
                      { icon: Network, label: 'Graph Entities', value: health?.knowledge_graph?.total_nodes || 2950, trend: '+18%', col: '#10b981', bg: 'rgba(16,185,129,0.10)' },
                      { icon: ShieldCheck, label: 'Verified Records', value: health?.blockchain_height || 5, trend: '0%', col: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
                    ].map(({ icon: I, label, value, trend, col, bg }, i) => (
                      <motion.div key={label} variants={fadeUp} className="stat-card"
                        whileHover={{ y: -4, boxShadow: `0 12px 36px ${col}18` }}>
                        <div className="stat-icon" style={{ background: bg }}>
                          <I size={17} color={col} />
                        </div>
                        <div className="stat-val"><CountUp to={typeof value === 'number' ? value : 0} /></div>
                        <div className="stat-lbl">{label}</div>
                        <div className={`stat-trend ${trend !== '0%' ? 'up' : 'neutral'}`}>
                          {trend !== '0%' && <TrendingUp size={11} />}
                          {trend}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ── BOTTOM 2-PANEL ── */}
                  <div className="workspace-grid">
                    {/* Knowledge Graph Map */}
                    <motion.div className="graph-map-card"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}>
                      <div className="graph-map-header">
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Enterprise Knowledge Graph</div>
                          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>Visualize entities and their relationships across your organization.</div>
                        </div>
                        <motion.button className="btn btn-ghost btn-sm" onClick={() => setTab('graph')}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          View Full Graph <ChevronRight size={13} />
                        </motion.button>
                      </div>
                      <div className="graph-canvas-wrap">
                        <LiveGraphCanvas />
                        {/* Overlay node labels */}
                        {[
                          { x: '42%', y: '60%', label: 'Employee Handbook', color: '#4f46e5', size: 46 },
                          { x: '65%', y: '28%', label: 'HR Manager', color: '#ec4899', size: 32 },
                          { x: '70%', y: '70%', label: 'Approval Flow', color: '#f59e0b', size: 30 },
                          { x: '20%', y: '38%', label: 'Leave Policy', color: '#4f46e5', size: 28 },
                          { x: '22%', y: '72%', label: 'Medical Leave', color: '#10b981', size: 26 },
                          { x: '74%', y: '82%', label: 'Compliance Rule', color: '#ef4444', size: 26 },
                        ].map((n, i) => (
                          <motion.div key={n.label}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            style={{
                              position: 'absolute', left: n.x, top: n.y,
                              transform: 'translate(-50%, -50%)',
                              background: 'white', border: `2px solid ${n.color}30`,
                              borderRadius: 10, padding: '4px 10px',
                              fontSize: 10, fontWeight: 700, color: 'var(--ink)',
                              boxShadow: `0 2px 12px ${n.color}20`,
                              pointerEvents: 'none',
                              whiteSpace: 'nowrap',
                            }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.color, display: 'inline-block', marginRight: 5 }} />
                            {n.label}
                            <div style={{ fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {['POLICY', 'PERSON', 'PROCESS', 'POLICY', 'CONCEPT', 'REGULATION'][i]}
                            </div>
                          </motion.div>
                        ))}
                        {/* Edge labels */}
                        {[
                          { x: '52%', y: '48%', label: 'references' },
                          { x: '65%', y: '50%', label: 'managed by' },
                          { x: '46%', y: '76%', label: 'part of' },
                        ].map(e => (
                          <div key={e.label} style={{
                            position: 'absolute', left: e.x, top: e.y,
                            transform: 'translate(-50%,-50%)',
                            fontSize: 9, color: 'var(--ink3)', background: 'rgba(255,255,255,0.85)',
                            padding: '1px 6px', borderRadius: 4, fontWeight: 500,
                            pointerEvents: 'none', border: '1px solid var(--b1)',
                          }}>{e.label}</div>
                        ))}
                        {/* bottom legend */}
                        <div style={{ position: 'absolute', bottom: 12, left: 16, display: 'flex', gap: 14 }}>
                          {[{ l: 'Entities', c: '#4f46e5', n: 21 }, { l: 'Relationships', c: '#10b981', n: 38 }].map(item => (
                            <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.c }} />
                              <span style={{ color: 'var(--ink2)' }}>{item.l}</span>
                              <span style={{ color: item.c, fontWeight: 800 }}>{item.n}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div className="card card-p"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.28 }}>
                      <div className="section-header">
                        <div>
                          <div className="section-title">Recent Activity</div>
                          <div className="section-sub">Live processing pipeline and document events.</div>
                        </div>
                        <button className="section-link">View All <ChevronRight size={13} /></button>
                      </div>
                      <div className="activity-list">
                        {ACTIVITIES.map((act, i) => (
                          <motion.div key={i} className="activity-item"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.07 }}>
                            <div className="activity-icon" style={{ background: act.bg }}>
                              <act.icon size={14} color={act.color} />
                            </div>
                            <div className="activity-body">
                              <div className="activity-title">{act.title}</div>
                              <div className="activity-sub">{act.sub}</div>
                            </div>
                            <div className="activity-time">{act.time}</div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                </div>
              )}

              {/* ==================================================
                  RETRIEVAL (RAG Query Studio)
                  ================================================== */}
              {tab === 'retrieval' && (
                <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <PageHeader icon={Search} color="var(--a)" title="RAG Studio"
                    sub="Hybrid retrieval: Vector + BM25 keyword + Knowledge Graph traversal" />

                  {/* Query bar */}
                  <motion.div className="card card-p" style={{ padding: '20px 22px' }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <form onSubmit={runQuery}>
                      <div className="query-bar" style={{ marginBottom: 14 }}>
                        <Search size={16} color="var(--ink3)" style={{ flexShrink: 0 }} />
                        <input type="text" className="query-input" value={query} onChange={e => setQuery(e.target.value)}
                          placeholder="Ask anything across your enterprise…" />
                        <select value={dept} onChange={e => setDept(e.target.value)}
                          style={{ width: 130, height: 32, fontSize: 12, padding: '0 10px', borderRadius: 7, border: '1px solid var(--b1)', background: 'var(--bg2)', flexShrink: 0 }}>
                          <option value="">All Sources</option>
                          <option value="Technology">Technology</option>
                          <option value="HR">Human Resources</option>
                          <option value="Finance">Finance</option>
                          <option value="Legal">Legal</option>
                          <option value="Operations">Operations</option>
                        </select>
                        <motion.button type="button" onClick={runStream} disabled={streaming}
                          className="btn btn-primary btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{ flexShrink: 0, borderRadius: 8 }}>
                          {streaming ? <Spinner size={13} /> : <Send size={13} />}
                        </motion.button>
                      </div>
                    </form>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {['Summarize HR leave policy', 'Show approval workflow', 'Find related compliance rules', 'Compare document versions'].map(chip => (
                        <motion.button key={chip} className="query-chip"
                          whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                          onClick={() => setQuery(chip)}>
                          {chip}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Pipeline stepper */}
                  <motion.div className="card card-p" style={{ padding: '16px 20px' }}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                    <div className="pipeline-bar">
                      {[
                        { label: 'Embed', icon: Cpu },
                        { label: 'Vector', icon: Database },
                        { label: 'BM25', icon: Search },
                        { label: 'Graph', icon: Network },
                        { label: 'RRF', icon: Layers },
                        { label: 'Answer', icon: ShieldCheck }
                      ].map((s, idx) => (
                        <React.Fragment key={s.label}>
                          <div className="pipeline-node-wrap">
                            <div className={`pipeline-circle ${(querying || streaming) ? 'active' : ''}`}>
                              <s.icon size={12} color={(querying || streaming) ? '#fff' : 'var(--ink3)'} />
                            </div>
                            <span className={`pipeline-label ${(querying || streaming) ? 'active' : ''}`}>{s.label}</span>
                          </div>
                          {idx < 5 && <div className={`pipeline-line ${(querying || streaming) ? 'active' : ''}`} />}
                        </React.Fragment>
                      ))}
                    </div>
                  </motion.div>

                  {/* Results */}
                  <AnimatePresence mode="wait">
                    {(streaming || streamText) && (
                      <motion.div key="stream" className="card card-accent card-p"
                        initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <Activity size={15} color="var(--a)" style={{ animation: streaming ? 'spin 1s linear infinite' : 'none' }} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Gemini — Streaming Answer</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: 'var(--ink)' }} className={!streamDone ? 'cursor-blink' : ''}>{streamText}</p>
                        {streamDone && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--b1)', fontSize: 11.5, color: 'var(--ink3)', alignItems: 'center' }}>
                            <span>Trust: <strong style={{ color: 'var(--ok)' }}>{streamDone.trust_score}%</strong></span>
                            <RiskBadge risk={streamDone.hallucination_risk} />
                            <button onClick={() => setTab('verification')} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}><ShieldCheck size={12} /> View Audit</button>
                          </div>
                        )}
                      </motion.div>
                    )}
                    {queryRes && !streaming && !streamText && (
                      <motion.div key="answer" className="answer-card has-answer"
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <CheckCircle2 size={18} color="var(--ok)" />
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>AI Answer — Grounded in Your Documents</div>
                              <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>Retrieved {queryRes.retrieved_chunks?.length ?? 0} chunks · {queryRes.latency_ms} ms</div>
                            </div>
                          </div>
                          <TrustRing score={queryRes.trust_score} />
                        </div>
                        <p style={{ fontSize: 14, lineHeight: 1.85, margin: '0 0 16px', color: 'var(--ink)' }}>{queryRes.answer}</p>
                        {queryRes.retrieved_chunks?.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Source Documents</div>
                            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                              {queryRes.retrieved_chunks.slice(0, 5).map((c, i) => (
                                <span key={i} className="source-chip">📄 {c.filename} · p.{c.page_num ?? 1}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--b1)', fontSize: 11.5, color: 'var(--ink3)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>⏱ {queryRes.latency_ms} ms</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>🔒 Block #{queryRes.blockchain_seal?.block_index}</span>
                          <RiskBadge risk={queryRes.hallucination_risk} />
                          <button onClick={() => setTab('verification')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--a)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={13} /> View Full Audit</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Engine cards */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="section-header">
                      <div>
                        <div className="section-title">How the AI Retrieval Works</div>
                        <div className="section-sub">3 search engines run in parallel — results merged via Reciprocal Rank Fusion (RRF).</div>
                      </div>
                    </div>
                    <div className="engine-grid">
                      {[
                        { icon: Database, color: '#6366f1', num: '01', title: 'Vector / Semantic Search', desc: 'Your question is converted into a 384D vector using all-MiniLM-L6-v2. Qdrant finds the most semantically similar chunks — even if exact words don\'t match.', example: '"sick leave" also finds "medical absence policy"' },
                        { icon: Search, color: '#0891b2', num: '02', title: 'BM25 Keyword Search', desc: 'Classic TF-IDF algorithm scoring documents by exact word frequency and rarity. Best for specific codes, names, or numbers that must match precisely.', example: '"Invoice #INV-2024" or "Section 4.2.1"' },
                        { icon: Network, color: '#059669', num: '03', title: 'Knowledge Graph Traversal', desc: 'Entities from your query are found in the NetworkX graph. Connected nodes are traversed to surface related context beyond simple text matching.', example: '"HR Manager" → linked → "Leave Policy" → "Approval Flow"' },
                      ].map(({ icon: I, color, num, title, desc, example }, idx) => (
                        <motion.div key={title} className="engine-card"
                          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + idx * 0.09 }}
                          whileHover={{ y: -5, boxShadow: `0 20px 48px ${color}22` }}
                          style={{ background: `${color}08`, borderColor: `${color}28` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <I size={16} color={color} />
                            </div>
                            <span style={{ fontSize: 9.5, fontWeight: 800, color, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>ENGINE {num}</span>
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{title}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 12 }}>{desc}</div>
                          <div style={{ fontSize: 11, color, background: `${color}10`, borderRadius: 8, padding: '7px 11px', fontStyle: 'italic', borderLeft: `2px solid ${color}50` }}>e.g. {example}</div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Weights */}
                  <motion.div className="card card-p" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                      <Sliders size={16} color="var(--a)" />
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Retrieval Engine Weights</div>
                    </div>
                    {[
                      { k: 'vector', col: '#6366f1', l: 'Vector Similarity', badge: 'Semantic' },
                      { k: 'keyword', col: '#0891b2', l: 'BM25 Keyword', badge: 'Exact Match' },
                      { k: 'graph', col: '#059669', l: 'Knowledge Graph', badge: 'Relational' },
                    ].map(w => (
                      <div key={w.k} className="weight-row">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{w.l}</span>
                            <span className="badge badge-slate" style={{ fontSize: 10 }}>{w.badge}</span>
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 800, color: w.col, fontFamily: 'var(--font-mono)' }}>{(+weights[w.k] * 100).toFixed(0)}%</span>
                        </div>
                        <div className="weight-track">
                          <div className="weight-fill" style={{ width: `${+weights[w.k] * 100}%`, background: w.col }} />
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={weights[w.k]}
                          onChange={e => setWeights(p => ({ ...p, [w.k]: e.target.value }))} style={{ accentColor: w.col }} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--b1)' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)' }}>Neural Re-Ranker</div>
                      <motion.button onClick={() => setReranker(r => !r)} whileTap={{ scale: 0.88 }}
                        style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', background: reranker ? 'var(--a)' : 'var(--b2)', transition: 'background 0.3s', boxShadow: reranker ? 'var(--sa)' : 'none' }}>
                        <motion.div animate={{ left: reranker ? 22 : 3 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                      </motion.button>
                    </div>
                  </motion.div>

                </div>
              )}

              {/* ==================================================
                  KNOWLEDGE GRAPH
                  ================================================== */}
              {tab === 'graph' && (
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                  <PageHeader icon={Network} color="var(--ok)" title="Knowledge Graph Explorer"
                    sub={`${health?.knowledge_graph?.total_nodes || 0} entities · ${health?.knowledge_graph?.total_edges || 0} semantic relationships`} />
                  <div style={{ display: 'flex', gap: 18, minHeight: 580 }}>
                    <div className="card" style={{ flex: '1 1 500px', overflow: 'hidden', minHeight: 500 }}>
                      <div ref={visRef} className="graph-wrap" />
                    </div>
                    <div className="card card-p" style={{ width: 260, flexShrink: 0 }}>
                      {selNode ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                          <span className={`badge ${({ TECHNOLOGY: 'badge-purple', ORGANIZATION: 'badge-blue', CONCEPT: 'badge-green', METRIC: 'badge-amber', PERSON: 'badge-red', LOCATION: 'badge-blue' }[selNode.type] || 'badge-slate')}`}>{selNode.type}</span>
                          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: '12px 0 16px', wordBreak: 'break-word' }}>{selNode.label}</h3>
                          <div className="divider" style={{ marginBottom: 14 }} />
                          {[['PageRank', selNode.pagerank, 'var(--a)'], ['Degree Centrality', selNode.degree_centrality, 'var(--ok)'], ['Frequency', selNode.frequency, 'var(--amber)']].map(([k, v, c]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--b1)', fontSize: 12.5 }}>
                              <span style={{ color: 'var(--ink2)' }}>{k}</span>
                              <span style={{ color: c, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                            </div>
                          ))}
                          <button onClick={() => setSelNode(null)} className="btn btn-ghost" style={{ width: '100%', marginTop: 14, fontSize: 12.5, justifyContent: 'center' }}><X size={13} /> Deselect</button>
                        </motion.div>
                      ) : (
                        <div>
                          <div className="section-title" style={{ marginBottom: 14 }}>Entity Types</div>
                          {[['ORGANIZATION', '#3b82f6'], ['TECHNOLOGY', '#8b5cf6'], ['CONCEPT', '#10b981'], ['METRIC', '#f59e0b'], ['PERSON', '#ec4899'], ['LOCATION', '#06b6d4']].map(([t, c]) => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--b1)' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}60` }} />
                              <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{t}</span>
                            </div>
                          ))}
                          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 14, lineHeight: 1.65 }}>Click any node on the canvas to inspect its centrality metrics.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  DOCUMENTS
                  ================================================== */}
              {tab === 'documents' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={FileText} color="var(--a)" title="Document Library"
                    sub="Upload and manage enterprise knowledge sources"
                    action={
                      <label>
                        <motion.span className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          style={{ display: 'inline-flex', cursor: 'pointer' }}>
                          <Upload size={14} /> Upload New
                        </motion.span>
                        <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
                      </label>
                    } />

                  {/* Dropzone */}
                  <motion.label className="card" whileHover={{ borderColor: 'var(--a-border)' }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 28px', cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 22, borderStyle: 'dashed', borderColor: 'var(--b2)', textAlign: 'center', transition: 'all 0.25s', background: 'white' }}>
                    <div style={{ padding: 16, borderRadius: 18, background: 'var(--a-soft)', border: '1px solid var(--a-border)', marginBottom: 14, boxShadow: 'var(--sa)' }}>
                      <Upload size={26} color="var(--a)" />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}>
                      {uploading ? 'Processing document…' : 'Drop file or click to upload'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>PDF · DOCX · XLSX · TXT · Markdown</div>
                    <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
                  </motion.label>

                  {/* Ingestion log */}
                  {ingLogs.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ing-log" style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: ingDone ? 'var(--ok)' : 'var(--a)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {ingDone ? <CheckCircle2 size={12} /> : <Activity size={12} />}
                        {ingDone ? 'Ingestion Complete' : 'Live Pipeline Processing'}
                        {ingDocId && <span style={{ color: 'var(--ink3)', fontWeight: 400 }}>{ingDocId.slice(0, 8)}…</span>}
                      </div>
                      {ingLogs.map((log, i) => (
                        <div key={i} className="ing-log-line">
                          <span className="t-time">{log.timestamp?.slice(11, 19)}</span>
                          <span className={`ing-dot ${log.status === 'COMPLETED' ? 'done' : 'active'}`} />
                          <span style={{ fontSize: 10, color: 'var(--ink3)' }}>[{log.step}/{log.total_steps}]</span>
                          <span style={{ fontSize: 11.5, color: log.status === 'COMPLETED' ? 'var(--ok)' : 'var(--ink2)' }}>{log.message}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink3)', marginBottom: 10 }}>
                    Indexed Enterprise Documents ({docs.length})
                  </div>
                  {docs.length === 0
                    ? <EmptyState icon={Inbox} message="No documents uploaded yet. Drop a file above or use Seed Demo Data." />
                    : docs.map((doc, idx) => (
                      <motion.div key={doc.document_id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ y: -2, boxShadow: 'var(--s4)', borderColor: 'var(--b2)' }}
                        className="card"
                        style={{ padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div className="doc-thumb" style={{ background: doc.file_type === '.pdf' ? 'rgba(239,68,68,0.12)' : doc.file_type === '.docx' ? 'rgba(59,130,246,0.12)' : 'rgba(79,70,229,0.10)', color: doc.file_type === '.pdf' ? '#ef4444' : doc.file_type === '.docx' ? '#3b82f6' : '#4f46e5' }}>
                          {doc.file_type?.replace('.', '').toUpperCase() || 'DOC'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                          <div style={{ marginTop: 5, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{doc.chunk_count} chunks</span>
                            <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{doc.page_count} pages</span>
                            <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            {doc.department && <span className="badge badge-indigo" style={{ fontSize: 9.5 }}>{doc.department}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{new Date(doc.upload_timestamp).toLocaleDateString()}</span>
                      </motion.div>
                    ))}
                </div>
              )}

              {/* ==================================================
                  VERIFICATION
                  ================================================== */}
              {tab === 'verification' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={ShieldCheck} color="var(--ok)" title="Multi-Agent AI Verifier"
                    sub="Fact-Checker · Citation Auditor · Hallucination Risk Guard" />
                  {queryRes?.multi_agent_report ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}
                        variants={stagger} initial="hidden" animate="show">
                        {[
                          { icon: Shield, label: 'Trust Score', value: `${queryRes.multi_agent_report.trust_score}%`, col: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.20)' },
                          { icon: TrendingUp, label: 'Grounding Score', value: `${queryRes.multi_agent_report.grounding_score}%`, col: '#4f46e5', bg: 'rgba(79,70,229,0.08)', border: 'rgba(79,70,229,0.20)' },
                          { icon: AlertTriangle, label: 'Hallucination Risk', value: queryRes.multi_agent_report.hallucination_risk, col: queryRes.multi_agent_report.hallucination_risk === 'LOW' ? '#10b981' : '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)' },
                        ].map(({ icon: I, label, value, col, bg, border }) => (
                          <motion.div key={label} variants={fadeUp}
                            whileHover={{ y: -4, scale: 1.02 }}
                            style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: `0 4px 20px ${col}12` }}>
                            <I size={22} color={col} style={{ margin: '0 auto 10px', display: 'block' }} />
                            <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{value}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600, marginTop: 5 }}>{label}</div>
                          </motion.div>
                        ))}
                      </motion.div>

                      <motion.div className="card card-p" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Fact-Checker Sentence Audit</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(queryRes.multi_agent_report.claims_verification || []).map((c, i) => (
                            <motion.div key={i}
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              style={{ padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{c.claim}</span>
                              <span className={`badge ${c.status === 'VERIFIED' ? 'badge-green' : c.status === 'PARTIAL' ? 'badge-amber' : 'badge-red'}`}>
                                {c.status} ({c.grounding_score}%)
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <EmptyState icon={ShieldCheck} message="Execute a query in Retrieval Studio to view live multi-agent verification reports and sentence audit trace." />
                  )}
                </div>
              )}

              {/* ==================================================
                  AGENTS
                  ================================================== */}
              {tab === 'agents' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={Cpu} color="var(--purple)" title="AI Agent Pipeline"
                    sub="Autonomous agents working together to verify, cite, and audit your knowledge" />
                  <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}
                    variants={stagger} initial="hidden" animate="show">
                    {[
                      { icon: ShieldCheck, color: '#10b981', title: 'Fact-Checker Agent', desc: 'Verifies each claim sentence against the retrieved document chunks and knowledge graph relations, computing a per-sentence grounding ratio.', metrics: [['Threshold', '65%'], ['Method', 'Token Overlap']] },
                      { icon: Hash, color: '#4f46e5', title: 'Citation Auditor', desc: 'Audits citation markers in generated responses against the actual retrieved chunk IDs. Computes citation accuracy and source integrity.', metrics: [['Accuracy', '100%'], ['Marker Format', '[Source:ID]']] },
                      { icon: AlertTriangle, color: '#f59e0b', title: 'Hallucination Guard', desc: 'Combines grounding and citation scores using a weighted formula to produce a composite Trust Score and Hallucination Risk classification.', metrics: [['Formula', '0.7G + 0.3C'], ['Risk Levels', 'LOW/MED/HIGH']] },
                    ].map(({ icon: I, color, title, desc, metrics }) => (
                      <motion.div key={title} variants={fadeUp} className="card card-p"
                        whileHover={{ y: -5, boxShadow: `0 20px 48px ${color}18` }}
                        style={{ borderTop: `3px solid ${color}` }}>
                        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}12`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                          <I size={19} color={color} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>{title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 14 }}>{desc}</div>
                        {metrics.map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--b1)', fontSize: 11.5 }}>
                            <span style={{ color: 'var(--ink3)' }}>{k}</span>
                            <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 14 }}>
                          <div className="ver-status">
                            <div className="ver-dot" style={{ background: color, boxShadow: `0 0 0 3px ${color}28` }} />
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink2)' }}>Agent Operational</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* ==================================================
                  BLOCKCHAIN LEDGER
                  ================================================== */}
              {tab === 'blockchain' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={Lock} color="var(--amber)" title="Blockchain Audit Ledger"
                    sub="SHA-256 Merkle Proof of Existence & Tamper-Proof Audit Trail"
                    action={
                      <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={async () => {
                          const r = await api.get('/api/verify-audit');
                          if (r) alert(`Chain Integrity: ${r.status}\n${r.message}\nBlocks: ${r.chain_length}\nLatest Hash: ${r.latest_block_hash}`);
                        }}>
                        <ShieldCheck size={14} /> Verify Integrity
                      </motion.button>
                    } />

                  <motion.div className="card card-p" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Hash size={18} color="var(--purple)" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>SHA-256 Merkle Chain</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>Height: #{ledger.blocks?.length || 1} Blocks</div>
                      </div>
                    </div>
                    <span className={`badge ${ledger.chain_integrity?.valid ? 'badge-green' : 'badge-red'}`}>
                      {ledger.chain_integrity?.valid ? '✓ CHAIN INTEGRITY VALID' : '✗ COMPROMISED'}
                    </span>
                  </motion.div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(ledger.blocks || []).map((b, idx) => (
                      <motion.div key={b.index} className="block-card"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -3, borderColor: 'var(--b2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span className="block-number">BLOCK #{b.index}</span>
                          <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>{b.timestamp}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 11.5, color: 'var(--ink2)' }}><span style={{ color: 'var(--ink3)', fontWeight: 600 }}>Hash: </span><span className="block-hash">{b.hash}</span></div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink2)' }}><span style={{ color: 'var(--ink3)', fontWeight: 600 }}>Merkle: </span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple)', fontSize: 11 }}>{b.merkle_root}</span></div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>Txns: <strong style={{ color: 'var(--ink)' }}>{b.transaction_count}</strong></div>
                        </div>
                        {b.data?.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--b1)' }}>
                            {b.data.map((tx, ti) => (
                              <div key={ti} style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                                <span style={{ color: 'var(--a)' }}>[{tx.event_type}]</span> {tx.tx_id} · {tx.timestamp?.slice(0, 19)}
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================
                  SYSTEM TELEMETRY
                  ================================================== */}
              {tab === 'telemetry' && (
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                  <PageHeader icon={Activity} color="var(--a)" title="System Telemetry"
                    sub="Live diagnostics across vector, graph, keyword, and blockchain layers"
                    action={
                      <motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={refresh}>
                        <RefreshCw size={13} /> Refresh
                      </motion.button>
                    } />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {[
                      { title: 'Qdrant Vector Store', icon: Database, color: '#4f46e5', data: telemetry?.qdrant_vector_store },
                      { title: 'Knowledge Graph Engine', icon: Network, color: '#10b981', data: telemetry?.knowledge_graph },
                      { title: 'BM25 Keyword Index', icon: Search, color: '#0891b2', data: telemetry?.bm25_keyword_store },
                      { title: 'Blockchain Audit Ledger', icon: Lock, color: '#f59e0b', data: telemetry?.blockchain_audit_ledger },
                    ].map(({ title, icon: I, color, data }, idx) => (
                      <motion.div key={title} className="telemetry-card"
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        whileHover={{ y: -3, borderColor: `${color}30` }}
                        style={{ borderTop: `2px solid ${color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <I size={16} color={color} />
                          </div>
                          <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{title}</h3>
                        </div>
                        {data ? Object.entries(data).map(([k, v]) => (
                          <div key={k} className="telemetry-row">
                            <span className="telemetry-key">{k.replace(/_/g, ' ')}</span>
                            <span className="telemetry-val">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        )) : <p style={{ fontSize: 12, color: 'var(--ink3)' }}>Fetching telemetry…</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================
                  CHAT HISTORY
                  ================================================== */}
              {tab === 'history' && (
                <div style={{ maxWidth: 860, margin: '0 auto' }}>
                  <PageHeader icon={Clock} color="var(--purple)" title="Chat History"
                    sub="Past queries, trust scores, and execution latency logs" />
                  {history.length === 0
                    ? <EmptyState icon={Clock} message="No conversation history yet. Run some queries in Retrieval Studio." />
                    : history.map((h, idx) => (
                      <motion.div key={h.id} className="history-row"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => { setQuery(h.query); setTab('retrieval'); }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--a-soft)', border: '1px solid var(--a-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Search size={14} color="var(--a)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.query}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.answer}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <span className="badge badge-green" style={{ fontSize: 10 }}>Trust {h.trust_score}%</span>
                          <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{new Date(h.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        {/* RIGHT PANEL — Document Intelligence */}
        {rpanelOpen && (tab === 'workspace' || tab === 'retrieval' || tab === 'documents') && (
          <aside className="right-panel">
            <div className="right-panel-inner">
              {/* Panel Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Sparkles size={14} color="var(--a)" />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Document Intelligence</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>Insights from the selected document.</div>
              </div>

              {/* Latest doc card */}
              {docs.length > 0 ? (
                <div className="doc-file-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <div className="doc-thumb" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', width: 40, height: 46 }}>PDF</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docs[0].filename}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2 }}>{docs[0].page_count} pages · {(docs[0].file_size / 1024 / 1024).toFixed(1)} MB</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Uploaded 2 min ago</div>
                    </div>
                  </div>
                  <motion.button className="btn btn-primary btn-sm" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 12.5 }}>
                    Open Document →
                  </motion.button>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'var(--bg2)', border: '1px dashed var(--b2)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>No documents yet</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>Upload documents to see intelligence</div>
                </div>
              )}

              {/* Extracted entities */}
              <div>
                <div className="section-header" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Extracted Entities ({MOCK_ENTITIES.length})</div>
                  <button className="section-link" style={{ fontSize: 11.5 }}>View All →</button>
                </div>
                {MOCK_ENTITIES.map((ent, i) => {
                  const c = ENTITY_COLORS[ent.type] || { color: '#4f46e5', bg: 'rgba(79,70,229,0.10)' };
                  return (
                    <motion.div key={ent.name} className="entity-item"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.07 }}>
                      <div className="entity-icon" style={{ background: c.bg }}>
                        <FileText size={13} color={c.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="entity-name">{ent.name}</div>
                        <div className="entity-type">{ent.type}</div>
                      </div>
                      <div className="entity-refs">{ent.refs} refs</div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Key Relationships */}
              <div>
                <div className="section-header" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Key Relationships (38)</div>
                  <button className="section-link" style={{ fontSize: 11.5 }}>View All →</button>
                </div>
                {MOCK_RELS.map((rel, i) => (
                  <motion.div key={i} className="rel-item"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.08 }}>
                    <span className="rel-node">{rel.from}</span>
                    <span className="rel-arrow">→</span>
                    <span className="rel-node">{rel.to}</span>
                    <span className="rel-pred">{rel.pred}</span>
                  </motion.div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 8 }}>+ 35 more relationships</div>
              </div>

              {/* Verification Status */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Verification Status</div>
                <div className="ver-status" style={{ marginBottom: 10 }}>
                  <div className="ver-dot" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Blockchain record created</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2 }}>SHA-256 · {(ledger.blocks?.[ledger.blocks.length - 1]?.hash || '').slice(0, 12)}…</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Block #{health?.blockchain_height || 1} · 10 sec ago</div>
                  </div>
                  <span className="badge badge-green">Verified</span>
                </div>

                {/* Vector status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: '1px solid var(--b1)' }}>
                  <Database size={13} color="var(--a)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Vector Status</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{health?.vector_store_chunks || 551} chunks indexed</div>
                  </div>
                  <span className="badge badge-indigo">Completed</span>
                </div>
              </div>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}
