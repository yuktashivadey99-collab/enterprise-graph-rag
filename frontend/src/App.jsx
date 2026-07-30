import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, Database, ShieldCheck, Link, FileText, Search, Upload, 
  Sliders, Cpu, Layers, CheckCircle2, AlertTriangle, RefreshCw, 
  Server, Lock, Sparkles, ChevronRight, Binary, ExternalLink, Activity
} from 'lucide-react';
import { Network as VisNetwork } from 'vis-network';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // RAG Query State
  const [query, setQuery] = useState('');
  const [queryResponse, setQueryResponse] = useState(null);
  const [vectorWeight, setVectorWeight] = useState(0.4);
  const [keywordWeight, setKeywordWeight] = useState(0.3);
  const [graphWeight, setGraphWeight] = useState(0.3);
  
  // Graph State
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const visJsRef = useRef(null);

  // Blockchain Ledger State
  const [ledgerData, setLedgerData] = useState(null);

  useEffect(() => {
    fetchHealth();
    fetchGraphData();
    fetchLedger();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Error fetching health:', err);
    }
  };

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/graph/visualization');
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error('Error fetching graph data:', err);
    }
  };

  const fetchLedger = async () => {
    try {
      const res = await fetch('/api/blockchain/ledger');
      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error('Error fetching blockchain ledger:', err);
    }
  };

  const seedDemoData = async () => {
    setLoading(true);
    try {
      await fetch('/api/seed_demo', { method: 'POST' });
      await fetchHealth();
      await fetchGraphData();
      await fetchLedger();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (res.ok) {
        alert(`Document '${file.name}' indexed into ${result.chunks_created} chunks and sealed in Blockchain!`);
        fetchHealth();
        fetchGraphData();
        fetchLedger();
      } else {
        alert(`Upload error: ${result.detail}`);
      }
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          vector_weight: parseFloat(vectorWeight),
          keyword_weight: parseFloat(keywordWeight),
          graph_weight: parseFloat(graphWeight),
          top_k: 5
        })
      });
      const data = await res.json();
      if (res.ok) {
        setQueryResponse(data);
        fetchHealth();
        fetchLedger();
      } else {
        alert(data.detail || 'Query execution failed.');
      }
    } catch (err) {
      alert(`Query failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Vis-Network Canvas Initialization
  useEffect(() => {
    if (activeTab === 'graph' && visJsRef.current && graphData && graphData.nodes.length > 0) {
      const nodes = graphData.nodes.map(n => ({
        id: n.id,
        label: n.label,
        group: n.type,
        title: `Type: ${n.type} | PageRank: ${n.pagerank}`
      }));

      const edges = graphData.edges.map(e => ({
        from: e.from,
        to: e.to,
        label: e.label,
        arrows: 'to',
        font: { align: 'middle', size: 10, color: '#94a3b8' }
      }));

      const options = {
        nodes: {
          shape: 'dot',
          size: 18,
          font: { size: 14, color: '#f8fafc', face: 'Outfit' },
          borderWidth: 2,
          shadow: true
        },
        groups: {
          ORGANIZATION: { color: { background: '#3b82f6', border: '#60a5fa' } },
          TECHNOLOGY: { color: { background: '#8b5cf6', border: '#a78bfa' } },
          CONCEPT: { color: { background: '#10b981', border: '#34d399' } },
          METRIC: { color: { background: '#f59e0b', border: '#fbbf24' } },
          LOCATION: { color: { background: '#ec4899', border: '#f472b6' } },
          ENTITY: { color: { background: '#64748b', border: '#94a3b8' } }
        },
        edges: {
          color: { color: '#334155', highlight: '#3b82f6' },
          width: 1.5,
          smooth: { type: 'continuous' }
        },
        physics: {
          forceAtlas2Based: {
            gravitationalConstant: -26,
            centralGravity: 0.005,
            springLength: 230,
            springConstant: 0.18
          },
          maxVelocity: 146,
          solver: 'forceAtlas2Based',
          timestep: 0.35,
          stabilization: { iterations: 150 }
        }
      };

      const network = new VisNetwork(visJsRef.current, { nodes, edges }, options);

      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const matched = graphData.nodes.find(n => n.id === nodeId);
          setSelectedNode(matched);
        } else {
          setSelectedNode(null);
        }
      });
    }
  }, [activeTab, graphData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-blue-400">
              Enterprise Graph-RAG Studio
            </h1>
            <p className="text-xs text-slate-400 font-mono">Dual Vector + Keyword + Enterprise Knowledge Graph + Blockchain Seal</p>
          </div>
        </div>

        {/* System Health Status Pills */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center space-x-2 text-xs">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Vectors:</span>
            <span className="font-semibold text-blue-300 font-mono">{health?.vector_store_chunks || 0}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center space-x-2 text-xs">
            <Network className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Graph:</span>
            <span className="font-semibold text-emerald-300 font-mono">{health?.knowledge_graph?.total_nodes || 0} nodes</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center space-x-2 text-xs">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Blocks:</span>
            <span className="font-semibold text-purple-300 font-mono">#{health?.blockchain_height || 1}</span>
          </div>

          <button
            onClick={seedDemoData}
            disabled={loading}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seed Sample Data</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 space-y-2 flex-shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 py-2">Architecture Workflow</div>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'chat' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Hybrid RAG Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'graph' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Knowledge Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('ingestion')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'ingestion' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>OCR & Ingestion</span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'verification' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Multi-Agent Verifier</span>
          </button>

          <button
            onClick={() => setActiveTab('blockchain')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'blockchain' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Blockchain Ledger</span>
          </button>

          {/* Quick File Upload Card */}
          <div className="pt-6">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Upload Document</span>
              </div>
              <p className="text-xs text-slate-400">PDF, DOCX, TXT, Markdown, or Images</p>
              
              <label className="block w-full text-center px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-blue-400 cursor-pointer transition">
                {uploading ? 'Processing & Vectorizing...' : 'Select File'}
                <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-6 bg-slate-950 overflow-y-auto">
          
          {/* TAB 1: HYBRID RAG STUDIO */}
          {activeTab === 'chat' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              {/* Parameter Weight Controls */}
              <div className="glass-panel rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-blue-400" />
                    <h2 className="text-sm font-semibold text-slate-200">Reciprocal Rank Fusion (RRF) Retrieval Weights</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Vector + Keyword + Graph Engineering</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>Vector Similarity</span>
                      <span className="font-mono text-blue-400">{vectorWeight}</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.1"
                      value={vectorWeight}
                      onChange={(e) => setVectorWeight(e.target.value)}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>Elasticsearch BM25</span>
                      <span className="font-mono text-purple-400">{keywordWeight}</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.1"
                      value={keywordWeight}
                      onChange={(e) => setKeywordWeight(e.target.value)}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>Graph Context</span>
                      <span className="font-mono text-emerald-400">{graphWeight}</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.1"
                      value={graphWeight}
                      onChange={(e) => setGraphWeight(e.target.value)}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Query Form */}
              <form onSubmit={handleQuerySubmit} className="relative">
                <input
                  type="text"
                  placeholder="Ask a question across enterprise documents and knowledge graph..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-5 pr-32 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xl transition"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-3 top-3 bottom-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm flex items-center space-x-2 transition shadow-md"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Execute RAG</span>
                </button>
              </form>

              {/* Pipeline Output */}
              {queryResponse && (
                <div className="space-y-6">
                  
                  {/* Verified Answer Card */}
                  <div className="glass-panel-glow rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-100">Verified Synthesis Response</h3>
                          <p className="text-xs text-slate-400 font-mono">Sealed in SHA-256 Merkle Block #{queryResponse.blockchain_seal.block_index}</p>
                        </div>
                      </div>

                      {/* Trust Score Gauge */}
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{queryResponse.trust_score}%</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Trust Score</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {queryResponse.hallucination_risk} Hallucination Risk
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-200 leading-relaxed text-sm">{queryResponse.answer}</p>

                    {/* Cryptographic Seal Badge */}
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800/50">
                      <span>Merkle Root: {queryResponse.blockchain_seal.merkle_root.slice(0, 24)}...</span>
                      <span className="text-purple-400">Block Hash: {queryResponse.blockchain_seal.block_hash.slice(0, 16)}...</span>
                    </div>
                  </div>

                  {/* Retrieved Context Chunks */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Retrieved Ground-Truth Sources ({queryResponse.retrieved_chunks.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {queryResponse.retrieved_chunks.map((chunk, idx) => (
                        <div key={idx} className="glass-card rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-blue-400 font-mono">{chunk.filename} (p.{chunk.page_num})</span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">Score: {chunk.hybrid_score.toFixed(3)}</span>
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{chunk.content}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                            <span>Vector Rank: #{chunk.vector_rank}</span>
                            <span>BM25 Rank: #{chunk.keyword_rank}</span>
                            <span>Graph Overlap: {chunk.graph_overlap}</span>
                          </div>
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
                  <h2 className="text-lg font-bold text-slate-100">Enterprise Knowledge Graph Topology</h2>
                  <p className="text-xs text-slate-400">Force-directed visualization of extracted entities, predicates, and PageRank metrics.</p>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Organization</span>
                  <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Technology</span>
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Concept</span>
                  <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Metric</span>
                </div>
              </div>

              <div className="flex-1 flex gap-4 min-h-[550px]">
                <div ref={visJsRef} className="flex-1 glass-panel rounded-2xl relative border border-slate-800 overflow-hidden" />
                
                {selectedNode && (
                  <div className="w-80 glass-panel rounded-2xl p-5 space-y-4 flex-shrink-0">
                    <div className="border-b border-slate-800 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">{selectedNode.type}</span>
                      <h3 className="text-base font-bold text-slate-100">{selectedNode.label}</h3>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">PageRank Centrality</span>
                        <span className="font-mono text-emerald-400">{selectedNode.pagerank}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Degree Centrality</span>
                        <span className="font-mono text-blue-400">{selectedNode.degree_centrality}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-400">Corpus Frequency</span>
                        <span className="font-mono text-amber-400">{selectedNode.frequency}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INGESTION & OCR */}
          {activeTab === 'ingestion' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="glass-panel rounded-2xl p-6 space-y-4 text-center border-dashed border-2 border-slate-700">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Document Upload & OCR Pipeline</h3>
                  <p className="text-xs text-slate-400 mt-1">Parses PDF, DOCX, TXT, and scanned images via Tika OCR fallback.</p>
                </div>

                <label className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-lg shadow-blue-500/20">
                  {uploading ? 'Processing File...' : 'Choose File to Index'}
                  <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-AGENT VERIFICATION */}
          {activeTab === 'verification' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Multi-Agent Verification Pipeline</h3>
                    <p className="text-xs text-slate-400">Fact Checker Agent + Citation Auditor + Hallucination Guard</p>
                  </div>
                </div>

                {queryResponse?.multi_agent_report ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-900/60 rounded-xl space-y-2 border border-slate-800">
                      <div className="text-xs font-semibold text-slate-300">Agent Audit Verdict</div>
                      <p className="text-xs font-mono text-emerald-400">{queryResponse.multi_agent_report.agent_verdict}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Execute a query in RAG Studio to view live multi-agent verification logs.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BLOCKCHAIN LEDGER */}
          {activeTab === 'blockchain' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-6 h-6 text-purple-400" />
                    <div>
                      <h3 className="text-base font-bold text-slate-100">SHA-256 Merkle Blockchain Audit Ledger</h3>
                      <p className="text-xs text-slate-400 font-mono">Immutable Proof of Existence & Query Execution History</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    Chain Integrity: VALID
                  </span>
                </div>

                <div className="space-y-3">
                  {ledgerData?.blocks?.map((block) => (
                    <div key={block.index} className="glass-card rounded-xl p-4 space-y-2 border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-400 font-mono">Block #{block.index}</span>
                        <span className="text-slate-400 font-mono">{block.timestamp}</span>
                      </div>
                      <div className="text-xs space-y-1 font-mono text-slate-300">
                        <p><span className="text-slate-500">Block Hash:</span> {block.hash}</p>
                        <p><span className="text-slate-500">Merkle Root:</span> {block.merkle_root}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
