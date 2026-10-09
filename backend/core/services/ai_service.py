import os
import re
import threading
import time
import requests


EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
EMBEDDING_FALLBACK_DIMENSION = 8
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
_model_cache = {}
_model_cache_lock = threading.Lock()


def _model_version(model_name):
    versions = re.findall(r"\d+(?:\.\d+)?", model_name)
    return tuple(float(version) for version in versions) or (0,)


def _available_models(api_key, mode):
    cache_key = mode
    now = time.monotonic()
    with _model_cache_lock:
        cached = _model_cache.get(cache_key)
        if cached and cached[0] > now:
            return cached[1]

    response = requests.get(
        f"{GEMINI_API_BASE}/models", params={"key": api_key}, timeout=20
    )
    response.raise_for_status()
    models = response.json().get("models", [])
    candidates = []
    for model in models:
        name = model.get("name", "").removeprefix("models/")
        methods = model.get("supportedGenerationMethods", [])
        if not name or "generateContent" not in methods:
            continue
        lowered_name = name.lower()
        if mode == "fast" and "flash" not in lowered_name:
            continue
        if any(token in lowered_name for token in ("-tts", "-image", "-audio", "-embedding")):
            continue
        candidates.append(name)

    candidates.sort(key=_model_version, reverse=True)
    with _model_cache_lock:
        _model_cache[cache_key] = (now + 900, candidates)
    return candidates


def _extract_response_text(data):
    candidates = data.get("candidates") or []
    for candidate in candidates:
        parts = (candidate.get("content") or {}).get("parts") or []
        text = "".join(part.get("text", "") for part in parts if part.get("text"))
        if text:
            return text

    prompt_feedback = data.get("promptFeedback") or {}
    block_reason = prompt_feedback.get("blockReason")
    if block_reason:
        return f"System Error: Gemini blocked this request ({block_reason})."

    finish_reason = candidates[0].get("finishReason") if candidates else None
    if finish_reason:
        return f"System Error: Gemini returned no text (finish reason: {finish_reason})."

    raise ValueError("Gemini response did not contain text")


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
        self.model = model

    def generate(self, user_query, context, mode="fast"):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return "System Error: GEMINI_API_KEY environment variable is not set."

        configured_model = self.model or os.environ.get(
            "LLM_FAST_MODEL" if mode == "fast" else "LLM_POWER_MODEL"
        )
        try:
            discovered_models = _available_models(api_key, mode)
        except (requests.exceptions.RequestException, ValueError, TypeError):
            discovered_models = []

        models = []
        auto_model = os.environ.get("LLM_AUTO_MODEL", "true").lower() in {
            "1", "true", "yes", "on"
        }
        if configured_model and not auto_model:
            models.append(configured_model.removeprefix("models/"))
        for discovered_model in discovered_models:
            if discovered_model not in models:
                models.append(discovered_model)
        if configured_model and auto_model and not discovered_models:
            models.append(configured_model.removeprefix("models/"))
        fallback_model = os.environ.get("LLM_FALLBACK_MODEL", "gemini-3.5-flash-lite")
        if fallback_model not in models:
            models.append(fallback_model)
        if not models:
            models = ["gemini-3.6-flash"]
        self.model = models[0]

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
            response = None
            response_format_error = None
            for model in models:
                model_url = (
                    f"{GEMINI_API_BASE}/models/"
                    f"{model}:generateContent?key={api_key}"
                )
                for attempt in range(3):
                    response = requests.post(model_url, json=payload, timeout=60)
                    if response.status_code not in {429, 500, 502, 503, 504}:
                        break
                    if attempt < 2:
                        time.sleep(2 ** attempt)
                if response.status_code in {429, 500, 502, 503, 504}:
                    continue
                response.raise_for_status()
                try:
                    return _extract_response_text(response.json())
                except (KeyError, IndexError, TypeError, ValueError) as error:
                    response_format_error = error
                    continue

            if response_format_error:
                raise response_format_error
            response.raise_for_status()
            return "System Error: Gemini returned no usable response."
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response is not None else "unknown"
            return f"System Error: LLM service returned HTTP {status_code}. Please try again."
        except requests.exceptions.RequestException as e:
            return f"System Error: Failed to reach the LLM service ({e})."
        except (KeyError, IndexError, TypeError, ValueError):
            return "System Error: Gemini returned an empty or unsupported response."


def query_hosted_llm(user_query, context, mode="fast"):
    """Compatibility wrapper for the existing code paths."""
    return GeminiProvider().generate(user_query, context, mode=mode)