import os
import requests

def query_hosted_llm(user_query, context, mode="fast"):
    """
    Takes the extracted context block and queries the Hosted LLM (Gemini).
    """
    # 1. Select the model from environment variables based on task complexity
    model = (
    os.environ.get("LLM_FAST_MODEL", "gemini-2.5-flash")
    if mode == "fast"
    else os.environ.get("LLM_POWER_MODEL", "gemini-2.5-pro")
)
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return "System Error: GEMINI_API_KEY environment variable is not set."

    if not context or context.strip() == "":
        context = "No specific document context found."

    # 2. Construct the RAG prompt using the structured template
    prompt = f"""You are an intelligent AI study assistant. 
Use the supplied study material as the primary source of truth.
If the material does not contain enough information, say so rather than inventing facts.

RETRIEVED CONTEXT:
{context}

STUDENT QUESTION:
{user_query}

Answer clearly and at an appropriate academic level.
"""

    # 3. Send the request to the Google Gemini API
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    try:
        response = requests.post(
    url,
    headers={
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    },
    json=payload,
    timeout=180,
)
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
        
    except requests.exceptions.RequestException as e:
        return f"Hosted LLM Connection Error: {str(e)}"
    except (KeyError, IndexError):
        return "Error: Received an unexpected response structure from the hosted LLM."