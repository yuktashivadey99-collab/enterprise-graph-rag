$lines = Get-Content 'App.jsx'
$before = $lines[0..622]   # lines 1-623 (0-indexed: 0-622)
$after  = $lines[732..]    # from line 733 onwards (0-indexed: 732+)

$newTopbarSidebar = @'
      {/* ── TOPBAR ─────────────────────────────────────────────── */}
      <header className="topbar">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <motion.button onClick={() => setSidebar(p => !p)}
            whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink2)', padding:'6px', borderRadius:8, display:'flex' }}>
            {sidebar ? <X size={18}/> : <Menu size={18}/>}
          </motion.button>
          <div className="topbar-logo">
            <motion.div className="logo-icon" whileHover={{ rotate:-6, scale:1.08 }}>
              <Network size={18} color="#fff"/>
            </motion.div>
            <div>
              <div className="topbar-title">Enterprise Graph-RAG</div>
              <div className="topbar-sub">AI Intelligence Platform</div>
            </div>
          </div>
        </div>

        {/* Search + Status */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, margin:'0 18px' }}>
          <div className="topbar-search">
            <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--ink3)', zIndex:1 }}/>
            <input type="text" placeholder="Search documents, queries, modules…"/>
            <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:10, fontFamily:'var(--font-mono)', padding:'2px 6px', borderRadius:4, background:'var(--bg2)', color:'var(--ink3)', border:'1px solid var(--b2)' }}>⌘K</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:99, background:'var(--surface)', border:'1px solid var(--b1)', fontSize:11.5, fontWeight:600, color:'var(--ok)', flexShrink:0, boxShadow:'var(--s1)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--ok)', animation:'pulse 2s ease infinite' }}/>
            System Healthy
          </div>
        </div>

        {/* Pills + Actions + User */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {[
            { i:Database, v:health?.vector_store_chunks||540,     l:'vectors', c:'var(--a)' },
            { i:Network,  v:health?.knowledge_graph?.total_nodes||2826, l:'nodes', c:'var(--ok)' },
            { i:Lock,     v:`#${health?.blockchain_height||1}`,   l:'blocks',  c:'var(--a3)' },
          ].map(({i:I,v,l,c}) => (
            <div key={l} className="stat-pill">
              <I size={12} color={c}/>
              <span className="stat-pill-val">{typeof v==='number' ? <CountUp to={v}/> : v}</span>
              <span>{l}</span>
            </div>
          ))}
          <div style={{ width:1, height:22, background:'var(--b2)', margin:'0 2px' }}/>
          <MagBtn onClick={seed} disabled={seeding} className="btn-primary"
            style={{ padding:'7px 15px', fontSize:12.5, borderRadius:10 }}>
            {seeding ? <Spinner size={13}/> : <Sparkles size={13}/>}
            Seed Demo
          </MagBtn>
          <motion.div whileHover={{ scale:1.04 }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 12px 5px 6px', background:'var(--surface)', border:'1px solid var(--b1)', borderRadius:99, boxShadow:'var(--s2)', cursor:'default' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--a3),var(--a2))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:800 }}>
              {user.username.slice(0,1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:700, color:'var(--ink)', lineHeight:1.2 }}>{user.username}</div>
              <div style={{ fontSize:9, color:'var(--ok)', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em' }}>Pro</div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div className="app-body">

        {/* SIDEBAR — Dribbble workspace style */}
        <aside className={`sidebar ${sidebar ? '' : 'collapsed'}`}>
          <div className="sidebar-inner">
            <div className="nav-section-label">Workspace</div>
            <nav style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {NAV.map(({ key, icon: Icon, label, badge }) => (
                <motion.button
                  key={key} onClick={() => setTab(key)}
                  className={`nav-item ${tab===key ? 'active' : ''}`}
                  whileHover={{ x:3 }} whileTap={{ scale:0.97 }}
                >
                  {tab===key && (
                    <motion.div layoutId="navPill"
                      style={{ position:'absolute', inset:0, borderRadius:'inherit', background:'var(--a-soft)', border:'1px solid var(--a-border)', zIndex:0 }}
                      transition={{ type:'spring', stiffness:500, damping:35 }}/>
                  )}
                  <Icon size={15} style={{ position:'relative', zIndex:1, flexShrink:0 }}/>
                  <span style={{ flex:1, position:'relative', zIndex:1 }}>{label}</span>
                  {badge && <span className="nav-badge" style={{ position:'relative', zIndex:1 }}>{badge}</span>}
                </motion.button>
              ))}
            </nav>

            {/* Quick Upload */}
            <div className="sidebar-divider" style={{ marginTop:'auto' }}/>
            <div className="nav-section-label">Quick Upload</div>
            <div className="sidebar-upload">
              <label className="sidebar-dropzone" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
                <div className="sidebar-dropzone-icon">
                  <Upload size={16} color="var(--a)"/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--a2)', textAlign:'center' }}>
                  {uploading ? 'Processing…' : 'Drop file to upload'}
                </div>
                <div style={{ fontSize:10, color:'var(--ink3)', fontWeight:400 }}>PDF · DOCX · TXT · CSV</div>
                <input type="file" onChange={doUpload} disabled={uploading} style={{ display:'none' }} accept=".pdf,.docx,.txt,.md,.xlsx,.csv"/>
              </label>
              <div className="step-progress">
                {[['Parse','Parse text'],['Chunk','Semantic chunks'],['Embed','384D vectors'],['Index','BM25 + Qdrant'],['Graph','Knowledge links']].map(([key,label],i) => (
                  <div key={key} className="step-row">
                    <div className={`step-dot ${ingLogs.length>i ? 'done' : ingDocId&&ingLogs.length===i ? 'active' : 'idle'}`}/>
                    <span style={{ color:ingLogs.length>i ? 'var(--ok)':'var(--ink3)', fontWeight:ingLogs.length>i?600:400 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <motion.button whileHover={{ x:3 }} whileTap={{ scale:0.96 }}
              onClick={() => { api.clear(); window.location.reload(); }}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:'var(--r-sm)', background:'none', border:'none', cursor:'pointer', color:'var(--ink3)', fontSize:12.5, fontWeight:600, fontFamily:'var(--font-sans)', width:'100%', marginTop:8 }}>
              <LogOut size={14}/> Sign Out
            </motion.button>
          </div>
        </aside>
'@

$combined = $before + $newTopbarSidebar.Split("`n") + $after
$combined | Set-Content 'App.jsx' -Encoding UTF8
Write-Host "Done. Total lines: $($combined.Count)"
