import math
from .preprocessor import preprocess_text

def rank_results(query, inverted_index, chunk_mapping):
    """
    Ranks chunks using TF-IDF instead of raw term frequency.
    Requires the chunk_mapping to determine total number of chunks (N).
    """
    query_tokens = preprocess_text(query)
    chunk_scores = {}
    
    # N is the total number of chunks in the entire database
    N = len(chunk_mapping) 

    for token in query_tokens:
        if token in inverted_index:
            # DF (Document Frequency): How many chunks contain this specific word?
            DF = len(inverted_index[token])
            
            # IDF (Inverse Document Frequency): Penalize common words
            IDF = math.log(N / float(DF)) if DF > 0 else 0
            
            for chunk_id, TF in inverted_index[token].items():
                # TF (Term Frequency): How many times does the word appear in this specific chunk?
                tfidf_score = TF * IDF
                
                # Accumulate the score for the chunk
                chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + tfidf_score

    # Sort chunks by highest TF-IDF score using Timsort 
    ranked_chunks = sorted(chunk_scores.items(), key=lambda x: x[1], reverse=True)
    
    return ranked_chunks