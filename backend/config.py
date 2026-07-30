import os
from pydantic import BaseModel

class AppConfig(BaseModel):
    PROJECT_NAME: str = "Enterprise Hybrid Graph-RAG System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Retrieval Hyperparameters
    DEFAULT_VECTOR_WEIGHT: float = 0.4
    DEFAULT_KEYWORD_WEIGHT: float = 0.3
    DEFAULT_GRAPH_WEIGHT: float = 0.3
    RRF_K: int = 60
    TOP_K_RETRIEVAL: int = 5
    
    # Graph Hyperparameters
    MAX_GRAPH_HOPS: int = 2
    MIN_TRIPLE_CONFIDENCE: float = 0.65
    
    # Chunking Hyperparameters
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    
    # Storage Paths
    STORAGE_DIR: str = os.path.join(os.path.dirname(__file__), "data")

config = AppConfig()
os.makedirs(config.STORAGE_DIR, exist_ok=True)
