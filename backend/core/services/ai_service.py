import os
import requests


EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
EMBEDDING_FALLBACK_DIMENSION = 8


def generate_embedding(text):
    """Return a full Gemini vector, or a zero vector when embeddings are unavailable."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return [0.0] * EMBEDDING_FALLBACK_DIMENSION

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{EMBEDDING_MODEL}:embedContent?key="
        f"{api_key}"
    )

    payload = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
    }

    try:
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        values = data.get("embedding", {}).get("values")
        if values:
            return values
        return [0.0] * EMBEDDING_FALLBACK_DIMENSION
    except requests.exceptions.RequestException:
        return [0.0] * EMBEDDING_FALLBACK_DIMENSION
    except (KeyError, TypeError, ValueError):
        return [0.0] * EMBEDDING_FALLBACK_DIMENSION


class GeminiProvider:
    def __init__(self, model=None):
        self.model = model or os.environ.get("LLM_FAST_MODEL", "gemini-3.6-flash")

    def generate(self, user_query, context, mode="fast"):
        model = os.environ.get(
            "LLM_FAST_MODEL" if mode == "fast" else "LLM_POWER_MODEL",
            "gemini-3.6-flash" if mode == "fast" else "gemini-3.6-flash",
        )
        self.model = model

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return "System Error: GEMINI_API_KEY environment variable is not set."

        if not context or not context.strip():
            context = "No specific study material was retrieved for this question."

        prompt = f"""
You are an expert AI study assistant and technical tutor.

Use the retrieved study material as the primary source of truth.
If the material is incomplete, supplement it carefully and say that the answer
includes relevant general academic knowledge.

Do not fabricate that a fact came from the student's material.

RETRIEVED STUDY MATERIAL
{context}

STUDENT QUESTION
{user_query}
"""

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={api_key}"
        )

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]}
            ]
        }

        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except requests.exceptions.RequestException as e:
            return f"System Error: Failed to reach the LLM service ({e})."
        except (KeyError, IndexError):
            return "System Error: Unexpected response format from the LLM service."


def query_hosted_llm(user_query, context, mode="fast"):
    """Compatibility wrapper for the existing code paths."""
    return GeminiProvider().generate(user_query, context, mode=mode)