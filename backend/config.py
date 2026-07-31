import os
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

class AppConfig(BaseSettings):
    # ---- Project Meta ----
    PROJECT_NAME: str = "Enterprise Hybrid Graph-RAG System"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    # ---- Google Gemini ----
    GOOGLE_API_KEY: str = Field(default="", env="GOOGLE_API_KEY")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash", env="GEMINI_MODEL")
    GEMINI_MAX_TOKENS: int = Field(default=2048, env="GEMINI_MAX_TOKENS")
    GEMINI_TEMPERATURE: float = Field(default=0.3, env="GEMINI_TEMPERATURE")

    # ---- Embedding Model ----
    EMBEDDING_MODEL: str = Field(default="all-MiniLM-L6-v2", env="EMBEDDING_MODEL")
    EMBEDDING_DIMENSION: int = Field(default=384, env="EMBEDDING_DIMENSION")

    # ---- JWT Auth ----
    JWT_SECRET_KEY: str = Field(default="dev-secret-change-in-production", env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=43200, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")

    # ---- Storage Paths ----
    DATA_DIR: str = Field(default="./data", env="DATA_DIR")
    UPLOADS_DIR: str = Field(default="./data/uploads", env="UPLOADS_DIR")
    QDRANT_PATH: str = Field(default="./data/qdrant_storage", env="QDRANT_PATH")
    SQLITE_PATH: str = Field(default="./data/enterprise_rag.db", env="SQLITE_PATH")
    GRAPH_PERSISTENCE_PATH: str = Field(default="./data/knowledge_graph.json", env="GRAPH_PERSISTENCE_PATH")
    KEYWORD_STORE_PATH: str = Field(default="./data/keyword_store.pkl", env="KEYWORD_STORE_PATH")

    # ---- Retrieval Hyperparameters ----
    DEFAULT_VECTOR_WEIGHT: float = 0.4
    DEFAULT_KEYWORD_WEIGHT: float = 0.3
    DEFAULT_GRAPH_WEIGHT: float = 0.3
    RRF_K: int = 60
    TOP_K_RETRIEVAL: int = 5
    RERANK_TOP_N: int = 20

    # ---- Graph Hyperparameters ----
    MAX_GRAPH_HOPS: int = 2
    MIN_TRIPLE_CONFIDENCE: float = 0.65

    # ---- Chunking ----
    CHUNK_SIZE: int = 400
    CHUNK_OVERLAP: int = 80

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_config() -> AppConfig:
    return AppConfig()


config = get_config()

# Create all required directories on startup
for path in [config.DATA_DIR, config.UPLOADS_DIR, config.QDRANT_PATH]:
    os.makedirs(path, exist_ok=True)
