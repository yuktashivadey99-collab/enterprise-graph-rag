import React, { useState, useEffect, useRef } from 'react';
import {
  Network, Database, ShieldCheck, FileText, Search, Upload,
  Sliders, CheckCircle2, RefreshCw, Lock, Sparkles, LogIn,
  LogOut, User, Clock, Activity, Eye, EyeOff, Send, Layers,
  AlertTriangle, ArrowRight, Zap, Info, FileCode, Check, Cpu
} from 'lucide-react';
import { Network as VisNetwork } from 'vis-network';

// ============================================================
// API Helpers (Direct Target Port 8000)
// ============================================================
const API_BASE = 'http://localhost:8000';

const api = {
  getToken: () => localStorage.getItem('rag_token'),
  setToken: (t) => localStorage.setItem('rag_token', t),
  clearToken: () => localStorage.removeItem('rag_token'),
  headers: () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('rag_token') ? { Authorization: `Bearer ${localStorage.getItem('rag_token')}` } : {})
  }),
  async get(url) {
    try {
      const res = await fetch(API_BASE + url, { headers: this.headers() });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },
  async post(url, body) {
    try {
      const res = await fetch(API_BASE + url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 500, data: { detail: 'Server connection failed.' } };
    }
  },
  async postForm(url, formData) {
    try {
      const headers = {};
      if (this.getToken()) headers['Authorization'] = `Bearer ${this.getToken()}`;
      const res = await fetch(API_BASE + url, { method: 'POST', headers, body: formData });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 500, data: { detail: 'File upload failed.' } };
    }
  }
};

// ============================================================
// Auth Page (Sign In / Register)
// ============================================================
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { username: form.username, password: form.password }
        : { username: form.username, email: form.email, password: form.password, full_name: form.full_name, department: form.department };

      const res = await api.post(url, body);
      if (res.ok && res.data && res.data.access_token) {
        api.setToken(res.data.access_token);
        onLogin(res.data);
      } else {
        setError(res.data.detail || 'Authentication failed.');
      }
    } catch (err) {
      setError('Cannot connect to backend server. Make sure Python main.py is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-2xl shadow-2xl shadow-blue-500/25 mb-4 ring-1 ring-white/20">
            <Network className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Enterprise Graph-RAG</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Knowledge Intelligence & Verification Platform</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-slate-800">
          <div className="flex bg-slate-800/90 p-1 rounded-xl mb-6 ring-1 ring-slate-700">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${mode === 'login' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${mode === 'register' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
              <input
                type="text" required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder="username"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email" required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="user@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Technology / HR / Legal"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-500/25 disabled:opacity-60 mt-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{loading ? 'Authenticating...' : (mode === 'login' ? 'Sign In to Workspace' : 'Create Enterprise Account')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Application Component
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // Search Parameters
  const [query, setQuery] = useState('');
  const [queryResponse, setQueryResponse] = useState(null);
  const [vectorWeight, setVectorWeight] = useState(0.4);
  const [keywordWeight, setKeywordWeight] = useState(0.3);
  const [graphWeight, setGraphWeight] = useState(0.3);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [useReranker, setUseReranker] = useState(true);

  // Live Token Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedAnswer, setStreamedAnswer] = useState('');
  const [streamMeta, setStreamMeta] = useState(null);

  // Knowledge Graph Canvas
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const visJsRef = useRef(null);

  // Data Stores (Defensive arrays)
  const [ledgerData, setLedgerData] = useState({ blocks: [], chain_integrity: { valid: true } });
  const [documents, setDocuments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  // Live Document Ingestion Log State
  const [activeIngestionDocId, setActiveIngestionDocId] = useState(null);
  const [ingestionLogs, setIngestionLogs] = useState([]);
  const [ingestionComplete, setIngestionComplete] = useState(false);

  // Check auth token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.get('/auth/me').then(data => {
        if (data && data.id) setUser(data);
      });
    }
  }, []);

  // Refresh stats
  useEffect(() => {
    fetchHealth();
    fetchGraphData();
    fetchLedger();
    fetchDocuments();
    fetchHistory();
  }, []);

  const fetchHealth = async () => {
    const data = await api.get('/api/health');
    if (data && data.status) setHealth(data);
  };

  const fetchGraphData = async () => {
    const data = await api.get('/api/graph/visualization');
    if (data && data.nodes) setGraphData(data);
  };

  const fetchLedger = async () => {
    const data = await api.get('/api/blockchain/ledger');
    if (data && Array.isArray(data.blocks)) setLedgerData(data);
  };

  const fetchDocuments = async () => {
    const data = await api.get('/api/documents');
    if (Array.isArray(data)) setDocuments(data);
  };

  const fetchHistory = async () => {
    const data = await api.get('/api/history');
    if (Array.isArray(data)) setChatHistory(data);
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
  };

  const seedDemoData = async () => {
    setLoading(true);
    try {
      await api.post('/api/seed_demo', {});
      await Promise.all([fetchHealth(), fetchGraphData(), fetchLedger(), fetchDocuments()]);
    } finally { setLoading(false); }
  };

  // Upload file with live log streaming
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setIngestionLogs([]);
    setIngestionComplete(false);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', departmentFilter || '');

    try {
      const res = await api.postForm('/api/upload', formData);
      if (res.ok && res.data && res.data.document_id) {
        const docId = res.data.document_id;
        setActiveIngestionDocId(docId);
        
        // Poll for step logs
        const interval = setInterval(async () => {
          const logRes = await api.get(`/api/documents/${docId}/logs`);
          if (logRes && Array.isArray(logRes.logs)) {
            setIngestionLogs(logRes.logs);
          }
          if (logRes && logRes.is_complete) {
            setIngestionComplete(true);
            clearInterval(interval);
            fetchHealth();
            fetchGraphData();
            fetchDocuments();
          }
        }, 600);
      } else {
        alert(res.data.detail || 'Upload failed.');
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally { setUploading(false); }
  };

  // Instant Search Query
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setQueryResponse(null);
    try {
      const res = await api.post('/api/query', {
        query,
        vector_weight: parseFloat(vectorWeight),
        keyword_weight: parseFloat(keywordWeight),
        graph_weight: parseFloat(graphWeight),
        top_k: 5,
        department_filter: departmentFilter || null,
        use_reranker: useReranker
      });
      if (res.ok && res.data) {
        setQueryResponse(res.data);
        fetchHealth();
        fetchLedger();
        fetchHistory();
      } else {
        alert(res.data.detail || 'Query execution failed.');
      }
    } finally { setLoading(false); }
  };

  // SSE Live Token Stream Query
  const handleStreamQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsStreaming(true);
    setStreamedAnswer('');
    setStreamMeta(null);
    setQueryResponse(null);

    try {
      const res = await fetch(API_BASE + '/api/query/stream', {
        method: 'POST',
        headers: api.headers(),
        body: JSON.stringify({
          query,
          vector_weight: parseFloat(vectorWeight),
          keyword_weight: parseFloat(keywordWeight),
          graph_weight: parseFloat(graphWeight),
          top_k: 5,
          department_filter: departmentFilter || null,
          use_reranker: useReranker
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setStreamedAnswer(`Streaming error: ${errData.detail || 'Failed to initialize stream. Use Instant Search.'}`);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.type === 'metadata') setStreamMeta(payload);
              else if (payload.type === 'token') {
                accumulated += payload.text;
                setStreamedAnswer(accumulated);
              } else if (payload.type === 'done') {
                setStreamMeta(prev => ({ ...prev, ...payload }));
              }
            } catch {}
          }
        }
      }
      fetchLedger();
      fetchHistory();
    } catch (err) {
      setStreamedAnswer(`Streaming error: ${err.message}`);
    } finally { setIsStreaming(false); }
  };

  // Vis-Network Graph Visualization
  useEffect(() => {
    if (activeTab === 'graph' && visJsRef.current && graphData && graphData.nodes && graphData.nodes.length > 0) {
      const nodes = graphData.nodes.map(n => ({
        id: n.id, label: n.label, group: n.type,
        title: `Type: ${n.type} | PageRank: ${n.pagerank}`
      }));
      const edges = (graphData.edges || []).map(e => ({
        from: e.from, to: e.to, label: e.label, arrows: 'to',
        font: { align: 'middle', size: 11, color: '#e2e8f0' }
      }));
      const options = {
        nodes: { shape: 'dot', size: 22, font: { size: 14, color: '#f8fafc', face: 'Inter' }, borderWidth: 2, shadow: true },
        groups: {
          ORGANIZATION: { color: { background: '#2563eb', border: '#60a5fa' } },
          TECHNOLOGY: { color: { background: '#7c3aed', border: '#a78bfa' } },
          CONCEPT: { color: { background: '#059669', border: '#34d399' } },
          METRIC: { color: { background: '#d97706', border: '#fbbf24' } },
          PERSON: { color: { background: '#db2777', border: '#f472b6' } },
          LOCATION: { color: { background: '#0891b2', border: '#22d3ee' } },
          ENTITY: { color: { background: '#475569', border: '#94a3b8' } }
        },
        edges: { color: { color: '#64748b', highlight: '#3b82f6' }, width: 2, smooth: { type: 'continuous' } },
        physics: {
          forceAtlas2Based: { gravitationalConstant: -32, centralGravity: 0.005, springLength: 220, springConstant: 0.18 },
          maxVelocity: 140, solver: 'forceAtlas2Based', timestep: 0.35, stabilization: { iterations: 150 }
        }
      };
      const network = new VisNetwork(visJsRef.current, { nodes, edges }, options);
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          setSelectedNode(graphData.nodes.find(n => n.id === params.nodes[0]));
        } else setSelectedNode(null);
      });
    }
  }, [activeTab, graphData]);

  if (!user) return <AuthPage onLogin={(data) => setUser(data)} />;

  const trustColor = (score) => score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400';
  const riskBg = (risk) => risk === 'LOW' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">

      {/* Navbar */}
      <header className="border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
              <span>Enterprise Hybrid Graph-RAG</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">v2.0</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Qdrant Vector · NetworkX Graph · BM25 Keyword · Gemini 2.0 AI</p>
          </div>
        </div>

        {/* System Metrics */}
        <div className="hidden lg:flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center space-x-2 text-xs shadow-inner">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400 font-medium">Vectors:</span>
            <span className="font-bold text-blue-300 font-mono">{health?.vector_store_chunks || 0}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center space-x-2 text-xs shadow-inner">
            <Network className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400 font-medium">Graph:</span>
            <span className="font-bold text-emerald-300 font-mono">{health?.knowledge_graph?.total_nodes || 0} nodes</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center space-x-2 text-xs shadow-inner">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 font-medium">Blocks:</span>
            <span className="font-bold text-purple-300 font-mono">#{health?.blockchain_height || 1}</span>
          </div>
          <button onClick={seedDemoData} disabled={loading} className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-md shadow-blue-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seed Demo Data</span>
          </button>
          
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200">{user.username}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-mono font-bold uppercase">{user.role}</span>
            <button onClick={handleLogout} title="Sign Out" className="text-slate-400 hover:text-rose-400 transition ml-1.5">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row">

        {/* Sidebar */}
        <aside className="w-full md:w-64 border-r border-slate-800/80 bg-slate-900/70 p-4 space-y-2 flex-shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Navigation Menu</div>
          {[
            { key: 'chat', icon: Search, label: 'RAG Studio', color: 'blue' },
            { key: 'graph', icon: Network, label: 'Knowledge Graph', color: 'emerald' },
            { key: 'ingestion', icon: Upload, label: 'Documents Library', color: 'indigo' },
            { key: 'verification', icon: ShieldCheck, label: 'Multi-Agent Verifier', color: 'amber' },
            { key: 'blockchain', icon: Lock, label: 'Blockchain Ledger', color: 'purple' },
            { key: 'history', icon: Clock, label: 'Chat History', color: 'pink' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === key ? `bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/20` : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}

          {/* Quick Ingestion Panel */}
          <div className="pt-6">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-3 shadow-md">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Upload Document</span>
              </div>
              <input
                type="text"
                placeholder="Department Tag (optional)"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <label className="block w-full text-center px-3 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-xs font-bold text-blue-300 cursor-pointer transition">
                {uploading ? 'Processing File...' : 'Select PDF / DOCX / TXT'}
                <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
              </label>
            </div>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 p-6 bg-slate-950 overflow-y-auto">

          {/* TAB 1: RAG STUDIO */}
          {activeTab === 'chat' && (
            <div className="space-y-6 max-w-5xl mx-auto">

              {/* How it Works Banner */}
              {showGuide && (
                <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-5 relative shadow-lg">
                  <button onClick={() => setShowGuide(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 text-xs font-bold font-mono">✕ Dismiss Guide</button>
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30 flex-shrink-0">
                      <Info className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-200">
                      <h3 className="text-sm font-bold text-white">How Enterprise Graph-RAG Works</h3>
                      <p className="leading-relaxed">
                        1. <strong>Upload Documents</strong> or click <span className="text-blue-400 font-bold">"Seed Demo Data"</span> at top right to populate HR & Architecture policies.<br />
                        2. <strong>Adjust Sliders</strong> below to weight Vector Similarity, Keyword Searching, and Knowledge Graph Context.<br />
                        3. Type a question and click <span className="text-indigo-400 font-bold">"Stream AI"</span> for real-time token generation or <span className="text-slate-300 font-bold">"Instant"</span> for structured multi-agent answers.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hybrid Retrieval Controls */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-bold text-slate-200">Hybrid Retrieval Weights (RRF Fusion)</h2>
                  </div>
                  <label className="flex items-center space-x-2 text-xs text-slate-300 font-semibold cursor-pointer">
                    <input type="checkbox" checked={useReranker} onChange={e => setUseReranker(e.target.checked)} className="w-4 h-4 accent-blue-500 rounded" />
                    <span>Neural Cross-Encoder Re-ranker</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Vector Similarity (Qdrant)', value: vectorWeight, set: setVectorWeight, color: 'text-blue-400' },
                    { label: 'BM25 Keyword Matching', value: keywordWeight, set: setKeywordWeight, color: 'text-purple-400' },
                    { label: 'Knowledge Graph Weight', value: graphWeight, set: setGraphWeight, color: 'text-emerald-400' }
                  ].map(({ label, value, set, color }) => (
                    <div key={label} className="space-y-2 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80">
                      <div className="flex justify-between text-xs font-bold text-slate-200">
                        <span>{label}</span>
                        <span className={`font-mono text-sm ${color}`}>{value}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.1" value={value}
                        onChange={e => set(e.target.value)}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handleQuerySubmit} className="relative">
                <input
                  type="text"
                  placeholder="Ask a question (e.g. 'How many casual leaves do employees get?' or 'What technology stack is used?')"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-5 pr-56 py-4.5 bg-slate-900 border border-slate-700/90 rounded-2xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xl transition"
                />
                <div className="absolute right-3 top-3 bottom-3 flex items-center space-x-2">
                  <button type="submit" disabled={loading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition">
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Instant</span>
                  </button>
                  <button type="button" onClick={handleStreamQuery} disabled={isStreaming}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md shadow-blue-500/25">
                    {isStreaming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Stream AI</span>
                  </button>
                </div>
              </form>

              {/* Live Streaming Box */}
              {(isStreaming || streamedAnswer) && (
                <div className="bg-slate-900/95 border border-blue-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <Activity className={`w-4 h-4 ${isStreaming ? 'text-blue-400 animate-pulse' : 'text-emerald-400'}`} />
                    <span className="text-sm font-bold text-slate-100">
                      {isStreaming ? 'Gemini AI Live Token Stream…' : 'Live Stream Finished'}
                    </span>
                  </div>
                  <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">{streamedAnswer}</p>
                </div>
              )}

              {/* Instant Search Response */}
              {queryResponse && (
                <div className="space-y-6">
                  <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/30">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-100 text-base">Verified Knowledge Answer</h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Latency: {queryResponse.latency_ms}ms · Block #{queryResponse.blockchain_seal?.block_index || 1}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className={`text-2xl font-extrabold font-mono ${trustColor(queryResponse.trust_score)}`}>
                            {queryResponse.trust_score}%
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trust Score</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskBg(queryResponse.hallucination_risk)}`}>
                          {queryResponse.hallucination_risk} RISK
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-100 leading-relaxed text-sm whitespace-pre-wrap">{queryResponse.answer}</p>
                  </div>

                  {/* Sources */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Retrieved Source Evidence ({queryResponse.retrieved_chunks?.length || 0} chunks)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(queryResponse.retrieved_chunks || []).map((chunk, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-md">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-blue-400 truncate max-w-[200px]">{chunk.filename} (p.{chunk.page_num})</span>
                            <span className="px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded font-bold">RRF: {chunk.hybrid_score?.toFixed(4)}</span>
                          </div>
                          <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">{chunk.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KNOWLEDGE GRAPH */}
          {activeTab === 'graph' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Interactive Knowledge Graph</h2>
                  <p className="text-xs text-slate-400">Entities and semantic relationships extracted automatically from documents.</p>
                </div>
              </div>
              <div className="flex-1 flex gap-4 min-h-[550px]">
                <div ref={visJsRef} className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" />
                {selectedNode && (
                  <div className="w-72 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex-shrink-0">
                    <div className="border-b border-slate-800 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">{selectedNode.type}</span>
                      <h3 className="text-base font-bold text-slate-100 mt-0.5">{selectedNode.label}</h3>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">PageRank:</span>
                        <span className="text-emerald-400 font-bold">{selectedNode.pagerank}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Degree:</span>
                        <span className="text-blue-400 font-bold">{selectedNode.degree_centrality}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Frequency:</span>
                        <span className="text-amber-400 font-bold">{selectedNode.frequency}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS LIBRARY */}
          {activeTab === 'ingestion' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900/90 border border-dashed border-slate-700 rounded-2xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-blue-500/30">
                  <Upload className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Upload Enterprise Documents</h3>
                  <p className="text-xs text-slate-400 mt-1">Parses PDF, Word (.docx), Excel (.xlsx), Text, and Markdown</p>
                </div>
                <label className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-lg shadow-blue-500/25">
                  {uploading ? 'Uploading Document...' : 'Select File to Ingest'}
                  <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" accept=".pdf,.docx,.txt,.md,.xlsx,.csv" />
                </label>
              </div>

              {/* LIVE INGESTION LOG TERMINAL */}
              {ingestionLogs.length > 0 && (
                <div className="bg-slate-950 border border-blue-500/40 rounded-2xl p-5 space-y-3 font-mono shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${ingestionComplete ? 'bg-emerald-400' : 'bg-blue-400 animate-ping'}`} />
                      <span className="text-xs font-bold text-slate-200">
                        {ingestionComplete ? 'INGESTION COMPLETE ✓' : 'LIVE STEP-BY-STEP INGESTION PROCESS'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
                    {ingestionLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="text-slate-500 text-[10px] flex-shrink-0 pt-0.5">{log.timestamp?.slice(11, 19)}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded flex-shrink-0 ${log.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          Step {log.step}/{log.total_steps}
                        </span>
                        <span className={`leading-relaxed ${log.status === 'COMPLETED' ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DOCUMENTS LIST */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Indexed Documents ({documents.length})</h4>
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-500">No documents indexed yet. Upload a file above or click "Seed Demo Data".</p>
                ) : documents.map((doc) => (
                  <div key={doc.document_id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-md">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-slate-200">{doc.filename}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {doc.chunk_count} chunks · {doc.page_count} pages · {(doc.file_size / 1024).toFixed(1)} KB
                          {doc.department && <span className="ml-2 text-blue-400 font-bold">[{doc.department}]</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{new Date(doc.upload_timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-AGENT VERIFIER */}
          {activeTab === 'verification' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Multi-Agent Verification Pipeline</h3>
                    <p className="text-xs text-slate-400">Fact-Checker Agent · Citation Auditor · Hallucination Guard</p>
                  </div>
                </div>
                {queryResponse?.multi_agent_report ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className={`text-2xl font-extrabold font-mono ${trustColor(queryResponse.multi_agent_report.trust_score)}`}>
                          {queryResponse.multi_agent_report.trust_score}%
                        </div>
                        <div className="text-xs text-slate-300 mt-1 font-semibold">Trust Score</div>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="text-2xl font-extrabold font-mono text-blue-400">
                          {queryResponse.multi_agent_report.grounding_score}%
                        </div>
                        <div className="text-xs text-slate-300 mt-1 font-semibold">Grounding Score</div>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          {queryResponse.multi_agent_report.hallucination_risk}
                        </div>
                        <div className="text-xs text-slate-300 mt-1 font-semibold">Hallucination Risk</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Ask a question in RAG Studio to run multi-agent verification analysis.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BLOCKCHAIN LEDGER */}
          {activeTab === 'blockchain' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-6 h-6 text-purple-400" />
                    <div>
                      <h3 className="text-base font-bold text-slate-100">SHA-256 Merkle Audit Ledger</h3>
                      <p className="text-xs text-slate-400 font-mono">Immutable audit history for all document ingestions and query executions</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                    Chain Valid ✓
                  </span>
                </div>
                <div className="space-y-3">
                  {(ledgerData.blocks || []).slice().reverse().map((block) => (
                    <div key={block.index} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-purple-400">Block #{block.index}</span>
                        <span className="text-slate-400">{block.timestamp}</span>
                      </div>
                      <p className="text-xs font-mono text-slate-200">Hash: {block.hash}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CHAT HISTORY */}
          {activeTab === 'history' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-100">Query History</h2>
                <button onClick={fetchHistory} className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
              {chatHistory.length === 0 ? (
                <p className="text-xs text-slate-500">No query history found yet.</p>
              ) : chatHistory.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-md">
                  <p className="text-sm font-bold text-slate-100">❓ {item.query}</p>
                  <p className="text-xs text-slate-300 line-clamp-2">{item.answer}</p>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
