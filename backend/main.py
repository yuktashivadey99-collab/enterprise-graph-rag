import os
import time
import json
import asyncio
import datetime
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from fastapi import (
    FastAPI, File, UploadFile, HTTPException, Depends,
    BackgroundTasks, status, Form, Request
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import config
from db.database import get_db, init_db
from db.models import User, Document, ChatHistory, QueryLog
from fastapi.security import OAuth2PasswordRequestForm
from auth.auth import (
    UserRegisterRequest, UserLoginRequest, TokenResponse, UserProfile,
    hash_password, verify_password, create_access_token,
    get_current_user, get_current_user_optional
)
from ingestion.document_processor import DocumentProcessor
from ingestion.chunker import TextChunker
from embeddings.vector_store import VectorStore
from search.keyword_store import KeywordStore
from graph.graph_engine import GraphEngineeringEngine
from retrieval.hybrid_engine import HybridRetrievalEngine
from verification.multi_agent import MultiAgentVerificationPipeline
from blockchain.ledger import BlockchainAuditLedger
from cache.cache import get_cached_response, set_cached_response, invalidate_all, get_cache_stats
from storage.file_store import LocalFileStore
from llm.llm_client import GeminiLLMClient

# ---- Initialize components ----
doc_processor = DocumentProcessor()
text_chunker = TextChunker(chunk_size=config.CHUNK_SIZE, overlap=config.CHUNK_OVERLAP)
vector_store = VectorStore()
keyword_store = KeywordStore()
graph_engine = GraphEngineeringEngine()
hybrid_engine = HybridRetrievalEngine(vector_store, keyword_store, graph_engine)
verification_pipeline = MultiAgentVerificationPipeline()
blockchain_ledger = BlockchainAuditLedger()
file_store = LocalFileStore()
llm_client = GeminiLLMClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler replacing deprecated on_event."""
    init_db()
    print(f"[Startup] {config.PROJECT_NAME} v{config.VERSION} is ready.")
    yield  # App runs here
    print("[Shutdown] Enterprise Graph-RAG Server shutting down.")


# ---- FastAPI App ----
app = FastAPI(
    title=config.PROJECT_NAME,
    version=config.VERSION,
    description="Enterprise-grade Hybrid Graph-RAG with Multi-Agent Verification, JWT Auth & Blockchain Audit Ledger.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class QueryRequest(BaseModel):
    query: str
    vector_weight: Optional[float] = 0.4
    keyword_weight: Optional[float] = 0.3
    graph_weight: Optional[float] = 0.3
    top_k: Optional[int] = 5
    department_filter: Optional[str] = None
    use_reranker: Optional[bool] = True
    use_cache: Optional[bool] = True


class SearchResponse(BaseModel):
    query: str
    answer: str
    trust_score: float
    hallucination_risk: str
    retrieved_chunks: List[Dict[str, Any]]
    graph_context: Dict[str, Any]
    multi_agent_report: Dict[str, Any]
    blockchain_seal: Dict[str, Any]
    from_cache: bool = False
    latency_ms: float = 0.0


# ==============================================================================
# PUBLIC ROUTES
# ==============================================================================

@app.get("/")
def read_root():
    return {
        "system": config.PROJECT_NAME,
        "version": config.VERSION,
        "status": "OPERATIONAL",
        "docs_url": "/docs"
    }


@app.get("/api/health")
def get_system_health():
    chain_integrity = blockchain_ledger.verify_chain_integrity()
    graph_stats = graph_engine.get_full_graph_visualization_data()["stats"]
    return {
        "status": "HEALTHY",
        "vector_store_chunks": vector_store.get_chunk_count(),
        "keyword_store_docs": keyword_store.doc_count,
        "knowledge_graph": graph_stats,
        "blockchain_height": len(blockchain_ledger.chain),
        "blockchain_integrity": chain_integrity["valid"],
        "latest_merkle_root": chain_integrity.get("merkle_root", ""),
        "cache": get_cache_stats(),
        "storage": file_store.get_storage_stats()
    }
@app.get("/api/system/telemetry")
def get_system_telemetry():
    """Return real-time under-the-hood telemetry logs for all platform components."""
    chain_integrity = blockchain_ledger.verify_chain_integrity()
    graph_data = graph_engine.get_full_graph_visualization_data()
    
    return {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "qdrant_vector_store": {
            "status": "OPERATIONAL",
            "storage_mode": "Embedded Local Persistence",
            "path": config.QDRANT_PATH,
            "collection": "enterprise_chunks",
            "vector_dimension": config.EMBEDDING_DIMENSION,
            "distance_metric": "Cosine",
            "indexed_chunks": vector_store.get_chunk_count(),
            "last_operation": "Vector similarity search using 384D all-MiniLM-L6-v2 embeddings"
        },
        "knowledge_graph": {
            "status": "OPERATIONAL",
            "engine": "NetworkX In-Memory + JSON Disk Persistence",
            "total_nodes": graph_data["stats"]["total_nodes"],
            "total_edges": graph_data["stats"]["total_edges"],
            "graph_density": graph_data["stats"]["graph_density"],
            "top_pagerank_entities": [
                {"label": n["label"], "type": n["type"], "pagerank": n["pagerank"]}
                for n in sorted(graph_data["nodes"], key=lambda x: x.get("pagerank", 0), reverse=True)[:5]
            ]
        },
        "bm25_keyword_store": {
            "status": "OPERATIONAL",
            "engine": "Custom BM25 + Pickle Serialization",
            "indexed_documents": keyword_store.doc_count,
            "vocabulary_size": len(keyword_store.inverted_index),
            "avg_doc_length": round(keyword_store.avg_doc_length, 2)
        },
        "blockchain_audit_ledger": {
            "status": "VALID" if chain_integrity["valid"] else "COMPROMISED",
            "block_height": len(blockchain_ledger.chain),
            "merkle_root": chain_integrity.get("merkle_root", ""),
            "latest_block_hash": blockchain_ledger.get_latest_block().hash,
            "total_audit_events": len(blockchain_ledger.chain)
        },
        "multi_agent_verifier": {
            "status": "OPERATIONAL",
            "agents": ["Fact-Checker Agent", "Citation Auditor", "Hallucination Risk Guard"],
            "trust_formula": "0.4 * Grounding + 0.3 * Citation + 0.3 * Graph Consistency"
        }
    }


# ==============================================================================
# AUTH ROUTES
# ==============================================================================

@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken.")

    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        department=req.department,
        role="user"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    username = None
    password = None

    # Check content-type header to support both JSON body and Form data
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            data = await request.json()
            username = data.get("username")
            password = data.get("password")
        except Exception:
            pass

    if not username or not password:
        try:
            form = await request.form()
            username = form.get("username")
            password = form.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required."
        )

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    token = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name
    )


@app.get("/auth/me", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        full_name=current_user.full_name,
        department=current_user.department,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


# ==============================================================================
# DOCUMENT INGESTION ROUTES
# ==============================================================================

INGESTION_LOGS: Dict[str, List[Dict[str, Any]]] = {}


def _log_progress(doc_id: str, step: int, total_steps: int, message: str, status: str = "IN_PROGRESS"):
    timestamp = datetime.datetime.utcnow().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "step": step,
        "total_steps": total_steps,
        "message": message,
        "status": status
    }
    if doc_id not in INGESTION_LOGS:
        INGESTION_LOGS[doc_id] = []
    INGESTION_LOGS[doc_id].append(log_entry)
    print(f"[{timestamp[11:19]}] [INGESTION {step}/{total_steps}] [{doc_id[:8]}] {message}")


def _process_document_task(
    doc_id: str,
    filename: str,
    content: bytes,
    department: str,
    tags: str,
    user_id: Optional[int]
):
    total_steps = 6
    _log_progress(doc_id, 1, total_steps, f"Extracting text from '{filename}' ({len(content)} bytes)...")
    doc_data = doc_processor.process_file(filename, content, department=department, tags=tags)
    doc_data["document_id"] = doc_id

    _log_progress(doc_id, 2, total_steps, f"Parsed {doc_data.get('page_count', 1)} page(s). Splitting into chunks...")
    chunks = text_chunker.chunk_document(doc_data)
    for chunk in chunks:
        chunk["department"] = department
        chunk["file_type"] = doc_data.get("file_type", "")

    _log_progress(doc_id, 3, total_steps, f"Generating 384D dense embeddings for {len(chunks)} chunk(s) & upserting into Qdrant...")
    vector_store.add_chunks(chunks)

    _log_progress(doc_id, 4, total_steps, f"Tokenizing & building BM25 inverted index for {len(chunks)} chunk(s)...")
    keyword_store.add_chunks(chunks)

    _log_progress(doc_id, 5, total_steps, f"Extracting entities & relationship triples for Knowledge Graph...")
    graph_engine.add_chunk_data(chunks)
    graph_engine.compute_graph_metrics()

    _log_progress(doc_id, 6, total_steps, f"Sealing document transaction into SHA-256 Merkle Blockchain Ledger...")
    blockchain_ledger.record_audit_event("DOCUMENT_INGESTION", {
        "document_id": doc_id,
        "filename": filename,
        "chunk_count": len(chunks),
        "department": department,
        "user_id": user_id
    })

    invalidate_all()
    _log_progress(doc_id, 6, total_steps, f"Ingestion COMPLETE! Indexed {len(chunks)} chunk(s) into Qdrant & Knowledge Graph.", status="COMPLETED")
    return doc_data, len(chunks)


@app.post("/api/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    department: str = Form(default=""),
    tags: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    try:
        content = await file.read()
        filename = file.filename

        doc_data = doc_processor.process_file(filename, content, department=department, tags=tags)
        file_store.save_file(doc_data["document_id"], filename, content)

        chunks_preview = text_chunker.chunk_document(doc_data)
        db_doc = Document(
            document_id=doc_data["document_id"],
            filename=filename,
            original_filename=filename,
            file_type=doc_data.get("file_type", ""),
            file_size=len(content),
            page_count=doc_data.get("page_count", 1),
            chunk_count=len(chunks_preview),
            department=department,
            tags=tags,
            uploaded_by_id=user_id
        )
        db.add(db_doc)
        await db.commit()

        background_tasks.add_task(
            _process_document_task,
            doc_data["document_id"], filename, content, department, tags, user_id
        )

        return {
            "status": "QUEUED",
            "message": f"Document '{filename}' processing started.",
            "document_id": doc_data["document_id"],
            "filename": filename,
            "chunks_estimated": len(chunks_preview),
            "department": department,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents/{document_id}/logs")
def get_ingestion_logs(document_id: str):
    logs = INGESTION_LOGS.get(document_id, [])
    return {
        "document_id": document_id,
        "logs": logs,
        "is_complete": any(l.get("status") == "COMPLETED" for l in logs)
    }


@app.get("/api/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    result = await db.execute(select(Document).order_by(Document.upload_timestamp.desc()))
    docs = result.scalars().all()
    return [
        {
            "document_id": d.document_id,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "page_count": d.page_count,
            "chunk_count": d.chunk_count,
            "department": d.department,
            "tags": d.tags,
            "upload_timestamp": d.upload_timestamp.isoformat()
        }
        for d in docs
    ]


# ==============================================================================
# QUERY ROUTES
# ==============================================================================

@app.post("/api/query", response_model=SearchResponse)
async def execute_hybrid_query(
    req: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    start_time = time.time()

    if vector_store.get_chunk_count() == 0 and keyword_store.doc_count == 0:
        print("[Query] Vector store empty. Auto-seeding enterprise demo data...")
        seed_demo_data()

    try:
        weights = {"v": req.vector_weight, "k": req.keyword_weight, "g": req.graph_weight}
        if req.use_cache:
            cached = get_cached_response(req.query, weights)
            if cached:
                cached["from_cache"] = True
                return SearchResponse(**cached)

        retrieval_result = hybrid_engine.retrieve(
            query=req.query,
            vector_weight=req.vector_weight,
            keyword_weight=req.keyword_weight,
            graph_weight=req.graph_weight,
            top_k=req.top_k,
            department_filter=req.department_filter or None,
            use_reranker=req.use_reranker
        )
        retrieved_chunks = retrieval_result["retrieved_chunks"]
        graph_ctx = retrieval_result["graph_context"]

        answer = llm_client.generate_answer(req.query, retrieved_chunks, graph_ctx)

        verification_report = verification_pipeline.run_verification(
            response_text=answer,
            retrieved_chunks=retrieved_chunks,
            graph_context=graph_ctx
        )

        chunk_ids = [c.get("chunk_id", c.get("id", f"chunk_{i}")) for i, c in enumerate(retrieved_chunks)]

        block_hash = blockchain_ledger.record_audit_event("HYBRID_QUERY_EXECUTION", {
            "query": req.query,
            "user_id": user_id,
            "trust_score": verification_report["trust_score"],
            "retrieved_chunk_ids": chunk_ids,
            "response_preview": answer[:100]
        })
        latest_block = blockchain_ledger.get_latest_block()

        latency_ms = round((time.time() - start_time) * 1000, 1)

        chat_record = ChatHistory(
            user_id=user_id,
            query=req.query,
            answer=answer,
            trust_score=verification_report["trust_score"],
            hallucination_risk=verification_report["hallucination_risk"],
            retrieved_chunk_ids=json.dumps(chunk_ids),
            blockchain_hash=block_hash
        )
        db.add(chat_record)

        query_log = QueryLog(
            user_id=user_id,
            query=req.query,
            vector_weight=req.vector_weight,
            keyword_weight=req.keyword_weight,
            graph_weight=req.graph_weight,
            top_k=req.top_k,
            chunks_retrieved=len(retrieved_chunks),
            trust_score=verification_report["trust_score"],
            latency_ms=latency_ms
        )
        db.add(query_log)
        await db.commit()

        response_data = {
            "query": req.query,
            "answer": answer,
            "trust_score": verification_report["trust_score"],
            "hallucination_risk": verification_report["hallucination_risk"],
            "retrieved_chunks": retrieved_chunks,
            "graph_context": graph_ctx,
            "multi_agent_report": verification_report,
            "blockchain_seal": {
                "block_index": latest_block.index,
                "block_hash": latest_block.hash,
                "merkle_root": latest_block.merkle_root,
                "timestamp": latest_block.timestamp
            },
            "from_cache": False,
            "latency_ms": latency_ms
        }

        if req.use_cache:
            set_cached_response(req.query, response_data, weights)

        return SearchResponse(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[Query Error] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")


@app.post("/api/query/stream")
async def stream_query(
    req: QueryRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    if vector_store.get_chunk_count() == 0 and keyword_store.doc_count == 0:
        print("[StreamQuery] Vector store empty. Auto-seeding enterprise demo data...")
        seed_demo_data()

    retrieval_result = hybrid_engine.retrieve(
        query=req.query,
        vector_weight=req.vector_weight,
        keyword_weight=req.keyword_weight,
        graph_weight=req.graph_weight,
        top_k=req.top_k,
        department_filter=req.department_filter or None,
        use_reranker=req.use_reranker
    )
    retrieved_chunks = retrieval_result["retrieved_chunks"]
    graph_ctx = retrieval_result["graph_context"]

    async def event_generator():
        meta = {
            "type": "metadata",
            "chunks_count": len(retrieved_chunks),
            "graph_nodes": len(graph_ctx.get("subgraph_nodes", []))
        }
        yield f"data: {json.dumps(meta)}\n\n"

        full_answer = ""
        async for token in llm_client.stream_answer(req.query, retrieved_chunks, graph_ctx):
            full_answer += token
            yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"

        user_id = current_user.id if current_user else None
        verification_report = verification_pipeline.run_verification(full_answer, retrieved_chunks, graph_ctx)
        blockchain_ledger.record_audit_event("STREAM_QUERY", {
            "query": req.query,
            "user_id": user_id,
            "trust_score": verification_report["trust_score"]
        })

        done_payload = {
            "type": "done",
            "trust_score": verification_report["trust_score"],
            "hallucination_risk": verification_report["hallucination_risk"],
            "agent_verdict": verification_report["agent_verdict"],
            "triples_summary": graph_ctx.get("triples_summary", [])
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )


# ==============================================================================
# CHAT HISTORY
# ==============================================================================

@app.get("/api/history")
async def get_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    stmt = select(ChatHistory).order_by(ChatHistory.timestamp.desc()).limit(50)
    if user_id:
        stmt = select(ChatHistory).where(ChatHistory.user_id == user_id).order_by(ChatHistory.timestamp.desc()).limit(50)
    result = await db.execute(stmt)
    history = result.scalars().all()
    return [
        {
            "id": h.id,
            "query": h.query,
            "answer": h.answer[:300] + "...",
            "trust_score": h.trust_score,
            "hallucination_risk": h.hallucination_risk,
            "timestamp": h.timestamp.isoformat()
        }
        for h in history
    ]


# ==============================================================================
# GRAPH & BLOCKCHAIN ROUTES
# ==============================================================================

@app.get("/api/graph/visualization")
def get_graph_data():
    return graph_engine.get_full_graph_visualization_data()


@app.get("/api/blockchain/ledger")
def get_blockchain_ledger():
    return {
        "chain_integrity": blockchain_ledger.verify_chain_integrity(),
        "blocks": blockchain_ledger.get_blocks()
    }


@app.get("/api/verify-audit")
def verify_audit_integrity():
    """Re-verify the full blockchain audit chain integrity on demand."""
    result = blockchain_ledger.verify_chain_integrity()
    return {
        "verified": result["valid"],
        "chain_length": result.get("chain_length", len(blockchain_ledger.chain)),
        "latest_block_hash": result.get("latest_block_hash", ""),
        "merkle_root": result.get("merkle_root", ""),
        "status": "TAMPER_PROOF" if result["valid"] else "COMPROMISED",
        "message": "All block hashes and Merkle roots verified successfully." if result["valid"]
                   else result.get("reason", "Chain integrity check failed.")
    }


@app.get("/api/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Return aggregate analytics for dashboard stats."""
    from sqlalchemy import func
    query_count = await db.execute(select(func.count()).select_from(QueryLog))
    doc_count = await db.execute(select(func.count()).select_from(Document))
    avg_trust = await db.execute(select(func.avg(QueryLog.trust_score)).select_from(QueryLog))
    avg_latency = await db.execute(select(func.avg(QueryLog.latency_ms)).select_from(QueryLog))
    return {
        "total_queries": query_count.scalar() or 0,
        "total_documents": doc_count.scalar() or 0,
        "avg_trust_score": round(avg_trust.scalar() or 0.0, 1),
        "avg_latency_ms": round(avg_latency.scalar() or 0.0, 1),
        "graph_nodes": len(graph_engine.graph.nodes),
        "graph_edges": len(graph_engine.graph.edges),
        "blockchain_blocks": len(blockchain_ledger.chain),
    }


# ==============================================================================
# DEMO SEED ROUTE
# ==============================================================================

@app.post("/api/seed_demo")
def seed_demo_data():
    sample_docs = [
        {
            "filename": "HR_Policy_2026.pdf",
            "department": "HR",
            "content": (
                "All permanent employees receive 24 casual leaves and 12 sick leaves per year. "
                "Managers approve leave requests within 48 hours. Parental leave policy grants 26 weeks to primary caregivers. "
                "HR Department manages all leave policies and compliance. "
                "The HR Manager reports to the Human Resources Director. "
                "Leave requires HR confirmation before approval is finalized. "
                "Employees belonging to the Finance Department follow separate expense policies."
            )
        },
        {
            "filename": "Enterprise_AI_Architecture_2026.pdf",
            "department": "Technology",
            "content": (
                "Acme Global Tech implements FastAPI Gateway and Apache Tika OCR pipeline for enterprise ingestion. "
                "The React Frontend communicates with FastAPI via WebSockets and REST APIs. "
                "Qdrant stores vector embeddings for semantic search. Elasticsearch handles BM25 keyword search. "
                "The Graph Engineering Engine extracts entities and builds an Enterprise Knowledge Graph. "
                "NetworkX powers PageRank centrality and subgraph neighborhood expansion. "
                "The Hybrid Retrieval Engine uses Reciprocal Rank Fusion to combine Graph, Vector, and Keyword retrieval. "
                "Multi-Agent Verification runs Fact Checker Agent and Citation Auditor to produce a Trust Score. "
                "All transactions are sealed into an SHA-256 Merkle Tree Blockchain Audit Ledger. "
                "Google Gemini generates AI-powered answers from retrieved enterprise context."
            )
        }
    ]

    total_chunks = 0
    for doc in sample_docs:
        doc_data = doc_processor.process_file(
            doc["filename"], doc["content"].encode(), department=doc["department"]
        )
        chunks = text_chunker.chunk_document(doc_data)
        for chunk in chunks:
            chunk["department"] = doc["department"]
        vector_store.add_chunks(chunks)
        keyword_store.add_chunks(chunks)
        graph_engine.add_chunk_data(chunks)
        blockchain_ledger.record_audit_event("DEMO_DATA_SEED", {
            "filename": doc["filename"],
            "chunk_count": len(chunks)
        })
        total_chunks += len(chunks)

    graph_engine.compute_graph_metrics()
    invalidate_all()

    return {
        "status": "DEMO_DATA_SEEDED",
        "documents_seeded": len(sample_docs),
        "chunks_indexed": total_chunks,
        "graph_nodes": len(graph_engine.graph.nodes),
        "graph_edges": len(graph_engine.graph.edges)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
