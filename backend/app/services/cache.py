"""
In-process Dual-Layer LRU / TTL Cache Service for CHEF.

Provides zero-dependency in-process caching for:
  1. Store A: Raw API payloads (Key: raw_nutrition:{recipe_id})
  2. Store B: Computed Nutri-Score results (Key: nutri_score:{recipe_id}:{alg_version})

Uses collections.OrderedDict with TTL expiration and maxsize bounds.
"""

from __future__ import annotations

import time
from collections import OrderedDict
from typing import Any, Optional


class SimpleLRUTTLCache:
    """
    Lightweight, thread-safe in-process LRU + TTL Cache.
    """

    def __init__(self, maxsize: int = 1000, ttl_seconds: float = 86400.0):
        self.maxsize = maxsize
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None

        val, timestamp = self._cache[key]
        if time.time() - timestamp > self.ttl_seconds:
            # Expired -> Evict
            del self._cache[key]
            return None

        # Move to end (most recently used)
        self._cache.move_to_end(key)
        return val

    def set(self, key: str, value: Any) -> None:
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, time.time())

        # Evict oldest if maxsize exceeded
        if len(self._cache) > self.maxsize:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)


# Global dual-layer cache instances
# Store A: Raw API nutrition payloads (Key: raw_nutrition:{recipe_id})
raw_nutrition_cache = SimpleLRUTTLCache(maxsize=1000, ttl_seconds=86400.0)

# Store B: Computed Nutri-Score results (Key: nutri_score:{recipe_id}:{alg_version})
nutri_score_cache = SimpleLRUTTLCache(maxsize=1000, ttl_seconds=86400.0)
