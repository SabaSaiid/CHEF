import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
import random
from app.routers.recipes import (
    get_daily_recipe,
    _get_local_daily_recipe,
    _is_vegetarian_recipe,
    INDIAN_VEG_RECIPES,
    INDIAN_ALL_RECIPES,
    WORLD_VEG_RECIPES,
    WORLD_ALL_RECIPES,
    _INDIAN_REGIONS,
    _DAILY_RECIPE_CACHE,
    _DAILY_CACHE_FILE,
)


def test_recipe_pools_and_quality():
    """Verify that recipe pools are loaded with high quality complete recipes."""
    print("Testing recipe pools and quality...")
    assert len(INDIAN_VEG_RECIPES) >= 50, f"Too few Indian Veg: {len(INDIAN_VEG_RECIPES)}"
    assert len(INDIAN_ALL_RECIPES) >= 100, f"Too few Indian All: {len(INDIAN_ALL_RECIPES)}"
    assert len(WORLD_VEG_RECIPES) >= 50, f"Too few World Veg: {len(WORLD_VEG_RECIPES)}"
    assert len(WORLD_ALL_RECIPES) >= 100, f"Too few World All: {len(WORLD_ALL_RECIPES)}"

    for r in INDIAN_VEG_RECIPES + WORLD_VEG_RECIPES:
        assert r.image_url, f"Missing image for {r.title}"
        assert r.instructions and len(r.instructions) >= 50, f"Instructions too short for {r.title}"
        assert r.ingredients and len(r.ingredients) >= 3, f"Too few ingredients for {r.title}"
        assert _is_vegetarian_recipe(r.diets, r.title, r.ingredients), f"Not veg: {r.title}"
    print(f"  ✓ Pools valid: Indian Veg ({len(INDIAN_VEG_RECIPES)}), Indian All ({len(INDIAN_ALL_RECIPES)}), World Veg ({len(WORLD_VEG_RECIPES)}), World All ({len(WORLD_ALL_RECIPES)})")


def test_cuisine_distribution_70_30():
    """Verify that simulation over 500 days yields ~70% Indian and ~30% Worldwide recipes."""
    print("Testing 70% Indian / 30% Worldwide ratio & 100% vegetarian prioritization...")
    total_days = 500
    indian_count = 0
    veg_count = 0

    for i in range(total_days):
        date_str = f"2026-09-{(i % 30) + 1:02d}-{i}"
        rng = random.Random(f"daily-{date_str}")
        is_indian = rng.random() < 0.70
        recipe = _get_local_daily_recipe(is_indian=is_indian, prefer_veg=True, rng=rng)

        reg = (recipe.region or "").lower()
        if reg in _INDIAN_REGIONS:
            indian_count += 1
        if _is_vegetarian_recipe(recipe.diets, recipe.title, recipe.ingredients):
            veg_count += 1

    indian_ratio = indian_count / total_days
    veg_ratio = veg_count / total_days

    print(f"  ✓ Indian cuisine ratio: {indian_ratio*100:.1f}% (target: ~70%)")
    print(f"  ✓ Vegetarian ratio: {veg_ratio*100:.1f}% (target: 100%)")
    assert 0.65 <= indian_ratio <= 0.75, f"Indian ratio {indian_ratio} out of expected 0.70 range"
    assert veg_ratio == 1.0, f"Veg ratio {veg_ratio} is not 100%"


async def test_daily_persistence_and_date_change():
    print("Testing daily persistence across refreshes and automatic date change...")
    test_date_1 = "2026-08-16"
    test_date_2 = "2026-08-17"

    # Call multiple times on same date (simulating website refreshes)
    r1 = await get_daily_recipe(date=test_date_1, refresh=False)
    r2 = await get_daily_recipe(date=test_date_1, refresh=False)
    r3 = await get_daily_recipe(date=test_date_1, refresh=False)

    assert r1.id == r2.id == r3.id, f"Date {test_date_1} returned different recipes on reload: {r1.id}, {r2.id}, {r3.id}"
    assert r1.title == r2.title == r3.title
    print(f"  ✓ Same date persistence: '{r1.title}' ({r1.region}) stays stable on refresh")

    # Call on next date (simulating day change)
    r_next = await get_daily_recipe(date=test_date_2, refresh=False)
    print(f"  ✓ New date recipe for {test_date_2}: '{r_next.title}' ({r_next.region})")

    # Call shuffle
    r_shuffled = await get_daily_recipe(date=test_date_1, refresh=True)
    print(f"  ✓ Shuffle returns: '{r_shuffled.title}' ({r_shuffled.region})")

    assert test_date_1 in _DAILY_RECIPE_CACHE
    assert _DAILY_CACHE_FILE.exists()
    print(f"  ✓ Cache file successfully persisted to {_DAILY_CACHE_FILE.name}")


async def main():
    test_recipe_pools_and_quality()
    test_cuisine_distribution_70_30()
    await test_daily_persistence_and_date_change()
    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
