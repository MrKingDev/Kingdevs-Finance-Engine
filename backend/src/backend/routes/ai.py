import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai", tags=["AI"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


@router.post("/chat")
async def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(400, "Enter a message.")

    base_url = os.getenv(
        "OLLAMA_BASE_URL", "http://127.0.0.1:11434"
    ).rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "qwen3:4b-instruct")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{base_url}/api/chat",
                json={
                    "model": model,
                    "stream": False,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a helpful finance assistant. "
                                "You do not have access to the user's "
                                "transactions, balances, or budgets. "
                                "Never invent their financial records."
                            ),
                        },
                        {"role": "user", "content": message},
                    ],
                    "options": {"num_predict": 512},
                },
            )
            response.raise_for_status()
            reply = response.json()["message"]["content"]
            if not isinstance(reply, str) or not reply.strip():
                raise ValueError("Empty reply")
    except httpx.TimeoutException:
        raise HTTPException(504, "The local model took too long.") from None
    except httpx.RequestError:
        raise HTTPException(
            503, "Cannot connect to Ollama. Make sure it is running."
        ) from None
    except (httpx.HTTPStatusError, ValueError, KeyError, TypeError):
        raise HTTPException(
            502, "Ollama could not answer. Check the model is installed."
        ) from None

    return {"reply": reply}