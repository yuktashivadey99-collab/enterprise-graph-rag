import numpy as np
import math
import re
from typing import List, Dict, Any

class VectorStore:
    def __init__(self, vector_dim: int = 128):
        self.vector_dim = vector_dim
        self.chunks: List[Dict[str, Any]] = []
        self.vectors: List[np.ndarray] = []
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9_-]+\b', text.lower())

    def _build_embedding(self, text: str) -> np.ndarray:
        tokens = self._tokenize(text)
        if not tokens:
            return np.zeros(self.vector_dim, dtype=np.float32)

        vec = np.zeros(self.vector_dim, dtype=np.float32)
        for token in tokens:
            h = hash(token)
            dim_idx = abs(h) % self.vector_dim
            weight = self.idf.get(token, 1.0)
            sign = 1.0 if (h % 2 == 0) else -1.0
            vec[dim_idx] += sign * weight

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return vec

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        doc_count = len(self.chunks) + len(chunks)
        doc_freqs: Dict[str, int] = {}
        
        for c in chunks:
            tokens = set(self._tokenize(c["content"]))
            for t in tokens:
                doc_freqs[t] = doc_freqs.get(t, 0) + 1

        for token, count in doc_freqs.items():
            self.idf[token] = math.log((doc_count + 1) / (count + 1)) + 1.0

        for c in chunks:
            vec = self._build_embedding(c["content"])
            self.chunks.append(c)
            self.vectors.append(vec)

    def similarity_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.vectors:
            return []

        query_vec = self._build_embedding(query)
        query_norm = np.linalg.norm(query_vec)
        
        if query_norm == 0:
            return []

        results = []
        for idx, doc_vec in enumerate(self.vectors):
            dot_product = np.dot(query_vec, doc_vec)
            score = float(dot_product)
            
            chunk_data = self.chunks[idx].copy()
            chunk_data["vector_score"] = max(0.0, score)
            results.append(chunk_data)

        results.sort(key=lambda x: x["vector_score"], reverse=True)
        return results[:top_k]

    def clear(self):
        self.chunks.clear()
        self.vectors.clear()
        self.vocab.clear()
        self.idf.clear()
