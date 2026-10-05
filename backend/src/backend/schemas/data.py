from pydantic import BaseModel


class ClearDataRequest(BaseModel):
    confirmation: str


class ClearDataResponse(BaseModel):
    message: str
