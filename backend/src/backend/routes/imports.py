from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.import_csv import (
    MAX_CSV_BYTES, AmountMode, BankName, CSVColumnMapping, CSVImportRequest,
    CSVImportResponse, CSVPreviewResponse, CSVTypeOverrides, DateFormat, ExpenseSign,
)
from backend.services.csv_import import import_csv_rows
from backend.services.csv_stream import process_file

router = APIRouter(
    prefix="/imports",
    tags=["Imports"],
)


@router.post("/csv/preview", response_model=CSVPreviewResponse)
def preview_csv(
    bank: Annotated[BankName, Form()],
    file: Annotated[UploadFile, File()],
    amount_mode: AmountMode = Form("auto"),
    date_format: DateFormat = Form("mdy"),
    mapping: str | None = Form(None),
    expense_sign: ExpenseSign | None = Form(None),
    type_overrides: str | None = Form(None),
    default_category: str | None = Form(None, max_length=100),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(422, "Choose a .csv file.")
    try:
        columns = CSVColumnMapping.model_validate_json(mapping) if mapping else None
    except ValidationError:
        raise HTTPException(422, "Column mapping must be a JSON object of supported fields and CSV column names.") from None
    try:
        overrides = CSVTypeOverrides.model_validate_json(type_overrides).root if type_overrides else {}
    except ValidationError:
        raise HTTPException(422, "Row types must map CSV row numbers to income or expense.") from None
    return process_file(db, file.file, bank, columns, amount_mode, date_format, expense_sign, overrides, default_category)


@router.post("/csv/file", response_model=CSVImportResponse,
             summary="Import an entire CSV, up to 500,000 rows and 50 MB")
def commit_csv_file(
    bank: Annotated[BankName, Form()], file: Annotated[UploadFile, File()],
    amount_mode: AmountMode = Form("auto"), date_format: DateFormat = Form("mdy"),
    mapping: str | None = Form(None), expense_sign: ExpenseSign | None = Form(None),
    default_category: str | None = Form(None, max_length=100), db: Session = Depends(get_db),
):
    """Validates the full file again. Batches share one transaction; any invalid row rolls back everything."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(422, "Choose a .csv file.")
    try:
        columns = CSVColumnMapping.model_validate_json(mapping) if mapping else None
    except ValidationError:
        raise HTTPException(422, "Column mapping must be a JSON object of supported fields and CSV column names.") from None
    return process_file(db, file.file, bank, columns, amount_mode, date_format, expense_sign,
                        default_category=default_category, commit=True)


@router.post("/csv/commit", response_model=CSVImportResponse)
def commit_csv(request: CSVImportRequest, db: Session = Depends(get_db)):
    return import_csv_rows(db, request)
