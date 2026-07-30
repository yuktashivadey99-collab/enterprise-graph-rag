import os
import uvicorn
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import config
from ingestion.document_processor import DocumentProcessor
from ingestion.chunker import TextChunker
from embeddings.vector_store import VectorStore
from search.keyword_store import KeywordStore
from graph.graph_engine import GraphEngineeringEngine
from retrieval.hybrid_engine import HybridRetrievalEngine
from verification.multi_agent import MultiAgentVerificationPipeline
from blockchain.ledger import BlockchainAuditLedger

doc_processor = DocumentProcessor()
text_chunker = TextChunker(chunk_size=config.CHUNK_SIZE, overlap=config.CHUNK_OVERLAP)
vector_store = VectorStore()
keyword_store = KeywordStore()
graph_engine = GraphEngineeringEngine()
hybrid_engine = HybridRetrievalEngine(vector_store, keyword_store, graph_engine)
verification_pipeline = MultiAgentVerificationPipeline()
blockchain_ledger = BlockchainAuditLedger()

app = FastAPI(
    title=config.PROJECT_NAME,
    version=config.VERSION,
    description="Enterprise-grade Hybrid Graph-RAG System with Multi-Agent Verification & Blockchain Ledger."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    vector_weight: Optional[float] = 0.4
    keyword_weight: Optional[float] = 0.3
    graph_weight: Optional[float] = 0.3
    top_k: Optional[int] = 5

class SearchResponse(BaseModel):
    query: str
    answer: str
    trust_score: float
    hallucination_risk: str
    retrieved_chunks: List[Dict[str, Any]]
    graph_context: Dict[str, Any]
    multi_agent_report: Dict[str, Any]
    blockchain_seal: Dict[str, Any]


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
        "vector_store_chunks": len(vector_store.chunks),
        "keyword_store_docs": keyword_store.doc_count,
        "knowledge_graph": graph_stats,
        "blockchain_height": len(blockchain_ledger.chain),
        "blockchain_integrity": chain_integrity["valid"],
        "latest_merkle_root": chain_integrity.get("merkle_root", "")
    }

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename
        
        doc_data = doc_processor.process_file(filename, content)
        chunks = text_chunker.chunk_document(doc_data)
        
        vector_store.add_chunks(chunks)
        keyword_store.add_chunks(chunks)
        graph_engine.add_chunk_data(chunks)
        graph_engine.compute_graph_metrics()
        
        block_hash = blockchain_ledger.record_audit_event("DOCUMENT_INGESTION", {
            "document_id": doc_data["document_id"],
            "filename": filename,
            "chunk_count": len(chunks),
            "parser": doc_data["metadata"]["parser_used"]
        })
        
        return {
            "status": "SUCCESS",
            "document_id": doc_data["document_id"],
            "filename": filename,
            "chunks_created": len(chunks),
            "blockchain_block_hash": block_hash
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/query", response_model=SearchResponse)
def execute_hybrid_query(req: QueryRequest):
    if not vector_store.chunks:
        raise HTTPException(status_code=400, detail="No documents indexed in vector database. Please upload enterprise files first.")

    retrieval_result = hybrid_engine.retrieve(
        query=req.query,
        vector_weight=req.vector_weight,
        keyword_weight=req.keyword_weight,
        graph_weight=req.graph_weight,
        top_k=req.top_k
    )
    
    retrieved_chunks = retrieval_result["retrieved_chunks"]
    graph_ctx = retrieval_result["graph_context"]
    
    context_str = "\n".join([f"[{c['filename']} p.{c.get('page_num', 1)}]: {c['content']}" for c in retrieved_chunks])
    graph_str = graph_ctx.get("graph_context_text", "")
    
    if retrieved_chunks:
        top_chunk = retrieved_chunks[0]
        answer = (
            f"Based on enterprise document '{top_chunk['filename']}' (Page {top_chunk.get('page_num', 1)}) and Knowledge Graph relations: "
            f"{top_chunk['content'][:300]}... "
            f"Graph context confirms structural link across entities: {', '.join(graph_ctx['subgraph_nodes'][:5])}."
        )
    else:
        answer = "No sufficient context found in enterprise repository."

    verification_report = verification_pipeline.run_verification(
        response_text=answer,
        retrieved_chunks=retrieved_chunks,
        graph_context=graph_ctx
    )
    
    block_hash = blockchain_ledger.record_audit_event("HYBRID_QUERY_EXECUTION", {
        "query": req.query,
        "trust_score": verification_report["trust_score"],
        "retrieved_chunk_ids": [c["chunk_id"] for c in retrieved_chunks],
        "response_preview": answer[:100]
    })
    
    latest_block = blockchain_ledger.get_latest_block()
    
    return SearchResponse(
        query=req.query,
        answer=answer,
        trust_score=verification_report["trust_score"],
        hallucination_risk=verification_report["hallucination_risk"],
        retrieved_chunks=retrieved_chunks,
        graph_context=graph_ctx,
        multi_agent_report=verification_report,
        blockchain_seal={
            "block_index": latest_block.index,
            "block_hash": latest_block.hash,
            "merkle_root": latest_block.merkle_root,
            "timestamp": latest_block.timestamp
        }
    )


@app.get("/api/graph/visualization")
def get_graph_data():
    return graph_engine.get_full_graph_visualization_data()


@app.get("/api/blockchain/ledger")
def get_blockchain_ledger():
    return {
        "chain_integrity": blockchain_ledger.verify_chain_integrity(),
        "blocks": blockchain_ledger.get_blocks()
    }

@app.post("/api/seed_demo")
def seed_demo_data():
    sample_docs = [
        {
            "filename": "Enterprise_AI_Architecture_2026.pdf",
            "content": (
                "Acme Global Tech implements FastAPI Gateway and Apache Tika OCR pipeline for enterprise ingestion. "
                "The React Frontend communicates with FastAPI via WebSockets and REST APIs. "
                "Document chunking divides documents into 500 token sliding windows with 100 token overlap. "
                "The Embedding Model uses vector similarity to power semantic search. "
                "Dual storage combines Vector Database for semantic search with Elasticsearch BM25 for keyword search. "
                "The Graph Engineering Engine extracts named entities like Organizations, Technology, and Metrics to construct an Enterprise Knowledge Graph. "
                "NetworkX powers PageRank centrality and sub-graph neighborhood expansion. "
                "The Hybrid Retrieval Engine uses Reciprocal Rank Fusion (RRF) to combine Graph context, Vector similarity, and Keyword search. "
                "Multi-Agent Verification runs Fact Checker Agent, Citation Auditor Agent, and Hallucination Guard to produce an objective Trust Score. "
                "All prompt-response pairs and document hashes are sealed into an SHA-256 Merkle Tree Blockchain Audit Ledger."
            )
        }
    ]
    
    total_chunks = 0
    for doc in sample_docs:
        doc_data = doc_processor.process_file(doc["filename"], doc["content"].encode())
        chunks = text_chunker.chunk_document(doc_data)
        vector_store.add_chunks(chunks)
        keyword_store.add_chunks(chunks)
        graph_engine.add_chunk_data(chunks)
        
        blockchain_ledger.record_audit_event("DEMO_DATA_SEED", {
            "filename": doc["filename"],
            "chunk_count": len(chunks)
        })
        total_chunks += len(chunks)

    graph_engine.compute_graph_metrics()

    return {
        "status": "DEMO_DATA_SEEDED",
        "documents_seeded": len(sample_docs),
        "chunks_indexed": total_chunks,
        "graph_nodes": len(graph_engine.graph.nodes),
        "graph_edges": len(graph_engine.graph.edges)
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
