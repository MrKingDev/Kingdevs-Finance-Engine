from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from backend.category_colors import CategoryColor


CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class CategoryCreate(BaseModel):
    name: CategoryName
    color: CategoryColor


class CategoryColorUpdate(BaseModel):
    color: CategoryColor


class CategoryResponse(BaseModel):
    name: str
    color: CategoryColor
    model_config = ConfigDict(from_attributes=True)


class CategoryColorOption(BaseModel):
    value: CategoryColor
    label: str
