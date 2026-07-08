from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class CompareRequest(BaseModel):
    report_ids: list[str]


def build_comparison_prompt(reports: list[dict]) -> str:
    lines = [
        f"- {r.get('title', r.get('id'))}: deal score {r.get('deal_score')}, "
        f"verdict {r.get('verdict')}, bid range {r.get('bid_low')} — {r.get('bid_fair')} — "
        f"{r.get('bid_walk_away')}, thesis: \"{r.get('thesis', '')}\""
        for r in reports
    ]
    return (
        "You are a film acquisitions strategist. Given these films under consideration, "
        "write ONE short paragraph (3-4 sentences) comparing them head-to-head and "
        "recommending which to prioritize and why, referencing the concrete figures below. "
        "Be direct and specific, no hedging.\n\n" + "\n".join(lines)
    )


def _generate_comparison_verdict(reports: list[dict]) -> str:
    """A short strategist-style paragraph comparing already-analyzed films.

    A single lightweight completion call over already-structured data (same
    direct-litellm pattern as pipeline/rag.py), not a new CrewAI agent — this
    is a bounded synthesis task, not a research task.
    """
    import litellm

    from config import settings

    resp = litellm.completion(
        model=f"openai/{settings.openai_strategist_model}",
        api_key=settings.openai_api_key,
        messages=[{"role": "user", "content": build_comparison_prompt(reports)}],
        temperature=0.3,
        max_tokens=300,
    )
    return resp.choices[0].message.content


@router.post("/compare")
async def compare_reports(payload: CompareRequest):
    from db import get_reports_by_ids

    if len(payload.report_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 reports to compare.")

    reports = get_reports_by_ids(payload.report_ids)
    if len(reports) < 2:
        raise HTTPException(status_code=404, detail="One or more reports not found.")

    try:
        verdict = _generate_comparison_verdict(reports)
    except Exception:
        verdict = ""

    return {"reports": reports, "verdict": verdict}
