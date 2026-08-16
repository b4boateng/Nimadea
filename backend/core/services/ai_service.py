import requests

# The default address for a local Ollama instance
OLLAMA_API_URL = "http://host.docker.internal:11434/api/generate"

def search_documents_and_query_ollama(user_query, ranked_chunks, chunk_mapping, model_name="llama3"):
    """
    Takes the ranked text chunks, builds a context block, and queries Ollama.
    """
    # 1. Extract the most relevant context chunks (e.g., top 5 highest scoring chunks)
    top_chunks = ranked_chunks[:5]
    
    context_texts = []
    for chunk_id, score in top_chunks:
        # Retrieve the actual text using the chunk lookup table
        chunk_data = chunk_mapping.get(chunk_id)
        if chunk_data:
            context_texts.append(chunk_data["text"])
    
    # Combine the top chunks into a single string separated by dashes
    relevant_context = "\n\n---\n\n".join(context_texts)
    
    if not relevant_context:
        relevant_context = "No specific document context found."

    # 2. Construct the RAG prompt for Ollama
    prompt = f"""
    You are an intelligent AI assistant. Answer the user question based ONLY on the context provided below. 
    If the context does not contain the answer, clearly state "I don't have enough information to answer that based on the uploaded documents." Do not use outside knowledge.

    Context:
    {relevant_context}

    Question: 
    {user_query}

    Answer:
    """

    # 3. Send the request to the local Ollama instance
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload)
        if response.status_code == 200:
            return response.json().get("response", "")
        else:
            return f"Ollama API Error: {response.status_code}"
    except requests.exceptions.RequestException:
        return "Failed to connect to Ollama. Ensure Ollama is running on port 11434."