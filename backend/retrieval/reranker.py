from typing import List, Dict, Any, Optional

# Lazy-load the cross-encoder to avoid slow startup
_reranker_model = None
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


def _get_reranker():
    global _reranker_model
    if _reranker_model is None:
        try:
            from sentence_transformers import CrossEncoder
            print(f"[Reranker] Loading '{RERANKER_MODEL}' (first run downloads ~80MB)...")
            _reranker_model = CrossEncoder(RERANKER_MODEL)
            print("[Reranker] Cross-encoder model loaded successfully.")
        except Exception as e:
            print(f"[Reranker] Failed to load cross-encoder: {e}. Skipping re-ranking.")
            _reranker_model = None
    return _reranker_model


def rerank_chunks(
    query: str,
    chunks: List[Dict[str, Any]],
    top_n: int = 5
) -> List[Dict[str, Any]]:
    """
    Re-rank a list of retrieved chunks using a cross-encoder model.
    Returns the top_n most relevant chunks in order.
    
    Falls back to original order if model is unavailable.
    """
    if not chunks:
        return chunks

    reranker = _get_reranker()

    if reranker is None:
        # Graceful fallback: return first top_n chunks as-is
        return chunks[:top_n]

    try:
        # Prepare query-document pairs
        pairs = [(query, chunk["content"]) for chunk in chunks]

        # Score all pairs with the cross-encoder
        scores = reranker.predict(pairs)

        # Attach reranker scores and sort descending
        for i, chunk in enumerate(chunks):
            chunk["rerank_score"] = float(scores[i])

        ranked = sorted(chunks, key=lambda x: x.get("rerank_score", 0.0), reverse=True)
        return ranked[:top_n]

    except Exception as e:
        print(f"[Reranker] Error during re-ranking: {e}. Using original order.")
        return chunks[:top_n]
