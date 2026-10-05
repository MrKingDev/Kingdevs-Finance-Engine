from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.schemas.category import CategoryName
from backend.schemas.import_csv import TransactionType


class RuleWrite(BaseModel):
    match_text: str = Field(min_length=1, max_length=100)
    type: TransactionType
    category: CategoryName | None = None
    enabled: bool = True
    model_config = ConfigDict(extra="forbid")

    @field_validator("match_text", mode="before")
    @classmethod
    def normalize_match(cls, value):
        return " ".join(value.lower().split()) if isinstance(value, str) else value


class RuleResponse(RuleWrite):
    id: int
    model_config = ConfigDict(from_attributes=True)
