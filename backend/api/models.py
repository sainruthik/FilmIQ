from pydantic import BaseModel
from typing import Optional


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    filenames: list[str]
    access_token: str


class AnalysisEvent(BaseModel):
    type: str
    message: Optional[str] = None
    phase: Optional[str] = None
    film_title: Optional[str] = None
    agents: Optional[list[str]] = None
    agent: Optional[str] = None
    step: Optional[int] = None
    total: Optional[int] = None
    report: Optional[str] = None
    detail: Optional[str] = None
