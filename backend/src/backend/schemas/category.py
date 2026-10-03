from typing import Annotated

from pydantic import BaseModel, StringConstraints


CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class CategoryResponse(BaseModel):
    name: str
