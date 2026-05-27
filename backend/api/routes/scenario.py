import json
from typing import Any

from fastapi import APIRouter
from openai import AsyncOpenAI
from pydantic import BaseModel

from config import settings

router = APIRouter()


class ScenarioRequest(BaseModel):
    question: str
    report_json: dict[str, Any] | None = None
    film_title: str = "Unknown"


class ScenarioResponse(BaseModel):
    answer: str


_SYSTEM_PROMPT = """You are a senior film rights acquisition advisor at a major streaming platform.
You have access to an AI-generated acquisition analysis report.
Answer the user's question concisely and professionally, as if briefing a content acquisition executive.
Keep answers to 2-4 sentences unless a detailed breakdown is specifically needed.
Cite specific numbers from the report when relevant."""


@router.post("/scenario", response_model=ScenarioResponse)
async def scenario(req: ScenarioRequest) -> ScenarioResponse:
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    report_section = ""
    if req.report_json:
        report_section = f"\n\nACQUISITION REPORT:\n{json.dumps(req.report_json, indent=2)}"

    user_message = f"Film: {req.film_title}{report_section}\n\nQuestion: {req.question}"

    completion = await client.chat.completions.create(
        model=settings.openai_strategist_model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=512,
        temperature=0.4,
    )

    answer = completion.choices[0].message.content or "Unable to generate a response."
    return ScenarioResponse(answer=answer)
