"""SQLite persistence for completed acquisition reports — powers the Deal
Room (history of analyses) and Compare views. Separate from the per-job
result JSON file in api/jobs.py: that file exists so a reconnecting client
can replay one specific job's SSE stream; this DB is the durable, queryable
store of every report ever produced.

The engine is created lazily by init_db() (called from main.py's lifespan)
rather than at import time, so it's bound to settings.upload_dir as
configured at startup — not whatever it happened to be when this module was
first imported (tests reconfigure settings.upload_dir per-fixture).
"""
import json
import time

from sqlalchemy import Column, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from config import settings

Base = declarative_base()


class ReportRow(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    genre = Column(String)
    director = Column(String)
    created_at = Column(Float, nullable=False)
    deal_score = Column(Integer)
    verdict = Column(String)
    bid_low = Column(String)
    bid_fair = Column(String)
    bid_walk_away = Column(String)
    data = Column(Text, nullable=False)  # full complete_event, as JSON


_SessionLocal: sessionmaker | None = None


def init_db() -> None:
    """(Re)bind the engine to the current settings.upload_dir and create
    tables if needed. Idempotent — safe to call multiple times (each test
    fixture that reconfigures settings.upload_dir calls this again).
    """
    global _SessionLocal
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{settings.upload_dir / 'filmiq.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    _SessionLocal = sessionmaker(bind=engine)


def _session() -> Session:
    if _SessionLocal is None:
        raise RuntimeError("db.init_db() must be called before using the reports DB")
    return _SessionLocal()


def _row_to_summary(row: ReportRow) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "genre": row.genre,
        "director": row.director,
        "created_at": row.created_at,
        "deal_score": row.deal_score,
        "verdict": row.verdict,
        "bid_low": row.bid_low,
        "bid_fair": row.bid_fair,
        "bid_walk_away": row.bid_walk_away,
    }


def _row_to_full(row: ReportRow) -> dict:
    data = json.loads(row.data)
    data["id"] = row.id
    data["title"] = row.title
    data["created_at"] = row.created_at
    return data


def save_report(job_id: str, title: str, complete_event: dict) -> None:
    bid_range = complete_event.get("bid_range") or {}
    session = _session()
    try:
        session.merge(
            ReportRow(
                id=job_id,
                title=title,
                genre=complete_event.get("genre"),
                director=complete_event.get("director"),
                created_at=time.time(),
                deal_score=complete_event.get("deal_score"),
                verdict=complete_event.get("verdict"),
                bid_low=bid_range.get("low"),
                bid_fair=bid_range.get("fair"),
                bid_walk_away=bid_range.get("walk_away"),
                data=json.dumps(complete_event),
            )
        )
        session.commit()
    finally:
        session.close()


def list_reports() -> list[dict]:
    session = _session()
    try:
        rows = session.query(ReportRow).order_by(ReportRow.created_at.desc()).all()
        return [_row_to_summary(r) for r in rows]
    finally:
        session.close()


def get_report(report_id: str) -> dict | None:
    session = _session()
    try:
        row = session.get(ReportRow, report_id)
        return _row_to_full(row) if row is not None else None
    finally:
        session.close()


def get_reports_by_ids(ids: list[str]) -> list[dict]:
    if not ids:
        return []
    session = _session()
    try:
        rows = session.query(ReportRow).filter(ReportRow.id.in_(ids)).all()
        by_id = {r.id: _row_to_full(r) for r in rows}
        # Preserve the caller's requested order (e.g. compare column order).
        return [by_id[i] for i in ids if i in by_id]
    finally:
        session.close()
