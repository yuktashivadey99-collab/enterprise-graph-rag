import math
import re
from typing import List, Dict, Any

class KeywordStore:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks: List[Dict[str, Any]] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_length: float = 0.0
        self.inverted_index: Dict[str, Dict[int, int]] = {}
        self.doc_count: int = 0

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9_-]+\b', text.lower())

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        start_idx = len(self.chunks)
        for i, chunk in enumerate(chunks):
            doc_idx = start_idx + i
            self.chunks.append(chunk)
            
            tokens = self._tokenize(chunk["content"])
            doc_len = len(tokens)
            self.doc_lengths.append(doc_len)
            
            tf_map: Dict[str, int] = {}
            for t in tokens:
                tf_map[t] = tf_map.get(t, 0) + 1
                
            for t, freq in tf_map.items():
                if t not in self.inverted_index:
                    self.inverted_index[t] = {}
                self.inverted_index[t][doc_idx] = freq

        self.doc_count = len(self.chunks)
        self.avg_doc_length = sum(self.doc_lengths) / self.doc_count if self.doc_count > 0 else 0.0

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_tokens = self._tokenize(query)
        if not query_tokens or self.doc_count == 0:
            return []

        scores: Dict[int, float] = {}

        for token in query_tokens:
            if token not in self.inverted_index:
                continue

            posting_list = self.inverted_index[token]
            n_q = len(posting_list)
            
            idf = math.log((self.doc_count - n_q + 0.5) / (n_q + 0.5) + 1.0)

            for doc_idx, freq in posting_list.items():
                doc_len = self.doc_lengths[doc_idx]
                numerator = freq * (self.k1 + 1.0)
                denominator = freq + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_length))
                bm25_term_score = idf * (numerator / denominator)
                
                scores[doc_idx] = scores.get(doc_idx, 0.0) + bm25_term_score

        results = []
        for doc_idx, raw_score in scores.items():
            chunk_data = self.chunks[doc_idx].copy()
            chunk_data["keyword_score"] = float(raw_score)
            results.append(chunk_data)

        results.sort(key=lambda x: x["keyword_score"], reverse=True)
        return results[:top_k]

    def clear(self):
        self.chunks.clear()
        self.doc_lengths.clear()
        self.avg_doc_length = 0.0
        self.inverted_index.clear()
        self.doc_count = 0
