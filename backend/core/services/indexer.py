from .preprocessor import preprocess_text

def chunk_text(text, chunk_size=200, overlap=50):
    """
    Splits a large string of text into overlapping chunks.
    """
    words = text.split()
    chunks = []
    
    # Sliding window to create chunks with overlaps
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        # Break if we've reached the end of the text
        if i + chunk_size >= len(words):
            break
            
    return chunks

def build_chunked_index(documents_dict, chunk_size=200, overlap=50):
    """
    Builds an inverted index based on text chunks rather than whole documents.
    
    documents_dict: {doc_id: full_text_string}
    
    Returns: 
    - inverted_index: {word: {chunk_id: frequency}}
    - chunk_mapping: {chunk_id: {"doc_id": doc_id, "text": original_chunk_text}}
    """
    inverted_index = {}
    chunk_mapping = {}

    for doc_id, full_text in documents_dict.items():
        # 1. Break the document into chunks
        chunks = chunk_text(full_text, chunk_size, overlap)
        
        for chunk_idx, chunk_text_data in enumerate(chunks):
            # Generate a unique ID for this specific chunk
            chunk_id = f"{doc_id}_chunk_{chunk_idx}"
            
            # 2. Store the raw text for the AI to read later
            chunk_mapping[chunk_id] = {
                "doc_id": doc_id,
                "text": chunk_text_data
            }
            
            # 3. Tokenize and update the inverted index
            tokens = preprocess_text(chunk_text_data)
            for token in tokens:
                if token not in inverted_index:
                    inverted_index[token] = {}
                # Increment the frequency count for this specific chunk
                inverted_index[token][chunk_id] = inverted_index[token].get(chunk_id, 0) + 1
                
    return inverted_index, chunk_mapping