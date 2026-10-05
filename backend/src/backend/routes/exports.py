"""Monthly download endpoints. No export writes to the database or filesystem."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.exports import export_years, monthly_report, transaction_csv
from backend.services.report_pdf import pdf_report

router = APIRouter(prefix="/exports", tags=["Exports"])
Month = Annotated[int, Query(ge=1, le=12)]
Year = Annotated[int, Query(ge=1, le=9999)]


class ExportPeriods(BaseModel):
    years: list[int]


def download(contents: bytes, media_type: str, filename: str) -> Response:
    return Response(contents, media_type=media_type, headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })


@router.get("/periods", response_model=ExportPeriods, summary="Available export years")
def periods(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return ExportPeriods(years=export_years(db))


@router.get("/transactions.csv", response_class=Response, summary="Download monthly transactions as CSV",
            responses={200: {"content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}}},
                       413: {"description": "Month exceeds 10,000 transactions"}})
def csv_download(month: Month, year: Year, db: Session = Depends(get_db)):
    """UTF-8 CSV with explicit income/expense types and spreadsheet-safe text. Empty months include headers."""
    report = monthly_report(db, year, month)
    return download(transaction_csv(report), "text/csv", f"finance-transactions-{year:04}-{month:02}.csv")


@router.get("/report.pdf", response_class=Response, summary="Download a styled or basic monthly PDF",
            responses={200: {"content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}},
                       413: {"description": "Month exceeds 10,000 transactions"}})
def pdf_download(month: Month, year: Year, style: Literal["styled", "basic"] = "styled",
                 db: Session = Depends(get_db)):
    """USD totals, expense categories, and all monthly transactions. Styled adds the designed overview cover."""
    report = monthly_report(db, year, month)
    return download(pdf_report(report, styled=style == "styled"), "application/pdf",
                    f"finance-report-{year:04}-{month:02}-{style}.pdf")
