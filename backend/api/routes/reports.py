from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/reports")
async def list_reports_route():
    from db import list_reports

    return {"reports": list_reports()}


@router.get("/reports/{report_id}")
async def get_report_route(report_id: str):
    from db import get_report

    report = get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report
