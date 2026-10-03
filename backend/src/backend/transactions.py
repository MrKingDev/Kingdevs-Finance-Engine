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
            "pie-color": "var(--chart-emerald-2)"
        },
        {
            "id": 2,
            "date": "2026-09-21",
            "merchant": "Employer",
            "category": "Salary",
            "bank": "Chase",
            "type": "income",
            "amount": 2400.00,
            "pie-color": "var(--chart-green-2)"
        },
        {
            "id": 3,
            "date": "2026-09-21",
            "merchant": "Starbucks",
            "category": "Dining",
            "bank": "Chase",
            "type": "expense",
            "amount": 8.47,
            "pie-color": "var(--chart-orange-2)"
        },
        {
            "id": 4,
            "date": "2026-09-22",
            "merchant": "Shell",
            "category": "Gas",
            "bank": "Bank of America",
            "type": "expense",
            "amount": 46.18,
            "pie-color": "var(--chart-amber-2)"
        },
        {
            "id": 5,
            "date": "2026-09-22",
            "merchant": "Netflix",
            "category": "Subscriptions",
            "bank": "Chase",
            "type": "expense",
            "amount": 17.99,
            "pie-color": "var(--chart-violet-2)"
        },
        {
            "id": 6,
            "date": "2026-09-23",
            "merchant": "Amazon",
            "category": "Shopping",
            "bank": "Capital One",
            "type": "expense",
            "amount": 82.64,
            "pie-color": "var(--chart-fuchsia-2)"
        },
        {
            "id": 7,
            "date": "2026-09-23",
            "merchant": "Freelance Client",
            "category": "Freelance",
            "bank": "Chase",
            "type": "income",
            "amount": 650.00,
            "pie-color": "var(--chart-cyan-2)"
        },
        {
            "id": 8,
            "date": "2026-09-24",
            "merchant": "Chipotle",
            "category": "Dining",
            "bank": "Capital One",
            "type": "expense",
            "amount": 15.72,
            "pie-color": "var(--chart-orange-2)"
        },
        {
            "id": 9,
            "date": "2026-09-24",
            "merchant": "National Grid",
            "category": "Utilities",
            "bank": "Chase",
            "type": "expense",
            "amount": 118.45,
            "pie-color": "var(--chart-yellow-2)"
        },
        {
            "id": 10,
            "date": "2026-09-25",
            "merchant": "Target",
            "category": "Shopping",
            "bank": "Bank of America",
            "type": "expense",
            "amount": 63.91,
            "pie-color": "var(--chart-fuchsia-2)"
        },
        {
            "id": 11,
            "date": "2026-09-25",
            "merchant": "Spotify",
            "category": "Subscriptions",
            "bank": "Chase",
            "type": "expense",
            "amount": 11.99,
            "pie-color": "var(--chart-violet-2)"
        },
        {
            "id": 12,
            "date": "2026-09-26",
            "merchant": "Hannaford",
            "category": "Groceries",
            "bank": "Chase",
            "type": "expense",
            "amount": 91.37,
            "pie-color": "var(--chart-emerald-2)"
        },
        {
            "id": 13,
            "date": "2026-09-26",
            "merchant": "Uber",
            "category": "Transportation",
            "bank": "Capital One",
            "type": "expense",
            "amount": 24.56,
            "pie-color": "var(--chart-blue-2)"
        },
        {
            "id": 14,
            "date": "2026-09-27",
            "merchant": "AMC Theatres",
            "category": "Entertainment",
            "bank": "Chase",
            "type": "expense",
            "amount": 32.50,
            "pie-color": "var(--chart-purple-2)"
        },
        {
            "id": 15,
            "date": "2026-09-27",
            "merchant": "CVS",
            "category": "Healthcare",
            "bank": "Bank of America",
            "type": "expense",
            "amount": 21.84,
            "pie-color": "var(--chart-rose-2)"
        },
        {
            "id": 16,
            "date": "2026-09-28",
            "merchant": "Employer",
            "category": "Salary",
            "bank": "Chase",
            "type": "income",
            "amount": 2400.00,
            "pie-color": "var(--chart-green-2)"
        },
        {
            "id": 17,
            "date": "2026-09-28",
            "merchant": "Verizon",
            "category": "Phone",
            "bank": "Chase",
            "type": "expense",
            "amount": 84.99,
            "pie-color": "var(--chart-sky-2)"
        },
        {
            "id": 18,
            "date": "2026-09-28",
            "merchant": "Planet Fitness",
            "category": "Fitness",
            "bank": "Capital One",
            "type": "expense",
            "amount": 24.99,
            "pie-color": "var(--chart-lime-2)"
        },
        {
            "id": 19,
            "date": "2026-09-29",
            "merchant": "Whole Foods",
            "category": "Groceries",
            "bank": "Chase",
            "type": "expense",
            "amount": 76.42,
            "pie-color": "var(--chart-emerald-2)"
        },
        {
            "id": 20,
            "date": "2026-09-29",
            "merchant": "DoorDash",
            "category": "Dining",
            "bank": "Capital One",
            "type": "expense",
            "amount": 38.73,
            "pie-color": "var(--chart-orange-2)"
        },
        {
            "id": 21,
            "date": "2026-09-29",
            "merchant": "Etsy Sale",
            "category": "Side Income",
            "bank": "Bank of America",
            "type": "income",
            "amount": 145.50,
            "pie-color": "var(--chart-teal-2)"
        },
        {
            "id": 22,
            "date": "2026-09-30",
            "merchant": "Apple",
            "category": "Subscriptions",
            "bank": "Chase",
            "type": "expense",
            "amount": 9.99,
            "pie-color": "var(--chart-violet-2)"
        },
        {
            "id": 23,
            "date": "2026-09-30",
            "merchant": "Exxon",
            "category": "Gas",
            "bank": "Bank of America",
            "type": "expense",
            "amount": 51.26,
            "pie-color": "var(--chart-amber-2)"
        },
        {
            "id": 24,
            "date": "2026-09-30",
            "merchant": "Best Buy",
            "category": "Electronics",
            "bank": "Capital One",
            "type": "expense",
            "amount": 129.99,
            "pie-color": "var(--chart-indigo-2)"
        },
        {
            "id": 25,
            "date": "2026-10-01",
            "merchant": "Panera Bread",
            "category": "Dining",
            "bank": "Chase",
            "type": "expense",
            "amount": 13.64,
            "pie-color": "var(--chart-orange-2)"
        },
        {
            "id": 26,
            "date": "2026-10-01",
            "merchant": "Rent Payment",
            "category": "Housing",
            "bank": "Chase",
            "type": "expense",
            "amount": 1250.00,
            "pie-color": "var(--chart-red-2)"
        },
        {
            "id": 27,
            "date": "2026-10-01",
            "merchant": "Interest Payment",
            "category": "Interest",
            "bank": "Bank of America",
            "type": "income",
            "amount": 18.42,
            "pie-color": "var(--chart-cyan-3)"
        },
        {
            "id": 28,
            "date": "2026-10-01",
            "merchant": "Trader Joe's",
            "category": "Groceries",
            "bank": "Capital One",
            "type": "expense",
            "amount": 67.18,
            "pie-color": "var(--chart-emerald-2)"
        },
        {
            "id": 29,
            "date": "2026-10-01",
            "merchant": "Steam",
            "category": "Entertainment",
            "bank": "Chase",
            "type": "expense",
            "amount": 39.99,
            "pie-color": "var(--chart-purple-2)"
        },
        {
            "id": 30,
            "date": "2026-10-01",
            "merchant": "Freelance Client",
            "category": "Freelance",
            "bank": "Chase",
            "type": "income",
            "amount": 425.00,
            "pie-color": "var(--chart-cyan-2)"
        },
    ]