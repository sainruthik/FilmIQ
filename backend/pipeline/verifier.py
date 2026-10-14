"""Deterministic citation verifier for specialist research.

A "claim" is any sentence (or table row) stating a figure: currency, a
percentage, a magnitude (12M, 3 billion), or a comma-grouped number. A claim
is cited when the same sentence carries a [PDF p.N] label or a markdown
hyperlink. Bare years and small counts are deliberately not figures, since
"released in 2019" or "3 comparable titles" are not the invented-number risk
the accuracy guardrail targets.
"""
import re

_FIGURE_RE = re.compile(
    r"[$£€]\s?\d"
    r"|\d(?:\.\d+)?\s?%"
    r"|\d(?:\.\d+)?\s?(?:[KMB]\b|k\b|thousand\b|million\b|billion\b|mn\b|bn\b)"
    r"|\d{1,3}(?:,\d{3})+",
    re.IGNORECASE,
)
# Accepts page ranges/lists too: [PDF p.3-4], [PDF pp.3-4], [PDF p.3, p.5].
_CITATION_RE = re.compile(r"\[PDF pp?\.\s?\d+[^\]]*\]|\]\(https?://", re.IGNORECASE)
# No split before "[": a citation placed after the period ("$20M. [PDF p.3]")
# stays attached to the sentence it sources. Captures the separator so
# tag_unverified can rebuild the text exactly.
_SENTENCE_SPLIT_RE = re.compile(r"((?<=[.!?])\s+(?=[A-Z*_\"'(]))")

UNVERIFIED_TAG = "[unverified]"


def _claims(text: str) -> list[str]:
    sentences = (
        s.strip()
        for line in text.splitlines()
        for s in _SENTENCE_SPLIT_RE.split(line)[::2]
    )
    return [s for s in sentences if _FIGURE_RE.search(s)]


def _is_uncited(sentence: str) -> bool:
    return bool(
        _FIGURE_RE.search(sentence)
        and not _CITATION_RE.search(sentence)
        and UNVERIFIED_TAG not in sentence
    )


def find_uncited(text: str) -> list[str]:
    """Sentences stating a figure with no citation (already-tagged ones excluded)."""
    return [s for s in _claims(text) if _is_uncited(s)]


def coverage(texts: list[str]) -> float:
    """Fraction of figure claims across `texts` that carry a citation (1.0 if none)."""
    claims = [c for t in texts for c in _claims(t)]
    if not claims:
        return 1.0
    cited = sum(1 for c in claims if _CITATION_RE.search(c))
    return round(cited / len(claims), 3)


def tag_unverified(text: str) -> str:
    """Tag every uncited figure claim in `text` with UNVERIFIED_TAG.

    Works sentence by sentence in place (so duplicate claims are each
    tagged). The tag goes before closing punctuation, or before a table row's
    trailing pipe, so it stays inside its sentence/row and is skipped on any
    later pass.
    """

    def tag(sentence: str) -> str:
        if not _is_uncited(sentence):
            return sentence
        s = sentence.rstrip()
        if s.endswith("|"):
            return f"{s[:-1].rstrip()} {UNVERIFIED_TAG} |"
        if s[-1] in ".!?":
            return f"{s[:-1]} {UNVERIFIED_TAG}{s[-1]}"
        return f"{s} {UNVERIFIED_TAG}"

    return "\n".join(
        "".join(tag(part) if i % 2 == 0 else part for i, part in enumerate(_SENTENCE_SPLIT_RE.split(line)))
        for line in text.split("\n")
    )
