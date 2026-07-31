from typing import List
import numpy as np
from config import config

# Lazy-load to avoid slow startup when model not used immediately
_model = None


def get_embedding_model():
    global _model
    if _model is None:
        print(f"[Embeddings] Loading '{config.EMBEDDING_MODEL}' (first run downloads ~80MB)...")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
        print(f"[Embeddings] Model loaded. Dimension: {config.EMBEDDING_DIMENSION}")
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of text strings."""
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """Generate a single embedding for a query string."""
    model = get_embedding_model()
    embedding = model.encode([query], normalize_embeddings=True, show_progress_bar=False)
    return embedding[0].tolist()
