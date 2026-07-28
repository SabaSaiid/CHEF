"""
Unit test suite for in-process dual-layer caching and algorithm versioning.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.services.cache import SimpleLRUTTLCache, raw_nutrition_cache, nutri_score_cache
from app.scoring.constants import ALGORITHM_VERSION


def test_lru_ttl_cache_basic():
    cache = SimpleLRUTTLCache(maxsize=2, ttl_seconds=10.0)

    # Miss
    assert cache.get("key1") is None

    # Set & Hit
    cache.set("key1", {"title": "Test 1"})
    assert cache.get("key1") == {"title": "Test 1"}

    # LRU eviction check
    cache.set("key2", {"title": "Test 2"})
    cache.set("key3", {"title": "Test 3"})  # Should evict key1
    assert cache.get("key1") is None
    assert cache.get("key2") == {"title": "Test 2"}
    assert cache.get("key3") == {"title": "Test 3"}


def test_dual_layer_caching_and_version_invalidation():
    recipe_id = "12345"
    raw_key = f"raw_nutrition:{recipe_id}"

    raw_payload = {"id": 12345, "title": "Cached Paneer Curry"}
    raw_nutrition_cache.set(raw_key, raw_payload)

    assert raw_nutrition_cache.get(raw_key) == raw_payload

    # Version 1.0.0 score key
    score_key_v1 = f"nutri_score:{recipe_id}:{ALGORITHM_VERSION}"
    nutri_score_cache.set(score_key_v1, {"grade": "S", "algorithm_version": ALGORITHM_VERSION})

    # Hit v1
    assert nutri_score_cache.get(score_key_v1) == {"grade": "S", "algorithm_version": "1.0.0"}

    # Next version (1.1.0) lookup -> score cache miss (forces recalculation without hitting external API)
    next_version = "1.1.0"
    score_key_v2 = f"nutri_score:{recipe_id}:{next_version}"
    assert nutri_score_cache.get(score_key_v2) is None

    # But raw nutrition payload is STILL in Store A!
    assert raw_nutrition_cache.get(raw_key) == raw_payload


if __name__ == "__main__":
    test_lru_ttl_cache_basic()
    test_dual_layer_caching_and_version_invalidation()
    print("✅ All test_caching.py tests passed!")
