"""
Content Moderation Service — Lightweight keyword and regex text filter for launch.

Blocks obvious profanity, hate speech, spam links, and abusive text.
Returns a tuple (is_clean: bool, reason: str | None) or raises HTTPException directly.
"""

import re
from fastapi import HTTPException, status

# Basic prohibited keyword & regex patterns for launch
PROHIBITED_PATTERNS = [
    r"\b(fuck|shit|bitch|asshole|bastard|cunt|dick|pussy|whore|slut)\b",
    r"\b(nigger|faggot|retard)\b",
    r"(http://|https://|www\.)\S+\.(xyz|top|click|link|casino|bet|loan)\b",  # spam links
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PROHIBITED_PATTERNS]


def check_text_content(text: str | None) -> tuple[bool, str | None]:
    """
    Scans text for prohibited words, spam URLs, or abusive language.
    Returns (True, None) if clean, or (False, "Reason...") if flagged.
    """
    if not text or not text.strip():
        return True, None

    for pattern in _COMPILED_PATTERNS:
        if pattern.search(text):
            return False, "Content contains disallowed words, profanity, or spam links."

    return True, None


def validate_clean_text(text: str | None, field_name: str = "Text content") -> str | None:
    """
    Convenience validator — raises 400 Bad Request if text fails moderation check.
    """
    is_clean, reason = check_text_content(text)
    if not is_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} failed moderation: {reason}",
        )
    return text
