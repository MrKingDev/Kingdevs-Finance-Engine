from datetime import date as Date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel, StringConstraints

from backend.schemas.category import CategoryName

MAX_CSV_BYTES = 50_000_000
MAX_IMPORT_ROWS = 500_000
MAX_PREVIEW_ROWS = 1000
MAX_COMMIT_ROWS = 1000  # Edited JSON rows; whole-file imports use the streaming endpoint.
BankName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
MerchantName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
AmountMode = Literal["auto", "signed", "positive_expense", "debit_credit", "type_column"]
ExpenseSign = Literal["positive", "negative"]
TransactionType = Literal["income", "expense"]
DateFormat = Literal["mdy", "dmy", "iso"]


class CSVTypeOverrides(RootModel[dict[Annotated[int, Field(ge=2)], TransactionType]]):
    root: dict[Annotated[int, Field(ge=2)], TransactionType] = Field(max_length=MAX_PREVIEW_ROWS)


class CSVColumnMapping(BaseModel):
    date: str | None = None
    merchant: str | None = None
    amount: str | None = None
    debit: str | None = None
    credit: str | None = None
    type: str | None = None
    category: str | None = None
    model_config = ConfigDict(extra="forbid")


class CSVPreviewRow(BaseModel):
    row_number: int
    date: Date | None = None
    merchant: str = ""
    amount: Decimal | None = None
    type: TransactionType | None = None
    source_amount: str = ""
    source_type: str = ""
    matched_rule: str | None = None
    source_category: str = ""
    category: str | None = None
    duplicate: bool = False
    errors: list[str] = Field(default_factory=list)


class CSVPreviewResponse(BaseModel):
    bank: str
    columns: list[str]
    mapping: CSVColumnMapping
    amount_mode: AmountMode
    date_format: DateFormat
    rows: list[CSVPreviewRow]
    errors: list[str] = Field(default_factory=list)
    total_rows: int = 0
    valid_rows: int = 0
    duplicate_rows: int = 0
    needs_direction: bool = False
    bulk_import: bool = False
    missing_categories: int = 0
    expense_rows: int = 0
    income_rows: int = 0
    first_issue: str | None = None


class CSVImportRow(BaseModel):
    row_number: int = Field(ge=2)
    date: Date
    merchant: MerchantName
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    type: Literal["income", "expense"]
    category: CategoryName
    model_config = ConfigDict(extra="forbid")


class CSVImportRequest(BaseModel):
    bank: BankName
    rows: list[CSVImportRow] = Field(min_length=1, max_length=MAX_COMMIT_ROWS)
    model_config = ConfigDict(extra="forbid")


class CSVImportResponse(BaseModel):
    imported: int
    skipped_duplicates: int
