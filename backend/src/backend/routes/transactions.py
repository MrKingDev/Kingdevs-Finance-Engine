from fastapi import APIRouter


router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
)


@router.get("")
def get_transactions():
    return [
        {
            "id": 1,
            "date": "2026-09-20",
            "merchant": "Walmart",
            "category": "Groceries",
            "bank": "Chase",
            "type": "expense",
            "amount": 54.23,
        },
        {
            "id": 2,
            "date": "2026-09-21",
            "merchant": "Employer",
            "category": "Salary",
            "bank": "Chase",
            "type": "income",
            "amount": 2400.00,
        },
    ]