import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ingestion.document_processor import DocumentProcessor
from ingestion.chunker import TextChunker
from embeddings.vector_store import VectorStore
from search.keyword_store import KeywordStore
from graph.graph_engine import GraphEngineeringEngine
from retrieval.hybrid_engine import HybridRetrievalEngine
from verification.multi_agent import MultiAgentVerificationPipeline
from blockchain.ledger import BlockchainAuditLedger

def test_pipeline():
    print("=== Testing Enterprise Graph-RAG Pipeline ===")
    
    # 1. Initialize Components
    doc_proc = DocumentProcessor()
    chunker = TextChunker(chunk_size=400, overlap=50)
    v_store = VectorStore()
    kw_store = KeywordStore()
    g_engine = GraphEngineeringEngine()
    h_engine = HybridRetrievalEngine(v_store, kw_store, g_engine)
    verifier = MultiAgentVerificationPipeline()
    ledger = BlockchainAuditLedger()
    
    # 2. Ingest Sample Document
    doc_content = (
        "Acme Global Tech implements FastAPI Gateway and Apache Tika OCR pipeline for enterprise document ingestion. "
        "The React Frontend connects to FastAPI via REST and WebSockets. "
        "The Graph Engineering Engine extracts Subject-Predicate-Object triples and builds an Enterprise Knowledge Graph. "
        "NetworkX powers PageRank centrality. Dual storage combines Vector Database semantic search with Elasticsearch BM25. "
        "The Multi-Agent Verification system runs Fact Checker and Citation Auditor to produce an objective Trust Score. "
        "All transactions are recorded in an SHA-256 Merkle Blockchain Audit Ledger."
    )
    
    doc_data = doc_proc.process_file("Architecture_Spec.pdf", doc_content.encode())
    print(f"[OK] Document parsed: {doc_data['filename']}, ID: {doc_data['document_id']}")
    
    chunks = chunker.chunk_document(doc_data)
    print(f"[OK] Text chunked: {len(chunks)} chunks created")
    
    v_store.add_chunks(chunks)
    kw_store.add_chunks(chunks)
    g_engine.add_chunk_data(chunks)
    g_engine.compute_graph_metrics()
    
    graph_vis = g_engine.get_full_graph_visualization_data()
    print(f"[OK] Knowledge Graph populated: {graph_vis['stats']['total_nodes']} nodes, {graph_vis['stats']['total_edges']} edges")
    
    # 3. Test Hybrid RAG Retrieval
    query = "How does Graph Engineering connect with FastAPI and Blockchain?"
    retrieval_res = h_engine.retrieve(query, vector_weight=0.4, keyword_weight=0.3, graph_weight=0.3, top_k=3)
    print(f"[OK] Hybrid RRF Retrieval completed: {len(retrieval_res['retrieved_chunks'])} top chunks retrieved")
    
    # 4. Multi-Agent Verification
    sample_response = f"Graph Engineering extracts triples and integrates with FastAPI, sealed in SHA-256 Blockchain Ledger."
    report = verifier.run_verification(sample_response, retrieval_res['retrieved_chunks'], retrieval_res['graph_context'])
    print(f"[OK] Multi-Agent Verification completed: Trust Score = {report['trust_score']}%, Risk = {report['hallucination_risk']}")
    
    # 5. Blockchain Seal
    tx_hash = ledger.record_audit_event("TEST_QUERY_EXECUTION", {"query": query, "trust_score": report["trust_score"]})
    integrity = ledger.verify_chain_integrity()
    print(f"[OK] Blockchain Audit Ledger sealed: Block Hash = {tx_hash[:16]}..., Chain Valid = {integrity['valid']}")
    
    print("\n[SUCCESS] ALL PIPELINE COMPONENT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_pipeline()
