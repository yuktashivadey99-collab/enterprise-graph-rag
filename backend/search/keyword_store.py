import math
import re
import os
import pickle
from typing import List, Dict, Any, Optional
from config import config


class KeywordStore:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks: List[Dict[str, Any]] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_length: float = 0.0
        self.inverted_index: Dict[str, Dict[int, int]] = {}
        self.doc_count: int = 0
        self._persistence_path = config.KEYWORD_STORE_PATH

        # Load from disk if previous state exists
        self._load_from_disk()

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
        self._save_to_disk()

    def search(self, query: str, top_k: int = 5, department_filter: Optional[str] = None) -> List[Dict[str, Any]]:
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
                scores[doc_idx] = scores.get(doc_idx, 0.0) + idf * (numerator / denominator)

        results = []
        for doc_idx, raw_score in scores.items():
            chunk_data = self.chunks[doc_idx].copy()
            # Apply department filter
            if department_filter and chunk_data.get("department", "") != department_filter:
                continue
            chunk_data["keyword_score"] = float(raw_score)
            results.append(chunk_data)

        results.sort(key=lambda x: x["keyword_score"], reverse=True)
        return results[:top_k]

    def _save_to_disk(self):
        """Persist the BM25 index to disk so it survives server restarts."""
        try:
            state = {
                "chunks": self.chunks,
                "doc_lengths": self.doc_lengths,
                "avg_doc_length": self.avg_doc_length,
                "inverted_index": self.inverted_index,
                "doc_count": self.doc_count,
                "k1": self.k1,
                "b": self.b
            }
            os.makedirs(os.path.dirname(self._persistence_path), exist_ok=True)
            with open(self._persistence_path, "wb") as f:
                pickle.dump(state, f)
        except Exception as e:
            print(f"[KeywordStore] Warning: Could not persist to disk: {e}")

    def _load_from_disk(self):
        """Restore BM25 index from disk on startup."""
        if not os.path.exists(self._persistence_path):
            return
        try:
            with open(self._persistence_path, "rb") as f:
                state = pickle.load(f)
            self.chunks = state["chunks"]
            self.doc_lengths = state["doc_lengths"]
            self.avg_doc_length = state["avg_doc_length"]
            self.inverted_index = state["inverted_index"]
            self.doc_count = state["doc_count"]
            self.k1 = state.get("k1", 1.5)
            self.b = state.get("b", 0.75)
            print(f"[KeywordStore] Restored {self.doc_count} documents from disk.")
        except Exception as e:
            print(f"[KeywordStore] Warning: Could not restore from disk: {e}")

    def clear(self):
        self.chunks.clear()
        self.doc_lengths.clear()
        self.avg_doc_length = 0.0
        self.inverted_index.clear()
        self.doc_count = 0
        if os.path.exists(self._persistence_path):
            os.remove(self._persistence_path)
