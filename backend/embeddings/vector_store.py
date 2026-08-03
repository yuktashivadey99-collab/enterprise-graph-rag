from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue, SearchRequest
)
import uuid

from config import config
from embeddings.embedding_model import embed_texts, embed_query

COLLECTION_NAME = "enterprise_chunks"


class VectorStore:
    def __init__(self):
        try:
            self.client = QdrantClient(path=config.QDRANT_PATH)
            print(f"[VectorStore] Qdrant embedded initialized at '{config.QDRANT_PATH}'")
        except Exception as e:
            print(f"[VectorStore] Storage path locked ({e}). Initializing Qdrant in memory mode.")
            self.client = QdrantClient(location=":memory:")
        self._ensure_collection()

    def _ensure_collection(self):
        """Create collection if it doesn't exist."""
        existing = [c.name for c in self.client.get_collections().collections]
        if COLLECTION_NAME not in existing:
            self.client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=config.EMBEDDING_DIMENSION,
                    distance=Distance.COSINE
                )
            )
            print(f"[VectorStore] Created Qdrant collection '{COLLECTION_NAME}'")

    @property
    def chunks(self) -> List[Dict[str, Any]]:
        """Return a list of stored chunk payloads (for compatibility check)."""
        try:
            result = self.client.scroll(
                collection_name=COLLECTION_NAME,
                limit=1,
                with_payload=True,
                with_vectors=False
            )
            # Return count as a list mock - just checking if empty
            count_info = self.client.count(collection_name=COLLECTION_NAME)
            return [None] * count_info.count  # lightweight mock for len() checks
        except Exception:
            return []

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """Embed and upsert chunks into Qdrant."""
        if not chunks:
            return

        texts = [c["content"] for c in chunks]
        embeddings = embed_texts(texts)

        points = []
        for chunk, vector in zip(chunks, embeddings):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk["chunk_id"]))
            # Convert UUID to int for Qdrant (required)
            point_id_int = int(uuid.UUID(point_id)) % (2**63)

            payload = {
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "filename": chunk["filename"],
                "page_num": chunk.get("page_num", 1),
                "chunk_index": chunk.get("chunk_index", 0),
                "content": chunk["content"],
                "word_count": chunk.get("word_count", 0),
                "department": chunk.get("department", ""),
                "file_type": chunk.get("file_type", ""),
            }

            points.append(PointStruct(
                id=point_id_int,
                vector=vector,
                payload=payload
            ))

        self.client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"[VectorStore] Upserted {len(points)} chunks into Qdrant.")

    def similarity_search(
        self,
        query: str,
        top_k: int = 5,
        department_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks using cosine similarity."""
        query_vector = embed_query(query)

        search_filter = None
        if department_filter:
            search_filter = Filter(
                must=[FieldCondition(key="department", match=MatchValue(value=department_filter))]
            )

        try:
            results = self.client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                limit=top_k,
                query_filter=search_filter,
                with_payload=True
            ).points
        except Exception:
            results = self.client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                limit=top_k,
                query_filter=search_filter,
                with_payload=True
            )

        chunks = []
        for hit in results:
            chunk_data = dict(hit.payload)
            chunk_data["vector_score"] = float(hit.score)
            chunks.append(chunk_data)

        return chunks

    def get_chunk_count(self) -> int:
        try:
            return self.client.count(collection_name=COLLECTION_NAME).count
        except Exception:
            return 0

    def clear(self):
        """Drop and recreate the collection."""
        self.client.delete_collection(COLLECTION_NAME)
        self._ensure_collection()
