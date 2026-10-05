from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from .database import get_db

# Calls routs
from .routes.transactions import router as transactions_router
from .routes.categories import router as categories_router
from .routes.budgets import router as budgets_router
from .routes.data import router as data_router
from .routes.imports import router as imports_router
from .routes.rules import router as rules_router
from .routes.subscriptions import router as subscriptions_router
from .routes.exports import router as exports_router

app = FastAPI(
    title="KingDev's Finance Engine API",
    version="0.1.2",
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
app.include_router(data_router)
app.include_router(imports_router)
app.include_router(rules_router)
app.include_router(subscriptions_router)
app.include_router(exports_router)

@app.get("/")
def root():
    return {"message": "Finance Engine API"}

@app.get("/health")
def health_check():
    return {"status":"Ok"}


@app.get("/health/ready", tags=["Health"])
def database_readiness(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "Ok"}
