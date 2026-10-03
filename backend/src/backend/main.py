from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Calls routs
from .routes.transactions import router as transactions_router
from .routes.categories import router as categories_router
from .routes.budgets import router as budgets_router

app = FastAPI(
    title="KingDev's Finance Engine API",
    version="0.1.0",
)

# Allows browser to call from API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(categories_router)

@app.get("/")
def root():
    return {"message": "Finance Engine API"}

@app.get("/health")
def health_check():
    return {"status":"Ok"}
