import time
import hashlib
from typing import Any, Optional, Dict
from cachetools import TTLCache
import threading

# Thread-safe TTL cache: 500 items max, 1-hour TTL
_cache: TTLCache = TTLCache(maxsize=500, ttl=3600)
_lock = threading.Lock()


def _make_key(query: str, weights: Optional[Dict] = None) -> str:
    """Generate a deterministic cache key from query + weights."""
    base = query.lower().strip()
    if weights:
        base += str(sorted(weights.items()))
    return hashlib.md5(base.encode()).hexdigest()


def get_cached_response(query: str, weights: Optional[Dict] = None) -> Optional[Any]:
    """Return cached response or None."""
    key = _make_key(query, weights)
    with _lock:
        return _cache.get(key)


def set_cached_response(query: str, response: Any, weights: Optional[Dict] = None) -> None:
    """Store a response in cache."""
    key = _make_key(query, weights)
    with _lock:
        _cache[key] = response


def invalidate_all() -> None:
    """Clear the entire cache (e.g. after new document upload)."""
    with _lock:
        _cache.clear()


def get_cache_stats() -> Dict[str, Any]:
    with _lock:
        return {
            "cached_queries": len(_cache),
            "max_size": _cache.maxsize,
            "ttl_seconds": _cache.ttl
        }
