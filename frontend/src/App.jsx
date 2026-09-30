import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring as useSpr } from 'framer-motion';
import { Network as VisNetwork } from 'vis-network';
import {
  Network, Database, ShieldCheck, FileText, Search, Upload,
  Sliders, CheckCircle2, RefreshCw, Lock, Sparkles, LogIn,
  LogOut, User, Clock, Activity, Eye, EyeOff, Send,
  AlertTriangle, Terminal, Hash, X, TrendingUp, ChevronRight,
  Inbox, Shield, Cpu, Layers, Home, Bell, Settings, Zap,
  BarChart2, Link2, BookOpen, ArrowUpRight, ChevronDown,
  Play, Pause, RotateCcw, Filter, Download, Plus
} from 'lucide-react';

/* ================================================================
   CONFIG
   ================================================================ */
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ================================================================
   API CLIENT
   ================================================================ */
const api = {
  t: () => localStorage.getItem('rag_token'),
  set: (v) => localStorage.setItem('rag_token', v),
  clear: () => localStorage.removeItem('rag_token'),
  hdrs: () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('rag_token') ? { Authorization: `Bearer ${localStorage.getItem('rag_token')}` } : {}),
  }),
  async get(p) {
    try {
      const r = await fetch(API + p, { headers: this.hdrs() });
      if (!r.ok) return null;
      return r.json();
    } catch { return null; }
  },
  async post(p, b) {
    try {
      const r = await fetch(API + p, { method: 'POST', headers: this.hdrs(), body: JSON.stringify(b) });
      const d = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, data: d };
    } catch (err) { return { ok: false, status: 0, data: { detail: `Connection failed: ${err.message}` } }; }
  },
  async upload(p, form) {
    try {
      const h = {};
      if (this.t()) h.Authorization = `Bearer ${this.t()}`;
      const r = await fetch(API + p, { method: 'POST', headers: h, body: form });
      const d = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, data: d };
    } catch (err) { return { ok: false, data: { detail: `Upload failed: ${err.message}` } }; }
  },
};

/* ================================================================
   MOTION VARIANTS
   ================================================================ */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
const fadeIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

/* ================================================================
   MICRO COMPONENTS
   ================================================================ */
const Spinner = ({ size = 16, color = 'var(--a)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const RiskBadge = ({ risk }) => {
  if (!risk) return null;
  const map = { LOW: ['badge-green', '●'], MEDIUM: ['badge-amber', '◐'], HIGH: ['badge-red', '●'] };
  const [cls, dot] = map[risk] || ['badge-slate', '●'];
  return <span className={`badge ${cls}`} style={{ gap: 4 }}><span style={{ fontSize: 8 }}>{dot}</span>{risk}</span>;
};

function TrustRing({ score, size = 76 }) {
  const s = Math.max(0, Math.min(100, score || 0));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const col = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--b2)" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth="5" fill="none"
          strokeDasharray={c} strokeDashoffset={c - (s / 100) * c}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 4px ${col}80)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size > 60 ? 16 : 13, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s}</span>
        <span style={{ fontSize: 7.5, color: 'var(--ink3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>TRUST</span>
      </div>
    </div>
  );
}

/* 3D Tilt card */
function TiltCard({ children, className = '', style = {}, intensity = 6, ...rest }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpr(useTransform(my, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 180, damping: 22 });
  const ry = useSpr(useTransform(mx, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 180, damping: 22 });
  const scale = useMotionValue(1);
  return (
    <motion.div
      className={`card ${className}`}
      style={{ rotateX: rx, rotateY: ry, scale, transformStyle: 'preserve-3d', perspective: 900, ...style }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width - 0.5);
        my.set((e.clientY - rect.top) / rect.height - 0.5);
        scale.set(1.01);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); scale.set(1); }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* CountUp */
function CountUp({ to, duration = 1.4, prefix = '', suffix = '', decimals = 0 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const n = parseFloat(to) || 0;
    if (!n) { setVal(n); return; }
    let start = 0;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(parseFloat((n * ease).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, duration, decimals]);
  return <span>{prefix}{typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : val}{suffix}</span>;
}

/* Animated live graph canvas for hero */
function LiveGraphCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 500;
      canvas.height = canvas.parentElement?.clientHeight || 340;
    };
    resize();
    window.addEventListener('resize', resize);
    const W = () => canvas.width, H = () => canvas.height;

    const hubs = [
      { r: 8, color: '#4f46e5', label: 'Policy' },
      { r: 7, color: '#10b981', label: 'HR' },
      { r: 6, color: '#8b5cf6', label: 'AI Arch' },
      { r: 7, color: '#f59e0b', label: 'Finance' },
      { r: 5, color: '#3b82f6', label: 'Legal' },
      { r: 5, color: '#ec4899', label: 'Person' },
    ];

    const nodes = [
      ...hubs.map((h, i) => ({
        x: W() * (0.2 + (i % 3) * 0.3),
        y: H() * (0.25 + Math.floor(i / 3) * 0.5),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: h.r, color: h.color, isHub: true, label: h.label,
      })),
      ...Array.from({ length: 40 }, () => ({
        x: Math.random() * (W() * 0.9) + W() * 0.05,
        y: Math.random() * (H() * 0.9) + H() * 0.05,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 3 + 1.5, color: '#cbd5e1', isHub: false, label: '',
      })),
    ];

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            const alpha = (1 - d / 130) * (nodes[i].isHub || nodes[j].isHub ? 0.35 : 0.12);
            ctx.beginPath();
            const g = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            g.addColorStop(0, nodes[i].color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
            g.addColorStop(1, nodes[j].color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
            ctx.strokeStyle = g;
            ctx.lineWidth = nodes[i].isHub && nodes[j].isHub ? 1.5 : 1;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      // nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 20 || n.x > W() - 20) n.vx *= -1;
        if (n.y < 20 || n.y > H() - 20) n.vy *= -1;
        // glow
        if (n.isHub) {
          const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.5);
          grd.addColorStop(0, n.color + '40');
          grd.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        if (n.isHub) {
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 14 }} />;
}

function PageHeader({ icon: Icon, color = 'var(--a)', title, sub, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <motion.div whileHover={{ rotate: -8, scale: 1.1 }} style={{
          width: 42, height: 42, borderRadius: 12,
          background: `linear-gradient(135deg, ${color}18, ${color}08)`,
          border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${color}12`,
        }}>
          <Icon size={20} color={color} />
        </motion.div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.025em' }}>{title}</h2>
          {sub && <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ink3)' }}>{sub}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}

function EmptyState({ icon: Icon, message, action }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center', padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--a-soft)', border: '1px solid var(--a-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={26} color="var(--a)" />
      </motion.div>
      <div style={{ fontSize: 13.5, color: 'var(--ink2)', maxWidth: 380, lineHeight: 1.7 }}>{message}</div>
      {action}
    </motion.div>
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
  const [demoLoading, setDemoLoading] = useState(false);

  // Apply saved theme on login screen too
  useEffect(() => {
    const savedTheme = localStorage.getItem('rag_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const body = mode === 'login' ? { username: f.username, password: f.password } : f;
    const res = await api.post(endpoint, body);
    if (res.ok && res.data?.access_token) { api.set(res.data.access_token); onLogin(res.data); }
    else setErr(res.data?.detail || 'Authentication failed. Please try again.');
    setLoading(false);
  };

  const demoLogin = async () => {
    setErr(''); setDemoLoading(true);
    // Try login first
    let res = await api.post('/auth/login', { username: 'admin', password: 'admin123' });
    if (!res.ok) {
      // Auto-register demo account
      res = await api.post('/auth/register', { username: 'admin', email: 'admin@intellidoc.ai', password: 'admin123', full_name: 'Enterprise Admin', department: 'Technology' });
    }
    if (res.ok && res.data?.access_token) { api.set(res.data.access_token); onLogin(res.data); }
    else setErr(res.data?.detail || 'Demo login failed.');
    setDemoLoading(false);
  };

  return (
    <div className="auth-root">
      {/* Ambient blobs */}
      {[
        { top: '-20%', right: '-10%', s: 600, c: '#4f46e5' },
        { bottom: '-15%', left: '-8%', s: 500, c: '#10b981' },
        { top: '40%', left: '30%', s: 400, c: '#8b5cf6' },
      ].map((b, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 2 }}
          style={{
            position: 'absolute', width: b.s, height: b.s, borderRadius: '50%',
            background: `radial-gradient(circle, ${b.c}30, transparent 70%)`,
            filter: 'blur(60px)', pointerEvents: 'none', ...(b.top ? { top: b.top } : { bottom: b.bottom }),
            ...(b.right ? { right: b.right } : { left: b.left }),
          }} />
      ))}

      <motion.div initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div whileHover={{ scale: 1.05, rotate: -3 }}
            style={{ display: 'inline-flex', padding: 16, borderRadius: 22, background: 'white', boxShadow: '0 8px 40px rgba(79,70,229,0.22), 0 2px 8px rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.12)', marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79,70,229,0.40)' }}>
              <Network size={24} color="#fff" />
            </div>
          </motion.div>
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--ink)' }}>
            IntelliDoc <span className="gradient-text">AI</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink3)', fontWeight: 500 }}>
            Enterprise Knowledge Intelligence Platform
          </p>
        </div>

        <div className="auth-card">
          {/* Mode switcher */}
          <div className="auth-tab-bar">
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setErr(''); }}
                className={`auth-tab ${mode === m ? 'active' : 'inactive'}`}>{label}</button>
            ))}
          </div>

          {/* Demo Login */}
          {mode === 'login' && (
            <motion.button type="button" onClick={demoLogin} disabled={demoLoading}
              whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', marginBottom: 20, padding: '11px', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, background: 'linear-gradient(135deg, rgba(79,70,229,0.07), rgba(99,102,241,0.05))', border: '1px solid rgba(79,70,229,0.20)', cursor: demoLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--a)', transition: 'all 0.2s' }}>
              {demoLoading ? <Spinner size={14} /> : <Sparkles size={14} />}
              ⚡ 1-Click Demo Login (admin / admin123)
            </motion.button>
          )}

          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {err}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'username', label: 'Username', placeholder: 'your_username', type: 'text', show: true },
              { key: 'email', label: 'Email Address', placeholder: 'you@company.com', type: 'email', show: mode === 'register' },
              { key: 'full_name', label: 'Full Name', placeholder: 'Alex Smith', type: 'text', show: mode === 'register' },
              { key: 'department', label: 'Department', placeholder: 'Technology / HR / Legal', type: 'text', show: mode === 'register' },
            ].filter(fi => fi.show).map(fi => (
              <label key={fi.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', letterSpacing: '0.01em' }}>{fi.label}</span>
                <input type={fi.type} required value={f[fi.key]} placeholder={fi.placeholder}
                  onChange={e => setF(p => ({ ...p, [fi.key]: e.target.value }))}
                  className="auth-input" />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', letterSpacing: '0.01em' }}>Password</span>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} required value={f.password} placeholder="••••••••"
                  onChange={e => setF(p => ({ ...p, password: e.target.value }))}
                  className="auth-input" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', display: 'flex', padding: 0 }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <motion.button type="submit" disabled={loading} className="btn btn-primary"
              whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }}
              style={{ marginTop: 4, padding: '12px 22px', fontSize: 14, borderRadius: 10, width: '100%', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79,70,229,0.30)' }}>
              {loading ? <Spinner size={15} color="#fff" /> : <LogIn size={15} />}
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
  const [tab, setTab] = useState('retrieval');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('rag_theme') || 'dark');

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rag_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Live data from API
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [ledger, setLedger] = useState({ blocks: [], chain_integrity: { valid: true } });
  const [docs, setDocs] = useState([]);
  const [history, setHistory] = useState([]);

  // Selected doc for right panel
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Query state
  const [query, setQuery] = useState('');
  const [queryRes, setQueryRes] = useState(null);
  const [weights, setWeights] = useState({ vector: 0.4, keyword: 0.3, graph: 0.3 });
  const [dept, setDept] = useState('');
  const [reranker, setReranker] = useState(true);
  const [querying, setQuerying] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamDone, setStreamDone] = useState(null);

  // Upload / ingestion state
  const [uploading, setUploading] = useState(false);
  const [ingDocId, setIngDocId] = useState(null);
  const [ingLogs, setIngLogs] = useState([]);
  const [ingDone, setIngDone] = useState(false);

  // Seeding
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const visRef = useRef(null);
  const queryInputRef = useRef(null);

  // ── Auth check
  useEffect(() => {
    if (!api.t()) return;
    api.get('/auth/me').then(d => {
      if (d?.id) setUser(d);
      else api.clear();
    }).catch(() => api.clear());
  }, []);

  // ── Fetch all live data
  const refresh = useCallback(async () => {
    const [h, t, g, l, d, hist, ana] = await Promise.all([
      api.get('/api/health'),
      api.get('/api/system/telemetry'),
      api.get('/api/graph/visualization'),
      api.get('/api/blockchain/ledger'),
      api.get('/api/documents'),
      api.get('/api/history'),
      api.get('/api/analytics'),
    ]);
    if (h?.status) setHealth(h);
    if (t?.qdrant_vector_store) setTelemetry(t);
    if (g?.nodes) setGraphData(g);
    if (Array.isArray(l?.blocks)) setLedger(l);
    if (Array.isArray(d)) { setDocs(d); if (d[0] && !selectedDoc) setSelectedDoc(d[0]); }
    if (Array.isArray(hist)) setHistory(hist);
    if (ana?.total_queries !== undefined) setAnalytics(ana);
  }, [selectedDoc]);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  // Auto-refresh health every 30s
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => api.get('/api/health').then(h => { if (h?.status) setHealth(h); }), 30000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Ingestion polling
  useEffect(() => {
    if (!ingDocId || ingDone) return;
    const iv = setInterval(async () => {
      const r = await api.get(`/api/documents/${ingDocId}/logs`);
      if (r?.logs) setIngLogs(r.logs);
      if (r?.is_complete) { setIngDone(true); clearInterval(iv); refresh(); }
    }, 800);
    return () => clearInterval(iv);
  }, [ingDocId, ingDone, refresh]);

  // ── Knowledge graph vis-network
  useEffect(() => {
    if (tab !== 'graph' || !visRef.current || !graphData?.nodes?.length) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nodes = graphData.nodes.slice(0, 400).map(n => ({
      id: n.id, label: n.label, group: n.type,
      title: `${n.type} · PageRank: ${n.pagerank} · Degree: ${n.degree_centrality}`,
      size: Math.max(12, Math.min(38, 12 + (n.pagerank || 0) * 1000)),
    }));
    const edges = (graphData.edges || []).slice(0, 800).map((e, i) => ({
      id: i, from: e.from, to: e.to, label: e.label || '',
      title: `${e.label || 'relates_to'} (conf: ${e.confidence ? (e.confidence * 100).toFixed(0) + '%' : '—'})`,
      arrows: 'to',
      font: { align: 'middle', size: 9, color: isDark ? '#64748b' : '#94a3b8' },
      color: { color: isDark ? 'rgba(99,102,241,0.35)' : '#e2e8f0', highlight: isDark ? '#818cf8' : '#4f46e5' },
      width: isDark ? 1.5 : 1.5,
    }));
    const net = new VisNetwork(visRef.current, { nodes, edges }, {
      nodes: {
        shape: 'dot',
        font: { size: 11, color: isDark ? '#94a3b8' : '#0f172a', face: 'Inter' },
        borderWidth: isDark ? 2 : 2,
        shadow: isDark
          ? { enabled: true, color: 'rgba(99,102,241,0.35)', size: 12 }
          : { enabled: true, color: 'rgba(0,0,0,0.10)', size: 8 },
      },
      groups: {
        ORGANIZATION: { color: { background: '#3b82f6', border: isDark ? '#60a5fa' : '#93c5fd', highlight: { background: '#2563eb', border: '#bfdbfe' } } },
        TECHNOLOGY:   { color: { background: '#8b5cf6', border: isDark ? '#a78bfa' : '#c4b5fd', highlight: { background: '#7c3aed', border: '#ddd6fe' } } },
        CONCEPT:      { color: { background: '#10b981', border: isDark ? '#34d399' : '#6ee7b7', highlight: { background: '#059669', border: '#a7f3d0' } } },
        METRIC:       { color: { background: '#f59e0b', border: isDark ? '#fbbf24' : '#fcd34d', highlight: { background: '#d97706', border: '#fde68a' } } },
        PERSON:       { color: { background: '#ec4899', border: isDark ? '#f472b6' : '#f9a8d4', highlight: { background: '#db2777', border: '#fbcfe8' } } },
        LOCATION:     { color: { background: '#06b6d4', border: isDark ? '#22d3ee' : '#67e8f9', highlight: { background: '#0891b2', border: '#a5f3fc' } } },
        ENTITY:       { color: { background: isDark ? '#334155' : '#6b7280', border: isDark ? '#64748b' : '#d1d5db', highlight: { background: isDark ? '#475569' : '#4b5563', border: '#e5e7eb' } } },
      },
      edges: { smooth: { type: 'continuous' } },
      physics: { forceAtlas2Based: { gravitationalConstant: -30, centralGravity: 0.005, springLength: 230, springConstant: 0.16 }, maxVelocity: 140, solver: 'forceAtlas2Based', stabilization: { iterations: 180 } },
      interaction: { hover: true, tooltipDelay: 100 },
      background: { color: 'transparent' },
    });
    net.on('click', p => {
      if (p.nodes[0]) {
        const n = graphData.nodes.find(n => n.id === p.nodes[0]);
        if (n) setSelectedDoc({ _type: 'node', ...n });
      }
    });
    return () => net.destroy();

  }, [tab, graphData, theme]);

  // ── All useMemo MUST be before any early returns (Rules of Hooks)
  const topEntities = useMemo(() =>
    (graphData?.nodes || []).slice().sort((a, b) => (b.pagerank || 0) - (a.pagerank || 0)).slice(0, 8)
  , [graphData]);

  const topRelations = useMemo(() =>
    (graphData?.edges || []).slice(0, 6)
  , [graphData]);

  const liveActivity = useMemo(() => {
    const acts = [];
    if (history.length > 0) {
      history.slice(0, 3).forEach(h => acts.push({ icon: Search, color: '#4f46e5', bg: 'rgba(79,70,229,0.10)', title: 'Query executed', sub: h.query.slice(0, 50) + (h.query.length > 50 ? '\u2026' : ''), time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    }
    if (docs.length > 0) {
      docs.slice(0, 2).forEach(d => acts.push({ icon: Upload, color: '#10b981', bg: 'rgba(16,185,129,0.10)', title: 'Document indexed', sub: d.filename + ` \u00b7 ${d.chunk_count} chunks`, time: new Date(d.upload_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    }
    if (ledger.blocks?.length > 0) {
      acts.push({ icon: Lock, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', title: 'Blockchain sealed', sub: `Block #${ledger.blocks[ledger.blocks.length - 1]?.index} \u00b7 SHA-256 verified`, time: ledger.blocks[ledger.blocks.length - 1]?.timestamp?.slice(11, 16) || '' });
    }
    if (acts.length === 0) {
      acts.push({ icon: Sparkles, color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', title: 'System ready', sub: 'Upload documents or seed demo data to start', time: 'now' });
    }
    return acts.slice(0, 6);
  }, [history, docs, ledger]);

  if (!user) return <AuthPage onLogin={d => setUser(d)} />;

  /* ── Handlers ── */
  const seed = async () => {
    setSeeding(true); setSeedResult(null);
    const r = await api.post('/api/seed_demo', {});
    if (r.ok) { setSeedResult(r.data); await refresh(); }
    else setSeedResult({ error: r.data?.detail || 'Seeding failed.' });
    setSeeding(false);
  };

  const runQuery = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setQuerying(true); setQueryRes(null); setStreamText(''); setStreamDone(null);
    const r = await api.post('/api/query', {
      query,
      vector_weight: +weights.vector,
      keyword_weight: +weights.keyword,
      graph_weight: +weights.graph,
      top_k: 6,
      department_filter: dept || null,
      use_reranker: reranker,
    });
    if (r.ok) { setQueryRes(r.data); refresh(); }
    else alert(r.data?.detail || 'Query failed. Check backend is running.');
    setQuerying(false);
  };

  const runStream = async () => {
    if (!query.trim()) return;
    setStreaming(true); setStreamText(''); setStreamDone(null); setQueryRes(null);
    try {
      const r = await fetch(`${API}/api/query/stream`, {
        method: 'POST', headers: api.hdrs(),
        body: JSON.stringify({ query, vector_weight: +weights.vector, keyword_weight: +weights.keyword, graph_weight: +weights.graph, top_k: 6, department_filter: dept || null, use_reranker: reranker }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setStreamText(`Error: ${d.detail || 'Request failed'}`); setStreaming(false); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === 'token') { acc += p.text; setStreamText(acc); }
            if (p.type === 'done') { setStreamDone(p); refresh(); }
          } catch { }
        }
      }
    } catch (err) { setStreamText(`Connection error: ${err.message}`); }
    finally { setStreaming(false); }
  };

  const doUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setIngLogs([]); setIngDone(false); setIngDocId(null);
    const form = new FormData(); form.append('file', file); form.append('department', dept || '');
    const r = await api.upload('/api/upload', form);
    if (r.ok && r.data?.document_id) { setIngDocId(r.data.document_id); setTab('documents'); }
    else alert(r.data?.detail || 'Upload failed. Ensure backend is running.');
    setUploading(false);
    e.target.value = '';
  };

  /* ── Computed data from real API ── */
  const vecChunks = health?.vector_store_chunks || 0;
  const graphNodes = health?.knowledge_graph?.total_nodes || 0;
  const graphEdges = health?.knowledge_graph?.total_edges || 0;
  const blockHeight = health?.blockchain_height || 0;
  const storageStats = health?.storage || {};
  const storageUsedPct = storageStats.used_pct || 0;
  const storageUsedGB = ((storageStats.used_bytes || 0) / 1e9).toFixed(1);
  const storageTotalGB = ((storageStats.total_bytes || 0) / 1e9).toFixed(1);

  const ENTITY_TYPE_COLORS = {
    POLICY: '#4f46e5', PERSON: '#ec4899', PROCESS: '#f59e0b',
    CONCEPT: '#10b981', REGULATION: '#ef4444', TECHNOLOGY: '#8b5cf6',
    ORGANIZATION: '#3b82f6', METRIC: '#06b6d4', LOCATION: '#0891b2',
    ENTITY: '#6b7280',
  };

  const NAV = [
    { key: 'retrieval', icon: Search, label: 'Retrieval Studio', badge: null },
    { key: 'workspace', icon: Home, label: 'Workspace', badge: null },
    { key: 'graph', icon: Network, label: 'Knowledge Graph', badge: graphNodes > 0 ? graphNodes.toLocaleString() : null },
    { key: 'documents', icon: FileText, label: 'Documents', badge: docs.length > 0 ? docs.length : null },
    { key: 'verification', icon: ShieldCheck, label: 'Verification', badge: queryRes ? '1' : null },
    { key: 'agents', icon: Cpu, label: 'AI Agents', badge: null },
    { key: 'telemetry', icon: Activity, label: 'Telemetry', badge: null },
    { key: 'history', icon: Clock, label: 'History', badge: history.length > 0 ? history.length : null },
    { key: 'blockchain', icon: Lock, label: 'Blockchain Ledger', badge: blockHeight > 0 ? `#${blockHeight}` : null },
  ];

  /* ── RENDER ── */
  return (
    <div className="app-root">

      {/* ── TOPBAR ─────────────────────────────────────────── */}
      <header className="topbar">
        <button className="topbar-icon-btn" onClick={() => setSidebarOpen(o => !o)} style={{ marginRight: 8, border: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="topbar-logo">
          <motion.div className="logo-mark" whileHover={{ scale: 1.08, rotate: -5 }}>
            <Network size={18} color="#fff" />
          </motion.div>
          <div className="topbar-brand">
            <div className="topbar-title">IntelliDoc AI</div>
            <div className="topbar-sub">KNOWLEDGE UNIFIED</div>
          </div>
        </div>

        {/* Global search bar */}
        <div className="topbar-search">
          <Search size={13} className="topbar-search-icon" />
          <input type="text" placeholder="Search entities, documents, or ask a question… (⌘K)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { setTab('retrieval'); runQuery(e); } }}
          />
          <span className="topbar-search-kbd">⌘K</span>
        </div>

        {/* Live pill counters — real data only */}
        <div className="topbar-pills">
          {[
            { icon: Database, val: vecChunks, label: 'vectors', color: 'var(--a)' },
            { icon: Network, val: graphNodes, label: 'nodes', color: 'var(--ok)' },
            { icon: Lock, val: blockHeight > 0 ? `#${blockHeight}` : '—', label: 'blocks', color: 'var(--amber)' },
          ].map(({ icon: I, val, label, color }) => (
            <div key={label} className="topbar-pill">
              <I size={12} color={color} />
              <span className="topbar-pill-val">{val}</span>
              <span style={{ color: 'var(--ink3)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="topbar-actions">
          {/* Seed Demo */}
          <motion.button className="btn btn-ghost btn-sm" onClick={seed} disabled={seeding}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            title="Seed demo enterprise documents" style={{ gap: 6, padding: '6px 12px' }}>
            {seeding ? <Spinner size={12} /> : <Sparkles size={12} color="var(--a)" />}
            Seed Demo
          </motion.button>

          {/* Upload */}
          <label title="Upload document">
            <motion.span className="btn btn-primary btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              style={{ display: 'inline-flex', cursor: 'pointer', gap: 6, padding: '6px 14px' }}>
              {uploading ? <Spinner size={12} color="#fff" /> : <Plus size={13} />} Upload
            </motion.span>
            <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
          </label>

          <motion.button className="topbar-icon-btn" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={refresh} title="Refresh all data">
            <RefreshCw size={14} />
          </motion.button>

          <motion.button className="topbar-icon-btn" whileHover={{ scale: 1.06 }}>
            <Bell size={14} />
            {(ingLogs.length > 0 && !ingDone) && <span className="topbar-notif-dot" />}
          </motion.button>

          {/* Theme toggle */}
          <motion.button
            className="theme-btn"
            onClick={toggleTheme}
            whileHover={{ scale: 1.08, rotate: 15 }}
            whileTap={{ scale: 0.92 }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {theme === 'dark'
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </motion.div>
          </motion.button>

          <motion.div className="user-chip" whileHover={{ scale: 1.02 }}>
            <div className="user-avatar">{user.username.slice(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user.full_name || user.username}</div>
              <div className="user-role">{user.department || 'Administrator'}</div>
            </div>
          </motion.div>

          <motion.button className="topbar-icon-btn" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={() => { api.clear(); setUser(null); }} title="Sign out">
            <LogOut size={14} />
          </motion.button>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────── */}
      <div className="app-body">

        {/* SIDEBAR */}
        <motion.aside className="sidebar" animate={{ width: sidebarOpen ? 224 : 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          <div className="sidebar-inner">

            <div className="nav-section">STUDIO</div>
            <nav>
              {NAV.map(({ key, icon: Icon, label, badge }) => (
                <motion.button key={key} onClick={() => setTab(key)}
                  className={`nav-item ${tab === key ? 'active' : ''}`}
                  whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
                  <Icon size={15} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </motion.button>
              ))}
            </nav>

            <div className="sidebar-divider" />

            {/* Quick upload */}
            <div className="nav-section">QUICK UPLOAD</div>
            <label style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--a-soft)', border: '1.5px dashed var(--a-border)', borderRadius: 10, color: 'var(--a)', fontSize: 12.5, fontWeight: 600, justifyContent: 'center', transition: 'all 0.2s' }}>
                {uploading ? <Spinner size={13} /> : <Upload size={14} />}
                {uploading ? 'Processing…' : 'Drop or Click to Upload'}
              </motion.div>
              <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
            </label>
            <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 5, paddingLeft: 2, lineHeight: 1.5 }}>PDF · DOCX · XLSX · TXT · MD</div>

            {/* Mini pipeline progress */}
            {ingLogs.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {['Parse', 'Chunk', 'Embed', 'Index', 'Graph'].map((st, i) => (
                  <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, marginBottom: 4 }}>
                    <motion.div animate={{ scale: ingLogs.length === i ? [1, 1.3, 1] : 1 }} transition={{ repeat: Infinity, duration: 0.8 }}
                      style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: ingLogs.length > i ? 'var(--ok)' : ingLogs.length === i ? 'var(--a)' : 'var(--b2)', transition: 'background 0.3s', boxShadow: ingLogs.length === i ? '0 0 6px var(--a)' : 'none' }} />
                    <span style={{ color: ingLogs.length > i ? 'var(--ok)' : ingLogs.length === i ? 'var(--a)' : 'var(--ink3)', fontWeight: ingLogs.length >= i ? 600 : 400 }}>{st}</span>
                    {ingLogs.length === i && <Spinner size={10} />}
                  </div>
                ))}
              </div>
            )}

            {/* Storage — real data */}
            <div style={{ marginTop: 'auto' }}>
              <div className="sidebar-storage">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, color: 'var(--ink2)' }}>
                  <span>Storage</span>
                  <span style={{ color: 'var(--ink3)' }}>{storageUsedPct > 0 ? `${Math.round(storageUsedPct)}%` : '—'}</span>
                </div>
                <div className="storage-bar-track" style={{ marginTop: 8 }}>
                  <motion.div className="storage-bar-fill"
                    animate={{ width: `${storageUsedPct || 12}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 5 }}>
                  {storageUsedPct > 0 ? `${storageUsedGB} GB / ${storageTotalGB} GB` : `${docs.length} docs · ${vecChunks} chunks`}
                </div>
              </div>

              <div className="upgrade-card" style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Upgrade to Enterprise+</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 10, lineHeight: 1.5 }}>Advanced analytics, agent workflows & unlimited storage.</div>
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 11.5 }}>
                  <ChevronRight size={12} /> Get Started
                </button>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* ── MAIN ─────────────────────────────────────────── */}
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>

              {/* ================================================
                  WORKSPACE
                  ================================================ */}
              {tab === 'workspace' && (
                <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: 'var(--ink3)' }}>
                    RAG Studio / Enterprise Workspace
                  </div>

                  {/* ── HERO ── */}
                  <motion.div className="hero-banner"
                    initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}>
                    <div style={{ flex: '1 1 340px', minWidth: 0, zIndex: 1 }}>
                      <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 99, marginBottom: 16, fontSize: 11, fontWeight: 700, color: 'var(--a)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)' }} />
                          </motion.div>
                          Live System — {health?.status || 'Connecting…'}
                        </div>
                        <h1 className="hero-h1">
                          Your enterprise<br />knowledge, <span>connected.</span>
                        </h1>
                        <p className="hero-sub">
                          IntelliDoc AI transforms scattered documents into a living, verifiable knowledge base using Hybrid RAG, Knowledge Graphs &amp; Blockchain verification.
                        </p>
                        <div className="hero-btns">
                          {[
                            { label: 'Ask Your Documents', icon: Search, action: () => { setTab('retrieval'); setTimeout(() => queryInputRef.current?.focus(), 100); }, primary: true },
                            { label: 'Explore Graph', icon: Network, action: () => setTab('graph') },
                            { label: 'Upload Docs', icon: Upload, action: () => setTab('documents') },
                          ].map(({ label, icon: I, action, primary }) => (
                            <motion.button key={label} className={`btn ${primary ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={action} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                              style={{ padding: '10px 18px', fontSize: 13.5, borderRadius: 10, ...(primary ? { boxShadow: '0 4px 16px rgba(79,70,229,0.28)' } : {}) }}>
                              <I size={14} /> {label}
                            </motion.button>
                          ))}
                        </div>

                        {/* Seed result banner */}
                        <AnimatePresence>
                          {seedResult && (
                            <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              style={{ marginTop: 14, padding: '10px 14px', background: seedResult.error ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.08)', border: `1px solid ${seedResult.error ? 'rgba(239,68,68,0.20)' : 'rgba(16,185,129,0.20)'}`, borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: seedResult.error ? '#dc2626' : '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {seedResult.error ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                              {seedResult.error || `Seeded ${seedResult.documents_seeded} docs · ${seedResult.chunks_indexed} chunks · ${seedResult.graph_nodes} graph nodes`}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    {/* ── Floating 3D doc cards — real data driven ── */}
                    <div className="float-doc-group" style={{ zIndex: 1, flexShrink: 0 }}>
                      {docs.slice(0, 3).map((doc, i) => (
                        <motion.div key={doc.document_id}
                          className="float-doc"
                          style={{ top: [12, 80, 150][i], [i % 2 === 0 ? 'left' : 'right']: [20, 10, 30][i], animationDelay: `${i * 1.2}s`, zIndex: 3 - i, cursor: 'pointer' }}
                          animate={{ y: [0, -(8 + i * 3), 0] }}
                          transition={{ duration: 3.5 + i * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                          onClick={() => { setSelectedDoc(doc); setTab('documents'); }}
                          whileHover={{ scale: 1.04 }}>
                          <FileText size={13} color={['#ef4444', '#3b82f6', '#4f46e5'][i % 3]} />
                          <div>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                            <div style={{ fontSize: 9.5, color: 'var(--ink3)' }}>{doc.chunk_count} chunks</div>
                          </div>
                        </motion.div>
                      ))}
                      {/* Stats floaters */}
                      {[
                        { val: graphNodes, label: 'Entities', top: 8, right: 50, color: 'var(--ok)' },
                        { val: graphEdges, label: 'Relations', top: 130, right: 60, color: 'var(--a)' },
                        { val: vecChunks, label: 'Vectors', bottom: 10, right: 20, color: 'var(--purple)' },
                      ].filter(f => f.val > 0).map((f, i) => (
                        <motion.div key={f.label}
                          className="float-stat"
                          style={{ ...(f.top !== undefined ? { top: f.top } : { bottom: f.bottom }), ...(f.right !== undefined ? { right: f.right } : { left: f.left }) }}
                          animate={{ y: [0, -7, 0], rotate: [(-1) ** i * 2, 0, (-1) ** i * 2] }}
                          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: f.color, fontFamily: 'var(--font-mono)' }}>{f.val.toLocaleString()}</div>
                          <div style={{ fontSize: 9.5, color: 'var(--ink3)', fontWeight: 600 }}>{f.label}</div>
                        </motion.div>
                      ))}
                      {/* If no docs yet, show placeholder anim */}
                      {docs.length === 0 && (
                        <motion.div className="float-doc" style={{ top: 60, left: 20 }}
                          animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                          <Upload size={14} color="#4f46e5" />
                          <span style={{ fontSize: 11, fontWeight: 700 }}>Upload your first doc</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>

                  {/* ── STATS ROW — all real ── */}
                  <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}
                    variants={stagger} initial="hidden" animate="show">
                    {[
                      { icon: FileText, label: 'Documents', value: docs.length, sub: 'Indexed', col: '#4f46e5', bg: 'rgba(79,70,229,0.10)' },
                      { icon: Database, label: 'Vector Chunks', value: vecChunks, sub: 'Embeddings', col: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
                      { icon: Network, label: 'Graph Entities', value: graphNodes, sub: `${graphEdges} edges`, col: '#10b981', bg: 'rgba(16,185,129,0.10)' },
                      { icon: BarChart2, label: 'Avg Trust Score', value: analytics?.avg_trust_score || 0, sub: `${analytics?.total_queries || 0} queries`, col: '#f59e0b', bg: 'rgba(245,158,11,0.10)', decimals: 1, suffix: '%' },
                    ].map(({ icon: I, label, value, sub, col, bg, decimals = 0, suffix = '' }, idx) => (
                      <motion.div key={label} variants={fadeUp}
                        className="stat-card"
                        whileHover={{ y: -5, boxShadow: `0 16px 40px ${col}18` }}>
                        <div className="stat-icon" style={{ background: bg }}>
                          <I size={17} color={col} />
                        </div>
                        <div className="stat-val"><CountUp to={value} decimals={decimals} suffix={suffix} /></div>
                        <div className="stat-lbl">{label}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>{sub}</div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ── BOTTOM GRID: Graph canvas + Activity ── */}
                  <div className="workspace-grid">
                    {/* Knowledge Graph Preview */}
                    <motion.div className="graph-map-card"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                      <div className="graph-map-header">
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Knowledge Graph</div>
                          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
                            {graphNodes > 0 ? `${graphNodes.toLocaleString()} entities · ${graphEdges.toLocaleString()} connections` : 'Upload documents to build the graph'}
                          </div>
                        </div>
                        <motion.button className="btn btn-ghost btn-sm" onClick={() => setTab('graph')}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          Explore <ChevronRight size={13} />
                        </motion.button>
                      </div>
                      <div className="graph-canvas-wrap" style={{ position: 'relative' }}>
                        <LiveGraphCanvas />
                        {/* Overlay real entity labels from API */}
                        {topEntities.slice(0, 6).map((n, i) => {
                          const positions = [
                            [42, 25], [70, 40], [25, 55], [65, 70], [20, 75], [78, 22],
                          ];
                          const [x, y] = positions[i] || [50, 50];
                          const col = ENTITY_TYPE_COLORS[n.type] || '#4f46e5';
                          return (
                            <motion.div key={n.id || n.label}
                              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4 + i * 0.1 }}
                              style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', background: 'white', border: `1.5px solid ${col}28`, borderRadius: 8, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: 'var(--ink)', boxShadow: `0 2px 10px ${col}18`, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2 }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: col, display: 'inline-block', marginRight: 4 }} />
                              {n.label?.slice(0, 16)}{n.label?.length > 16 ? '…' : ''}
                            </motion.div>
                          );
                        })}
                        {graphNodes === 0 && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)', borderRadius: 14, zIndex: 3 }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 8 }}>No graph data yet</div>
                              <button className="btn btn-primary btn-sm" onClick={seed} disabled={seeding}>
                                {seeding ? <Spinner size={12} color="#fff" /> : <Sparkles size={12} />} Seed Demo Data
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Legend */}
                        <div style={{ position: 'absolute', bottom: 12, left: 16, display: 'flex', gap: 14, zIndex: 2 }}>
                          {[{ l: 'Entities', c: '#4f46e5', n: graphNodes }, { l: 'Connections', c: '#10b981', n: graphEdges }].map(item => (
                            <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.85)', padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(8px)' }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.c }} />
                              <span style={{ color: 'var(--ink2)' }}>{item.l}</span>
                              <span style={{ color: item.c, fontWeight: 800 }}>{item.n.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* Live Activity — from real history/docs/ledger */}
                    <motion.div className="card card-p"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <div className="section-header">
                        <div>
                          <div className="section-title">Live Activity</div>
                          <div className="section-sub">Real-time events from the knowledge pipeline.</div>
                        </div>
                        <button className="section-link" onClick={() => setTab('history')}>See All <ChevronRight size={13} /></button>
                      </div>
                      <div className="activity-list">
                        {liveActivity.map((act, i) => (
                          <motion.div key={i} className="activity-item"
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
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

              {/* ================================================
                  RETRIEVAL STUDIO
                  ================================================ */}
              {tab === 'retrieval' && (
                <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <PageHeader icon={Search} color="var(--a)" title="Retrieval Studio"
                    sub="Hybrid Vector + BM25 + Knowledge Graph retrieval with Reciprocal Rank Fusion" />

                  {/* Query bar */}
                  <motion.div className="card" style={{ padding: '20px 22px' }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <form onSubmit={runQuery}>
                      <div className="query-bar" style={{ marginBottom: 14 }}>
                        <Search size={16} color="var(--ink3)" style={{ flexShrink: 0 }} />
                        <input ref={queryInputRef} type="text" className="query-input" value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder="Ask anything about your enterprise documents…" />
                        <select value={dept} onChange={e => setDept(e.target.value)}
                          style={{ width: 130, height: 32, fontSize: 12, padding: '0 10px', borderRadius: 7, border: '1px solid var(--b1)', background: 'var(--bg2)', flexShrink: 0 }}>
                          <option value="">All Sources</option>
                          <option value="Technology">Technology</option>
                          <option value="HR">Human Resources</option>
                          <option value="Finance">Finance</option>
                          <option value="Legal">Legal</option>
                          <option value="Operations">Operations</option>
                        </select>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <motion.button type="submit" disabled={querying} className="btn btn-ghost btn-sm"
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            {querying ? <Spinner size={13} /> : <Send size={13} />}
                          </motion.button>
                          <motion.button type="button" onClick={runStream} disabled={streaming} className="btn btn-primary btn-sm"
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            style={{ boxShadow: '0 2px 10px rgba(79,70,229,0.25)' }}>
                            {streaming ? <Spinner size={13} color="#fff" /> : <Zap size={13} />}
                            Stream
                          </motion.button>
                        </div>
                      </div>
                    </form>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {['Summarize HR leave policy', 'What is the approval workflow?', 'Security compliance overview', 'AI architecture components', 'Expense reimbursement rules'].map(chip => (
                        <motion.button key={chip} className="query-chip"
                          whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                          onClick={() => setQuery(chip)}>
                          {chip}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Pipeline stepper */}
                  <motion.div className="card" style={{ padding: '14px 20px' }}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                    <div className="pipeline-bar">
                      {[{ l: 'Embed', I: Cpu }, { l: 'Vector', I: Database }, { l: 'BM25', I: Search }, { l: 'Graph', I: Network }, { l: 'RRF Fuse', I: Layers }, { l: 'Answer', I: ShieldCheck }].map((s, idx) => (
                        <React.Fragment key={s.l}>
                          <div className="pipeline-node-wrap">
                            <motion.div className={`pipeline-circle ${(querying || streaming) ? 'active' : ''}`}
                              animate={(querying || streaming) ? { boxShadow: ['0 0 0 2px rgba(79,70,229,0.2)', '0 0 0 6px rgba(79,70,229,0.06)', '0 0 0 2px rgba(79,70,229,0.2)'] } : {}}
                              transition={{ repeat: Infinity, duration: 1.5, delay: idx * 0.2 }}>
                              <s.I size={12} color={(querying || streaming) ? '#fff' : 'var(--ink3)'} />
                            </motion.div>
                            <span className={`pipeline-label ${(querying || streaming) ? 'active' : ''}`}>{s.l}</span>
                          </div>
                          {idx < 5 && <div className={`pipeline-line ${(querying || streaming) ? 'active' : ''}`} />}
                        </React.Fragment>
                      ))}
                    </div>
                  </motion.div>

                  {/* Results */}
                  <AnimatePresence mode="wait">
                    {(streaming || streamText) && (
                      <motion.div key="stream" className="card card-accent" style={{ padding: 26 }}
                        initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <motion.div animate={{ rotate: streaming ? 360 : 0 }} transition={{ repeat: streaming ? Infinity : 0, duration: 1, ease: 'linear' }}>
                            <Zap size={16} color="var(--a)" />
                          </motion.div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                            Gemini {streaming ? '— Streaming…' : '— Complete'}
                          </span>
                          {streaming && <span className="badge badge-indigo" style={{ marginLeft: 'auto', fontSize: 10 }}>LIVE</span>}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: 'var(--ink)' }} className={streaming ? 'cursor-blink' : ''}>{streamText}</p>
                        {streamDone && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--b1)', fontSize: 11.5, color: 'var(--ink3)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <TrustRing score={streamDone.trust_score} size={52} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Trust Score: {streamDone.trust_score}%</div>
                              <RiskBadge risk={streamDone.hallucination_risk} />
                            </div>
                            <button onClick={() => setTab('verification')} className="btn btn-ghost btn-sm"><ShieldCheck size={12} /> View Audit</button>
                          </div>
                        )}
                      </motion.div>
                    )}
                    {queryRes && !streaming && !streamText && (
                      <motion.div key="answer" className="answer-card has-answer"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <CheckCircle2 size={18} color="var(--ok)" />
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>AI Answer — Grounded in Your Documents</div>
                              <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>{queryRes.retrieved_chunks?.length ?? 0} chunks retrieved · {queryRes.latency_ms} ms latency</div>
                            </div>
                          </div>
                          <TrustRing score={queryRes.trust_score} />
                        </div>
                        <p style={{ fontSize: 14, lineHeight: 1.85, margin: '0 0 16px', color: 'var(--ink)' }}>{queryRes.answer}</p>
                        {queryRes.retrieved_chunks?.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Source Documents</div>
                            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                              {queryRes.retrieved_chunks.slice(0, 6).map((c, i) => (
                                <span key={i} className="source-chip">📄 {c.filename} · p.{c.page_num ?? 1}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--b1)', fontSize: 11.5, color: 'var(--ink3)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>⏱ {queryRes.latency_ms} ms</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>🔗 Block #{queryRes.blockchain_seal?.block_index}</span>
                          <RiskBadge risk={queryRes.hallucination_risk} />
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                            <button onClick={() => setTab('verification')} className="btn btn-ghost btn-sm"><ShieldCheck size={12} /> Audit</button>
                            <button onClick={() => setTab('blockchain')} className="btn btn-ghost btn-sm"><Hash size={12} /> Block</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Graph Context Triples */}
                  {queryRes?.graph_context?.triples_summary?.length > 0 && (
                    <motion.div className="card" style={{ padding: '16px 20px' }}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Network size={14} color="var(--ok)" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Knowledge Graph Context</span>
                        <span className="badge badge-green" style={{ fontSize: 10, marginLeft: 'auto' }}>
                          {queryRes.graph_context.triples_summary.length} triples · confidence-scored
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {queryRes.graph_context.triples_summary.slice(0, 6).map((t, i) => {
                          const conf = typeof t.confidence === 'number' ? t.confidence : 0.65;
                          const confPct = Math.round(conf * 100);
                          const col = conf >= 0.80 ? 'var(--ok)' : conf >= 0.65 ? 'var(--a)' : 'var(--warn)';
                          return (
                            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--b1)' }}>
                              <div style={{ flex: 1, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
                                <span style={{ fontWeight: 700, color: 'var(--ink)', background: 'var(--a-soft)', padding: '1px 7px', borderRadius: 5 }}>{t.subject}</span>
                                <span style={{ color: col, fontWeight: 600, fontSize: 11 }}>→ {t.predicate} →</span>
                                <span style={{ fontWeight: 700, color: 'var(--ink)', background: 'var(--ok-s)', padding: '1px 7px', borderRadius: 5 }}>{t.object}</span>
                              </div>
                              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 48, height: 3, borderRadius: 99, background: 'var(--b2)' }}>
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${confPct}%` }} transition={{ duration: 0.7, delay: i * 0.06 }}
                                    style={{ height: '100%', borderRadius: 99, background: col }} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: 'var(--font-mono)', minWidth: 30 }}>{confPct}%</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}


                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }}>
                    {/* Engine cards */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                      <div className="section-header">
                        <div><div className="section-title">Retrieval Engines</div><div className="section-sub">All 3 run in parallel, results merged via RRF</div></div>
                      </div>
                      <div className="engine-grid">
                        {[
                          { icon: Database, color: '#6366f1', num: '01', title: 'Vector Semantic Search', desc: 'Your query is embedded into 384D space. Qdrant finds semantically similar chunks even if exact words differ.', example: '"sick leave" → "medical absence policy"' },
                          { icon: Search, color: '#0891b2', num: '02', title: 'BM25 Keyword Search', desc: 'TF-IDF scoring for exact term, code, or number matching. Best for specific references.', example: '"Invoice #INV-2024" or "Section 4.2.1"' },
                          { icon: Network, color: '#059669', num: '03', title: 'Graph Traversal', desc: 'Entities found in the query are traversed in NetworkX to surface connected context.', example: '"HR Manager" → "Leave Policy" → "Approval Flow"' },
                        ].map(({ icon: I, color, num, title, desc, example }, idx) => (
                          <motion.div key={title} className="engine-card"
                            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + idx * 0.08 }}
                            whileHover={{ y: -5, boxShadow: `0 20px 48px ${color}22` }}
                            style={{ background: `${color}08`, borderColor: `${color}28` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <I size={16} color={color} />
                              </div>
                              <span style={{ fontSize: 9.5, fontWeight: 800, color, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>ENGINE {num}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.25 }}>{title}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 10 }}>{desc}</div>
                            <div style={{ fontSize: 11, color, background: `${color}10`, borderRadius: 8, padding: '6px 10px', fontStyle: 'italic', borderLeft: `2px solid ${color}50` }}>e.g. {example}</div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Weight controls */}
                    <motion.div className="card card-p" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
                        <Sliders size={16} color="var(--a)" />
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Engine Weights</div>
                      </div>
                      {[
                        { k: 'vector', col: '#6366f1', l: 'Vector', badge: 'Semantic' },
                        { k: 'keyword', col: '#0891b2', l: 'BM25', badge: 'Exact' },
                        { k: 'graph', col: '#059669', l: 'Graph', badge: 'Relational' },
                      ].map(w => (
                        <div key={w.k} className="weight-row">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{w.l}</span>
                              <span className="badge badge-slate" style={{ fontSize: 10 }}>{w.badge}</span>
                            </div>
                            <motion.span animate={{ color: w.col }} style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                              {(+weights[w.k] * 100).toFixed(0)}%
                            </motion.span>
                          </div>
                          <div className="weight-track">
                            <motion.div className="weight-fill"
                              animate={{ width: `${+weights[w.k] * 100}%` }}
                              transition={{ duration: 0.4 }}
                              style={{ background: w.col }} />
                          </div>
                          <input type="range" min="0" max="1" step="0.05" value={weights[w.k]}
                            onChange={e => setWeights(p => ({ ...p, [w.k]: +e.target.value }))}
                            style={{ accentColor: w.col }} />
                        </div>
                      ))}
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Neural Re-Ranker</div>
                          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Cross-encoder precision boost</div>
                        </div>
                        <motion.button onClick={() => setReranker(r => !r)} whileTap={{ scale: 0.85 }}
                          style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', background: reranker ? 'var(--a)' : 'var(--b2)', transition: 'background 0.3s', boxShadow: reranker ? '0 2px 8px rgba(79,70,229,0.30)' : 'none' }}>
                          <motion.div animate={{ left: reranker ? 22 : 3 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.20)' }} />
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ================================================
                  KNOWLEDGE GRAPH
                  ================================================ */}
              {tab === 'graph' && (
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                  <PageHeader icon={Network} color="var(--ok)" title="Knowledge Graph Explorer"
                    sub={graphNodes > 0 ? `${graphNodes.toLocaleString()} entities · ${graphEdges.toLocaleString()} semantic relationships` : 'Upload documents to build the graph'}
                    action={
                      <div style={{ display: 'flex', gap: 8 }}>
                        <motion.button className="btn btn-ghost btn-sm" onClick={refresh} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <RefreshCw size={13} /> Refresh
                        </motion.button>
                        {graphNodes === 0 && (
                          <motion.button className="btn btn-primary btn-sm" onClick={seed} disabled={seeding} whileHover={{ scale: 1.03 }}>
                            {seeding ? <Spinner size={12} color="#fff" /> : <Sparkles size={12} />} Seed Demo
                          </motion.button>
                        )}
                      </div>
                    } />
                  <div style={{ display: 'flex', gap: 18, minHeight: 560 }}>
                    <div className="card" style={{ flex: '1 1 500px', overflow: 'hidden', minHeight: 520 }}>
                      {graphNodes > 0
                        ? <div ref={visRef} style={{ width: '100%', height: '100%', minHeight: 520 }} />
                        : <EmptyState icon={Network} message="No graph entities yet. Upload documents or seed demo data to build the knowledge graph." action={
                          <button className="btn btn-primary" onClick={seed} disabled={seeding}>{seeding ? <Spinner size={14} color="#fff" /> : <Sparkles size={14} />} Seed Demo Data</button>
                        } />}
                    </div>
                    <motion.div className="card card-p" style={{ width: 260, flexShrink: 0 }}
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}>
                      {selectedDoc?._type === 'node' ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                          <span className={`badge ${({TECHNOLOGY: 'badge-purple', ORGANIZATION: 'badge-blue', CONCEPT: 'badge-green', METRIC: 'badge-amber', PERSON: 'badge-red', LOCATION: 'badge-blue'}[selectedDoc.type] || 'badge-slate')}`}>{selectedDoc.type}</span>
                          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: '12px 0 16px', wordBreak: 'break-word' }}>{selectedDoc.label}</h3>
                          <div className="divider" style={{ marginBottom: 14 }} />
                          {[['PageRank', selectedDoc.pagerank, 'var(--a)'], ['Degree Centrality', selectedDoc.degree_centrality, 'var(--ok)'], ['Frequency', selectedDoc.frequency, 'var(--amber)']].map(([k, v, c]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--b1)', fontSize: 12.5 }}>
                              <span style={{ color: 'var(--ink2)' }}>{k}</span>
                              <span style={{ color: c, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v ?? '—'}</span>
                            </div>
                          ))}
                          <button onClick={() => setSelectedDoc(null)} className="btn btn-ghost" style={{ width: '100%', marginTop: 14, fontSize: 12.5, justifyContent: 'center' }}><X size={13} /> Deselect</button>
                        </motion.div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 14, fontSize: 13 }}>Entity Types</div>
                          {[['ORGANIZATION', '#3b82f6'], ['TECHNOLOGY', '#8b5cf6'], ['CONCEPT', '#10b981'], ['METRIC', '#f59e0b'], ['PERSON', '#ec4899'], ['LOCATION', '#06b6d4']].map(([t, c]) => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--b1)' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}60` }} />
                              <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{t}</span>
                            </div>
                          ))}
                          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 14, lineHeight: 1.65 }}>Click any node on the canvas to inspect its centrality metrics and PageRank score.</p>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Top entities from API */}
                  {topEntities.length > 0 && (
                    <motion.div className="card card-p" style={{ marginTop: 18 }}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <div className="section-header">
                        <div className="section-title">Top Entities by PageRank</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {topEntities.slice(0, 8).map(n => {
                          const col = ENTITY_TYPE_COLORS[n.type] || '#4f46e5';
                          return (
                            <motion.div key={n.id || n.label} whileHover={{ y: -3, boxShadow: 'var(--s3)' }}
                              style={{ padding: '10px 12px', background: `${col}08`, border: `1px solid ${col}20`, borderRadius: 10, cursor: 'pointer' }}
                              onClick={() => setSelectedDoc({ _type: 'node', ...n })}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.label}</div>
                              <div style={{ fontSize: 10, color: col, fontWeight: 600 }}>{n.type}</div>
                              <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>PR: {n.pagerank}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ================================================
                  DOCUMENTS
                  ================================================ */}
              {tab === 'documents' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={FileText} color="var(--a)" title="Document Library"
                    sub={`${docs.length} documents · ${vecChunks} indexed chunks`}
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
                  <motion.label className="card" whileHover={{ borderColor: 'var(--a-border)', background: 'rgba(79,70,229,0.02)' }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 22, borderStyle: 'dashed', borderColor: 'var(--b2)', textAlign: 'center', background: 'white', transition: 'all 0.25s' }}>
                    <motion.div animate={{ y: uploading ? 0 : [0, -7, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ padding: 16, borderRadius: 16, background: 'var(--a-soft)', border: '1px solid var(--a-border)', marginBottom: 14 }}>
                      {uploading ? <Spinner size={26} /> : <Upload size={26} color="var(--a)" />}
                    </motion.div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}>{uploading ? 'Processing document…' : 'Drop file or click to upload'}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>PDF · DOCX · XLSX · TXT · Markdown</div>
                    <input type="file" onChange={doUpload} disabled={uploading} style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
                  </motion.label>

                  {/* Ingestion live terminal */}
                  <AnimatePresence>
                    {ingLogs.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="ing-log" style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: ingDone ? 'var(--ok)' : 'var(--a)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {ingDone ? <CheckCircle2 size={12} /> : <Spinner size={12} />}
                          {ingDone ? 'Ingestion Complete' : 'Live Pipeline Processing'}
                          {ingDocId && <span style={{ color: 'var(--ink3)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{ingDocId.slice(0, 8)}…</span>}
                        </div>
                        {ingLogs.map((log, i) => (
                          <div key={i} className="ing-log-line">
                            <span className="t-time">{log.timestamp?.slice(11, 19)}</span>
                            <span className={`ing-dot ${log.status === 'COMPLETED' ? 'done' : 'active'}`} />
                            <span style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>[{log.step}/{log.total_steps}]</span>
                            <span style={{ fontSize: 11.5, color: log.status === 'COMPLETED' ? 'var(--ok)' : 'var(--ink2)' }}>{log.message}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink3)', marginBottom: 10 }}>
                    Indexed Documents ({docs.length})
                  </div>
                  {docs.length === 0
                    ? <EmptyState icon={Inbox} message="No documents yet. Upload a file above or seed demo enterprise data." action={
                      <button className="btn btn-ghost" onClick={seed} disabled={seeding}>{seeding ? <Spinner size={13} /> : <Sparkles size={13} />} Seed Demo Data</button>
                    } />
                    : docs.map((doc, idx) => (
                      <motion.div key={doc.document_id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ y: -2, boxShadow: 'var(--s4)', borderColor: 'var(--b2)' }}
                        className="card"
                        style={{ padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: selectedDoc?.document_id === doc.document_id ? 'rgba(79,70,229,0.03)' : 'white', borderColor: selectedDoc?.document_id === doc.document_id ? 'var(--a-border)' : 'var(--b1)' }}
                        onClick={() => setSelectedDoc(doc)}>
                        <div className="doc-thumb"
                          style={{ background: doc.file_type === '.pdf' ? 'rgba(239,68,68,0.10)' : doc.file_type === '.docx' ? 'rgba(59,130,246,0.10)' : 'rgba(79,70,229,0.10)', color: doc.file_type === '.pdf' ? '#ef4444' : doc.file_type === '.docx' ? '#3b82f6' : '#4f46e5', width: 44, height: 50 }}>
                          {(doc.file_type?.replace('.', '') || 'DOC').toUpperCase().slice(0, 4)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                          <div style={{ marginTop: 5, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{doc.chunk_count} chunks</span>
                            <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{doc.page_count} pages</span>
                            <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            {doc.department && <span className="badge badge-indigo" style={{ fontSize: 9.5 }}>{doc.department}</span>}
                            {doc.tags && <span className="badge badge-slate" style={{ fontSize: 9.5 }}>{doc.tags}</span>}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>{new Date(doc.upload_timestamp).toLocaleDateString()}</div>
                          <button onClick={(e) => { e.stopPropagation(); setQuery(`Summarize ${doc.filename}`); setTab('retrieval'); }}
                            className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 11 }}>
                            <Search size={11} /> Ask
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}

              {/* ================================================
                  VERIFICATION
                  ================================================ */}
              {tab === 'verification' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={ShieldCheck} color="var(--ok)" title="Multi-Agent AI Verifier"
                    sub="Fact-Checker · Citation Auditor · Hallucination Risk Guard · Trust Score Engine" />
                  {queryRes?.multi_agent_report ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}
                        variants={stagger} initial="hidden" animate="show">
                        {[
                          { icon: Shield, label: 'Trust Score', value: `${queryRes.multi_agent_report.trust_score}%`, col: '#10b981' },
                          { icon: CheckCircle2, label: 'Grounding Score', value: `${queryRes.multi_agent_report.grounding_score}%`, col: '#4f46e5' },
                          { icon: AlertTriangle, label: 'Hallucination Risk', value: queryRes.multi_agent_report.hallucination_risk, col: queryRes.multi_agent_report.hallucination_risk === 'LOW' ? '#10b981' : queryRes.multi_agent_report.hallucination_risk === 'MEDIUM' ? '#f59e0b' : '#ef4444' },
                        ].map(({ icon: I, label, value, col }) => (
                          <motion.div key={label} variants={fadeUp}
                            whileHover={{ y: -4, scale: 1.02 }}
                            style={{ background: `${col}08`, border: `1px solid ${col}22`, borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: `0 4px 20px ${col}10` }}>
                            <I size={22} color={col} style={{ margin: '0 auto 10px', display: 'block' }} />
                            <div style={{ fontSize: 24, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{value}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600, marginTop: 6 }}>{label}</div>
                          </motion.div>
                        ))}
                      </motion.div>

                      {/* Agent Verdict */}
                      {queryRes.multi_agent_report.agent_verdict && (
                        <motion.div className="card card-p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Cpu size={15} color="var(--a)" />
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Agent Collective Verdict</div>
                          </div>
                          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.75 }}>{queryRes.multi_agent_report.agent_verdict}</p>
                        </motion.div>
                      )}

                      {/* Knowledge Graph Triples w/ Confidence */}
                      {queryRes?.graph_context?.triples_summary?.length > 0 && (
                        <motion.div className="card card-p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <Network size={15} color="var(--ok)" />
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Knowledge Graph Evidence Triples</div>
                            <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: 10 }}>
                              {queryRes.graph_context.triples_summary.length} triples
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {queryRes.graph_context.triples_summary.slice(0, 8).map((t, i) => {
                              const conf = typeof t.confidence === 'number' ? t.confidence : 0.65;
                              const confPct = Math.round(conf * 100);
                              const col = conf >= 0.80 ? '#10b981' : conf >= 0.65 ? '#6366f1' : '#f59e0b';
                              return (
                                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                  style={{ padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12.5 }}>
                                      <span style={{ fontWeight: 700, color: 'var(--ink)', background: 'rgba(99,102,241,0.10)', padding: '2px 8px', borderRadius: 6 }}>{t.subject}</span>
                                      <span style={{ color: col, fontWeight: 600, fontStyle: 'italic', fontSize: 11.5 }}>— {t.predicate} →</span>
                                      <span style={{ fontWeight: 700, color: 'var(--ink)', background: 'rgba(16,185,129,0.10)', padding: '2px 8px', borderRadius: 6 }}>{t.object}</span>
                                    </div>
                                  </div>
                                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 80 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)' }}>{confPct}%</div>
                                    <div style={{ height: 4, borderRadius: 99, background: 'var(--b2)', marginTop: 4, width: 80 }}>
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${confPct}%` }} transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                        style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${col}, ${col}cc)`, boxShadow: `0 0 6px ${col}60` }} />
                                    </div>
                                    <div style={{ fontSize: 9.5, color: 'var(--ink3)', marginTop: 2 }}>confidence</div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* Claims verification */}
                      {(queryRes.multi_agent_report.claims_verification || []).length > 0 && (
                        <motion.div className="card card-p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Sentence-Level Fact Audit</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(queryRes.multi_agent_report.claims_verification || []).map((c, i) => (
                              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                style={{ padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{c.claim}</span>
                                <span className={`badge ${c.status === 'VERIFIED' ? 'badge-green' : c.status === 'PARTIAL' ? 'badge-amber' : 'badge-red'}`}>
                                  {c.status} ({c.grounding_score}%)
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <EmptyState icon={ShieldCheck} message="Run a query in Retrieval Studio to see live multi-agent verification, trust scoring, and sentence-level fact audit." action={
                      <button className="btn btn-primary" onClick={() => setTab('retrieval')}><Search size={14} /> Go to Retrieval Studio</button>
                    } />
                  )}
                </div>
              )}


              {/* ================================================
                  AI AGENTS
                  ================================================ */}
              {tab === 'agents' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={Cpu} color="var(--purple)" title="AI Agent Pipeline"
                    sub="Autonomous agents collaborating to verify, cite and audit your knowledge" />
                  <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}
                    variants={stagger} initial="hidden" animate="show">
                    {[
                      { icon: ShieldCheck, color: '#10b981', title: 'Fact-Checker Agent', status: 'OPERATIONAL', desc: 'Verifies each claim sentence against retrieved document chunks and graph relations, computing a per-sentence grounding score.', metrics: [['Threshold', '65%'], ['Method', 'Token Overlap + Semantic'], ['Sentences Checked', queryRes?.multi_agent_report?.claims_verification?.length || 0]] },
                      { icon: Hash, color: '#4f46e5', title: 'Citation Auditor', status: 'OPERATIONAL', desc: 'Audits citation markers in generated responses against the actual retrieved chunk IDs and computes citation accuracy.', metrics: [['Accuracy', `${queryRes?.multi_agent_report?.citation_accuracy || 0}%`], ['Marker Format', '[Source:ID]'], ['Blocks Audited', blockHeight]] },
                      { icon: AlertTriangle, color: '#f59e0b', title: 'Hallucination Guard', status: 'OPERATIONAL', desc: 'Combines grounding and citation scores using a weighted formula to produce composite Trust Score and Risk classification.', metrics: [['Formula', '0.7 × Ground + 0.3 × Cite'], ['Risk Levels', 'LOW / MEDIUM / HIGH'], ['Last Trust Score', queryRes ? `${queryRes.trust_score}%` : 'N/A']] },
                    ].map(({ icon: I, color, title, status, desc, metrics }) => (
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
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 9 }}>
                          <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
                            style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 0 3px ${color}28` }} />
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink2)' }}>Agent {status}</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Live telemetry from verifier */}
                  {telemetry?.multi_agent_verifier && (
                    <motion.div className="card card-p" style={{ marginTop: 20 }}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Live Verifier Telemetry</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                        {Object.entries(telemetry.multi_agent_verifier).map(([k, v]) => (
                          <div key={k} style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ color: 'var(--ink3)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                            <span style={{ fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ================================================
                  BLOCKCHAIN LEDGER
                  ================================================ */}
              {tab === 'blockchain' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <PageHeader icon={Lock} color="var(--amber)" title="Blockchain Audit Ledger"
                    sub="SHA-256 Merkle Proof of Existence — tamper-proof transaction audit trail"
                    action={
                      <div style={{ display: 'flex', gap: 8 }}>
                        <motion.button className="btn btn-ghost btn-sm" onClick={refresh} whileHover={{ scale: 1.03 }}><RefreshCw size={13} /> Refresh</motion.button>
                        <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={async () => {
                            const r = await api.get('/api/verify-audit');
                            if (r) alert(`Chain: ${r.status}\n${r.message}\nBlocks: ${r.chain_length}\nLatest Hash: ${r.latest_block_hash?.slice(0, 32)}…`);
                          }}>
                          <ShieldCheck size={14} /> Verify Integrity
                        </motion.button>
                      </div>
                    } />

                  <motion.div className="card card-p" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Hash size={18} color="var(--purple)" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>SHA-256 Merkle Chain</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>Height: #{ledger.blocks?.length || 0} Blocks · {ledger.blocks?.reduce((a, b) => a + (b.transaction_count || 0), 0)} Total Transactions</div>
                      </div>
                    </div>
                    <span className={`badge ${ledger.chain_integrity?.valid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 11, padding: '4px 12px' }}>
                      {ledger.chain_integrity?.valid ? '✓ CHAIN INTACT' : '✗ COMPROMISED'}
                    </span>
                  </motion.div>

                  {ledger.blocks?.length === 0
                    ? <EmptyState icon={Lock} message="No blockchain blocks yet. Upload documents or run queries to create audit records." action={<button className="btn btn-ghost" onClick={seed} disabled={seeding}>{seeding ? <Spinner size={13} /> : <Sparkles size={13} />} Seed Demo</button>} />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[...(ledger.blocks || [])].reverse().map((b, idx) => (
                          <motion.div key={b.index} className="block-card"
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            whileHover={{ y: -3, borderColor: 'rgba(139,92,246,0.25)', boxShadow: '0 12px 36px rgba(139,92,246,0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Lock size={13} color="var(--purple)" />
                                </div>
                                <span className="block-number">BLOCK #{b.index}</span>
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>{b.timestamp?.slice(0, 19)?.replace('T', ' ')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {[['Block Hash', b.hash, 'var(--a)'], ['Merkle Root', b.merkle_root, 'var(--purple)'], ['Prev Hash', b.previous_hash, 'var(--ink3)']].map(([lbl, val, col]) => (
                                <div key={lbl} style={{ fontSize: 11, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--ink3)', fontWeight: 600, minWidth: 76 }}>{lbl}:</span>
                                  <span style={{ fontFamily: 'var(--font-mono)', color: col, wordBreak: 'break-all' }}>{val}</span>
                                </div>
                              ))}
                              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Transactions: <strong style={{ color: 'var(--ink)' }}>{b.transaction_count}</strong></div>
                            </div>
                            {b.data?.length > 0 && (
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--b1)' }}>
                                {b.data.slice(0, 3).map((tx, ti) => (
                                  <div key={ti} style={{ fontSize: 10.5, color: 'var(--ink3)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                                    <span style={{ color: 'var(--a)' }}>[{tx.event_type}]</span> {tx.tx_id?.slice(0, 20)}… · {tx.timestamp?.slice(0, 19)?.replace('T', ' ')}
                                  </div>
                                ))}
                                {b.data.length > 3 && <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>+ {b.data.length - 3} more transactions</div>}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* ================================================
                  SYSTEM TELEMETRY
                  ================================================ */}
              {tab === 'telemetry' && (
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                  <PageHeader icon={Activity} color="var(--a)" title="System Telemetry"
                    sub="Live diagnostics — vector store, graph engine, BM25 index, blockchain ledger, multi-agent verifier"
                    action={<motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} onClick={refresh}><RefreshCw size={13} /> Refresh</motion.button>} />
                  {telemetry ? (
                    <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}
                      variants={stagger} initial="hidden" animate="show">
                      {Object.entries(telemetry).filter(([k]) => k !== 'timestamp').map(([key, data]) => {
                        const icons = { qdrant_vector_store: [Database, '#4f46e5'], knowledge_graph: [Network, '#10b981'], bm25_keyword_store: [Search, '#0891b2'], blockchain_audit_ledger: [Lock, '#f59e0b'], multi_agent_verifier: [Shield, '#8b5cf6'] };
                        const [I, color] = icons[key] || [Activity, '#4f46e5'];
                        return (
                          <motion.div key={key} variants={fadeUp} className="telemetry-card"
                            whileHover={{ y: -3, borderColor: `${color}30` }}
                            style={{ borderTop: `2px solid ${color}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <I size={16} color={color} />
                              </div>
                              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', textTransform: 'capitalize' }}>
                                {key.replace(/_/g, ' ')}
                              </h3>
                            </div>
                            {typeof data === 'object' && !Array.isArray(data)
                              ? Object.entries(data).map(([k, v]) => (
                                <div key={k} className="telemetry-row">
                                  <span className="telemetry-key">{k.replace(/_/g, ' ')}</span>
                                  <span className="telemetry-val">
                                    {Array.isArray(v)
                                      ? v.map(e => typeof e === 'object' ? e.label || JSON.stringify(e) : String(e)).join(', ')
                                      : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                </div>
                              ))
                              : <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{String(data)}</span>}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <EmptyState icon={Activity} message="Loading telemetry data from all system components…" />
                  )}
                  {telemetry?.timestamp && (
                    <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink3)', marginTop: 16, fontFamily: 'var(--font-mono)' }}>
                      Last snapshot: {telemetry.timestamp?.replace('T', ' ')?.slice(0, 19)} UTC
                    </div>
                  )}
                </div>
              )}

              {/* ================================================
                  HISTORY
                  ================================================ */}
              {tab === 'history' && (
                <div style={{ maxWidth: 860, margin: '0 auto' }}>
                  <PageHeader icon={Clock} color="var(--purple)" title="Query History"
                    sub={`${history.length} past queries · Avg trust score: ${analytics?.avg_trust_score?.toFixed(1) || 0}% · Avg latency: ${analytics?.avg_latency_ms?.toFixed(0) || 0} ms`} />
                  {history.length === 0
                    ? <EmptyState icon={Clock} message="No query history yet. Run your first question in Retrieval Studio." action={<button className="btn btn-primary" onClick={() => setTab('retrieval')}><Search size={14} /> Go to Retrieval Studio</button>} />
                    : history.map((h, idx) => (
                      <motion.div key={h.id}
                        className="history-row"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => { setQuery(h.query); setTab('retrieval'); }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--a-soft)', border: '1px solid var(--a-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Search size={15} color="var(--a)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.query}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.answer}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <span className={`badge ${h.trust_score >= 80 ? 'badge-green' : h.trust_score >= 60 ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 10 }}>
                            {h.trust_score}%
                          </span>
                          <RiskBadge risk={h.hallucination_risk} />
                          <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                            {new Date(h.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── RIGHT INTELLIGENCE PANEL ──────────────────────── */}
        <AnimatePresence>
          {(tab === 'workspace' || tab === 'retrieval' || tab === 'documents') && (
            <motion.aside className="right-panel"
              initial={{ width: 0, opacity: 0 }} animate={{ width: 'var(--rpanel-w)', opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <div className="right-panel-inner">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Sparkles size={14} color="var(--a)" />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Document Intelligence</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                    {selectedDoc?._type !== 'node' && selectedDoc ? `Viewing: ${selectedDoc.filename}` : 'Select a document to inspect.'}
                  </div>
                </div>

                {/* Selected Document Card */}
                {selectedDoc && selectedDoc._type !== 'node' ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                      <div className="doc-thumb" style={{ background: selectedDoc.file_type === '.pdf' ? 'rgba(239,68,68,0.10)' : 'rgba(79,70,229,0.10)', color: selectedDoc.file_type === '.pdf' ? '#ef4444' : '#4f46e5', width: 38, height: 44, flexShrink: 0 }}>
                        {(selectedDoc.file_type?.replace('.', '') || 'DOC').toUpperCase().slice(0, 4)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedDoc.filename}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2 }}>{selectedDoc.page_count} pages · {selectedDoc.chunk_count} chunks</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{new Date(selectedDoc.upload_timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid var(--b1)' }}>
                      <button onClick={() => { setQuery(`Summarize the document ${selectedDoc.filename}`); setTab('retrieval'); }}
                        style={{ padding: '8px', fontSize: 11.5, fontWeight: 600, color: 'var(--a)', background: 'white', border: 'none', borderRight: '1px solid var(--b1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'var(--font-sans)' }}>
                        <Search size={12} /> Ask AI
                      </button>
                      <button onClick={() => setTab('graph')}
                        style={{ padding: '8px', fontSize: 11.5, fontWeight: 600, color: 'var(--ok)', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'var(--font-sans)' }}>
                        <Network size={12} /> Graph
                      </button>
                    </div>
                  </motion.div>
                ) : docs.length > 0 ? (
                  <div style={{ padding: '12px', background: 'var(--bg2)', border: '1px dashed var(--b2)', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600, marginBottom: 4 }}>Select a document</div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Click any doc in the library to inspect its details here</div>
                  </div>
                ) : (
                  <div style={{ padding: '14px', background: 'var(--bg2)', border: '1px dashed var(--b2)', borderRadius: 10, textAlign: 'center' }}>
                    <Upload size={18} color="var(--ink3)" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Upload documents to see intelligence</div>
                  </div>
                )}

                {/* Top entities from real graph data */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Top Entities</div>
                    {topEntities.length > 0 && <button className="section-link" style={{ fontSize: 11 }} onClick={() => setTab('graph')}>Graph →</button>}
                  </div>
                  {topEntities.length > 0 ? topEntities.slice(0, 6).map((ent, i) => {
                    const col = ENTITY_TYPE_COLORS[ent.type] || '#4f46e5';
                    return (
                      <motion.div key={ent.id || ent.label} className="entity-item"
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.06 }}
                        onClick={() => { setSelectedDoc({ _type: 'node', ...ent }); setTab('graph'); }}
                        style={{ cursor: 'pointer' }}>
                        <div className="entity-icon" style={{ background: `${col}12` }}>
                          <Network size={12} color={col} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="entity-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ent.label}</div>
                          <div className="entity-type" style={{ color: col }}>{ent.type}</div>
                        </div>
                        <div className="entity-refs" style={{ fontFamily: 'var(--font-mono)', color: col, fontWeight: 700 }}>PR:{ent.pagerank}</div>
                      </motion.div>
                    );
                  }) : (
                    <div style={{ fontSize: 12, color: 'var(--ink3)', padding: '8px 0' }}>
                      {graphNodes === 0 ? 'Upload docs to extract entities' : 'Loading entities…'}
                    </div>
                  )}
                </div>

                {/* Real relationships */}
                {topRelations.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Relationships ({graphEdges.toLocaleString()})</div>
                    </div>
                    {topRelations.slice(0, 4).map((rel, i) => (
                      <motion.div key={i} className="rel-item"
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.07 }}>
                        <span className="rel-node" style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rel.from}</span>
                        <span className="rel-arrow">→</span>
                        <span className="rel-node" style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rel.to}</span>
                        {rel.label && <span className="rel-pred">{rel.label}</span>}
                      </motion.div>
                    ))}
                    {graphEdges > 4 && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6, cursor: 'pointer', fontWeight: 600 }} onClick={() => setTab('graph')}>+ {graphEdges - 4} more →</div>}
                  </div>
                )}

                {/* Blockchain verification status */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Verification Status</div>
                  <div className="ver-status" style={{ marginBottom: 10 }}>
                    <motion.div className="ver-dot"
                      animate={ledger.chain_integrity?.valid ? { boxShadow: ['0 0 0 3px rgba(16,185,129,0.2)', '0 0 0 8px rgba(16,185,129,0.06)', '0 0 0 3px rgba(16,185,129,0.2)'] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ background: ledger.chain_integrity?.valid ? 'var(--ok)' : '#ef4444' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                        {ledger.chain_integrity?.valid ? 'Chain Integrity Valid' : 'Chain Integrity Error'}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2 }}>
                        Block #{blockHeight} · {ledger.blocks?.length || 0} records
                      </div>
                    </div>
                    <span className={`badge ${ledger.chain_integrity?.valid ? 'badge-green' : 'badge-red'}`}>{ledger.chain_integrity?.valid ? '✓' : '✗'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderTop: '1px solid var(--b1)' }}>
                    <Database size={13} color="var(--a)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Vector Store</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{vecChunks.toLocaleString()} chunks indexed</div>
                    </div>
                    <span className={`badge ${vecChunks > 0 ? 'badge-indigo' : 'badge-slate'}`}>{vecChunks > 0 ? 'Ready' : 'Empty'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderTop: '1px solid var(--b1)' }}>
                    <Activity size={13} color="var(--ok)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>System Status</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{health?.status || 'Connecting…'}</div>
                    </div>
                    <motion.div animate={{ scale: health?.status === 'HEALTHY' ? [1, 1.3, 1] : 1 }} transition={{ duration: 2, repeat: Infinity }}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: health?.status === 'HEALTHY' ? 'var(--ok)' : '#f59e0b', boxShadow: health?.status === 'HEALTHY' ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none' }} />
                  </div>
                </div>

                {/* Analytics panel */}
                {analytics && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Analytics</div>
                    {[
                      { label: 'Total Queries', value: analytics.total_queries, col: 'var(--a)' },
                      { label: 'Total Documents', value: analytics.total_documents, col: 'var(--ok)' },
                      { label: 'Avg Trust Score', value: `${analytics.avg_trust_score?.toFixed(1)}%`, col: '#f59e0b' },
                      { label: 'Avg Latency', value: `${analytics.avg_latency_ms?.toFixed(0)} ms`, col: 'var(--ink2)' },
                    ].map(({ label, value, col }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--b1)', fontSize: 12 }}>
                        <span style={{ color: 'var(--ink3)' }}>{label}</span>
                        <span style={{ fontWeight: 700, color: col, fontFamily: 'var(--font-mono)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
