from typing import List, Dict, Any, Optional
from embeddings.vector_store import VectorStore
from search.keyword_store import KeywordStore
from graph.graph_engine import GraphEngineeringEngine
from retrieval.reranker import rerank_chunks
from config import config


class HybridRetrievalEngine:
    def __init__(self, vector_store: VectorStore, keyword_store: KeywordStore, graph_engine: GraphEngineeringEngine):
        self.vector_store = vector_store
        self.keyword_store = keyword_store
        self.graph_engine = graph_engine

    def retrieve(
        self,
        query: str,
        vector_weight: float = 0.4,
        keyword_weight: float = 0.3,
        graph_weight: float = 0.3,
        top_k: int = 5,
        rrf_k: int = 60,
        department_filter: Optional[str] = None,
        use_reranker: bool = True
    ) -> Dict[str, Any]:
        # ---- Step 1: Retrieve candidates from all 3 sources ----
        candidate_pool_size = max(top_k * 4, 20)  # Fetch more for re-ranking
        vector_results = self.vector_store.similarity_search(
            query, top_k=candidate_pool_size, department_filter=department_filter
        )
        keyword_results = self.keyword_store.search(
            query, top_k=candidate_pool_size, department_filter=department_filter
        )
        graph_context = self.graph_engine.expand_query_context(query, max_hops=config.MAX_GRAPH_HOPS)

        # ---- Step 2: Build unified chunk pool with RRF scores ----
        chunk_pool: Dict[str, Dict[str, Any]] = {}
        vector_ranks: Dict[str, int] = {}
        keyword_ranks: Dict[str, int] = {}

        for rank, item in enumerate(vector_results):
            cid = item["chunk_id"]
            chunk_pool[cid] = item
            vector_ranks[cid] = rank + 1

        for rank, item in enumerate(keyword_results):
            cid = item["chunk_id"]
            if cid not in chunk_pool:
                chunk_pool[cid] = item
            keyword_ranks[cid] = rank + 1

        # ---- Step 3: Compute RRF fusion scores ----
        scored_chunks = []
        for cid, chunk in chunk_pool.items():
            r_vec = vector_ranks.get(cid, 999)
            r_kw = keyword_ranks.get(cid, 999)
            rrf_vec = vector_weight * (1.0 / (rrf_k + r_vec))
            rrf_kw = keyword_weight * (1.0 / (rrf_k + r_kw))

            content_lower = chunk["content"].lower()
            graph_overlap = sum(1 for n in graph_context["subgraph_nodes"] if n.lower() in content_lower)
            graph_boost = graph_weight * (graph_overlap * 0.05)

            final_score = rrf_vec + rrf_kw + graph_boost

            chunk_copy = chunk.copy()
            chunk_copy["hybrid_score"] = float(final_score)
            chunk_copy["vector_rank"] = r_vec if r_vec != 999 else "N/A"
            chunk_copy["keyword_rank"] = r_kw if r_kw != 999 else "N/A"
            chunk_copy["graph_overlap"] = graph_overlap
            scored_chunks.append(chunk_copy)

        scored_chunks.sort(key=lambda x: x["hybrid_score"], reverse=True)

        # ---- Step 4: Re-rank the top candidates ----
        if use_reranker and len(scored_chunks) > top_k:
            top_candidates = scored_chunks[:config.RERANK_TOP_N]
            final_chunks = rerank_chunks(query, top_candidates, top_n=top_k)
        else:
            final_chunks = scored_chunks[:top_k]

        return {
            "query": query,
            "retrieved_chunks": final_chunks,
            "graph_context": graph_context,
            "metrics": {
                "vector_results_count": len(vector_results),
                "keyword_results_count": len(keyword_results),
                "graph_nodes_matched": len(graph_context["subgraph_nodes"]),
                "fused_candidates": len(scored_chunks),
                "final_chunks": len(final_chunks),
                "reranker_applied": use_reranker and len(scored_chunks) > top_k
            }
        }
