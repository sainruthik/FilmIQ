from pydantic import BaseModel


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    filenames: list[str]
    access_token: str
