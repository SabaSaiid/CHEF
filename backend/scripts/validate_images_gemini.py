"""
validate_images_gemini.py — Resumable Gemini Vision Content Validator

For every recipe with a non-null image_url, asks Gemini:
  "Does this image plausibly show the dish '{title}'? Answer strictly yes or no, then one short reason."

Saves results to a JSON checkpoint file so reruns skip already-validated IDs.

Usage:
  python3 validate_images_gemini.py [--limit N] [--start-over]
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path

import httpx

# ── Config ──────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).resolve().parent.parent
RECIPES_PATH  = BASE_DIR / "app" / "recipes.json"
CACHE_PATH    = BASE_DIR / "scripts" / "gemini_validation_cache.json"
FLAGGED_PATH  = BASE_DIR / "scripts" / "gemini_flagged_no.json"

GEMINI_KEY    = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL    = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)
# Free-tier safe: ~14 req/min = 1 req / 4.5s
DELAY_SECONDS = 5.0
MAX_RETRIES   = 3
# ─────────────────────────────────────────────────────────────────────────────


def log(msg: str):
    print(msg, flush=True)


def load_cache() -> dict:
    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2)


def resolve_image_url(image_url: str) -> str:
    """Convert local /images/... path to absolute filesystem path."""
    if image_url.startswith("/images/"):
        local = Path(__file__).resolve().parent.parent.parent / "frontend-react" / "public" / image_url.lstrip("/")
        if local.exists():
            return str(local)
        return ""
    return image_url


def fetch_image_bytes(url: str) -> bytes | None:
    """Download image bytes. Returns None on any failure."""
    if not url:
        return None
    try:
        if url.startswith("/") or Path(url).exists():
            with open(url, "rb") as f:
                return f.read()
        r = httpx.get(url, timeout=10, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        if r.status_code == 200:
            ct = r.headers.get("content-type", "")
            if "image" in ct:
                return r.content
    except Exception as e:
        log(f"  ⚠️  Fetch error: {e}")
    return None


def mime_from_url(url: str) -> str:
    u = url.lower()
    if u.endswith(".png"):  return "image/png"
    if u.endswith(".gif"):  return "image/gif"
    if u.endswith(".webp"): return "image/webp"
    return "image/jpeg"


def ask_gemini(title: str, image_url: str, img_bytes: bytes) -> tuple[str, str]:
    """
    Returns (verdict, reason) where verdict is 'yes', 'no', or 'error'.
    """
    import base64

    prompt = (
        f"Does this image plausibly show the dish '{title}'? "
        "Answer strictly yes or no, then one short reason."
    )
    mime = mime_from_url(image_url)
    b64  = base64.b64encode(img_bytes).decode()

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime, "data": b64}}
            ]
        }],
        "generationConfig": {"maxOutputTokens": 80, "temperature": 0}
    }

    for attempt in range(MAX_RETRIES):
        try:
            r = httpx.post(
                GEMINI_URL,
                params={"key": GEMINI_KEY},
                json=payload,
                timeout=30
            )
            if r.status_code == 429:
                wait = 60 * (attempt + 1)
                log(f"  ⏳ Rate limited — waiting {wait}s")
                time.sleep(wait)
                continue
            if r.status_code != 200:
                return "error", f"HTTP {r.status_code}: {r.text[:120]}"
            
            data  = r.json()
            text  = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            lower = text.lower()
            verdict = "yes" if lower.startswith("yes") else ("no" if lower.startswith("no") else "ambiguous")
            reason  = text.split("\n")[0] if "\n" in text else text
            return verdict, reason

        except Exception as e:
            log(f"  ⚠️  Gemini error (attempt {attempt+1}): {e}")
            time.sleep(10)

    return "error", "Max retries exceeded"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max recipes to validate this run")
    parser.add_argument("--start-over", action="store_true", help="Clear checkpoint and restart")
    args = parser.parse_args()

    with open(RECIPES_PATH) as f:
        recipes = json.load(f)

    cache = {} if args.start_over else load_cache()
    if args.start_over:
        log("🔄 Starting over — cache cleared.")

    # Only recipes with a real image_url
    candidates = [r for r in recipes if r.get("image_url") and r["image_url"].strip()]
    log(f"\n📋 Total recipes with image_url: {len(candidates)}")
    log(f"✅ Already validated: {len(cache)}")

    todo = [r for r in candidates if r["id"] not in cache]
    if args.limit:
        todo = todo[:args.limit]
    log(f"🔍 To validate this run: {len(todo)}\n")

    yes_count = no_count = err_count = skip_count = 0

    for i, r in enumerate(todo):
        rid   = r["id"]
        title = r["title"]
        raw_url = r["image_url"].strip()

        # Resolve local path if needed
        resolved = resolve_image_url(raw_url)
        img_bytes = fetch_image_bytes(resolved or raw_url)

        if not img_bytes:
            log(f"[{i+1}/{len(todo)}] ⚫ SKIP (no image data) — {title}")
            cache[rid] = {"title": title, "url": raw_url, "verdict": "skip", "reason": "Image not fetchable"}
            skip_count += 1
            save_cache(cache)
            continue

        verdict, reason = ask_gemini(title, raw_url, img_bytes)

        icon = {"yes": "✅", "no": "❌", "error": "⚠️", "ambiguous": "🟡"}.get(verdict, "?")
        log(f"[{i+1}/{len(todo)}] {icon} {verdict.upper():10} — {title}")
        log(f"           {reason[:100]}")

        cache[rid] = {"title": title, "url": raw_url, "verdict": verdict, "reason": reason}

        if verdict == "yes":       yes_count += 1
        elif verdict == "no":      no_count  += 1
        elif verdict == "error":   err_count += 1
        else:                      err_count += 1

        save_cache(cache)
        time.sleep(DELAY_SECONDS)

    # ── Summary ──────────────────────────────────────────────────────────────
    log("\n" + "="*60)
    log(f"RUN COMPLETE")
    log(f"  ✅ Yes (correct):  {yes_count}")
    log(f"  ❌ No (flagged):   {no_count}")
    log(f"  ⚫ Skip:           {skip_count}")
    log(f"  ⚠️  Error:          {err_count}")
    log(f"  Total validated:  {len(cache)}/{len(candidates)}")
    log("="*60)

    # Save flagged list
    flagged = {rid: v for rid, v in cache.items() if v["verdict"] == "no"}
    with open(FLAGGED_PATH, "w") as f:
        json.dump(flagged, f, indent=2)
    log(f"\n📄 Flagged 'no' list saved → {FLAGGED_PATH}")
    log(f"   Total flagged: {len(flagged)}")

    if flagged:
        log("\nFLAGGED RECIPES:")
        for rid, v in flagged.items():
            log(f"  [{rid}] {v['title']}")
            log(f"         Reason: {v['reason'][:100]}")
            log(f"         URL:    {v['url'][:80]}")


if __name__ == "__main__":
    main()
