from django.db import transaction

from core.models import Document, DocumentChunk
from core.services.ai_service import generate_embedding
from .preprocessor import preprocess_text


def build_embedding_from_text(text, dimension=8):
    """Generate a real or fallback embedding vector for retrieval."""
    embedding = generate_embedding(text)
    if not embedding or all(v == 0.0 for v in embedding):
        tokens = preprocess_text(text)
        if not tokens:
            return [0.0] * dimension

        frequencies = {}
        for token in tokens:
            frequencies[token] = frequencies.get(token, 0) + 1

        fallback = [0.0] * dimension
        for idx, token in enumerate(sorted(frequencies.keys())):
            value = frequencies[token]
            vector_position = idx % dimension
            fallback[vector_position] += float(value)

        norm = sum(v * v for v in fallback) ** 0.5 or 1.0
        return [float(v / norm) for v in fallback]

    return embedding


def chunk_text(text, chunk_size=200, overlap=50):
    """
    Splits a large string into overlapping chunks while preserving as much
    document structure as possible for later retrieval and metadata tracking.
    """
    if not text:
        return []

    words = text.split()
    if not words:
        return []

    step = max(1, chunk_size - overlap)
    chunks = []

    for start in range(0, len(words), step):
        chunk = " ".join(words[start:start + chunk_size])
        chunks.append(chunk)
        if start + chunk_size >= len(words):
            break

    return chunks


def build_document_chunks_for_workspace(workspace_id, chunk_size=200, overlap=50):
    """Create and return the chunk records for every document in a workspace."""
    workspace = Document._meta.get_field('workspace').remote_field.model.objects.get(pk=workspace_id)
    created_chunks = []

    for document in workspace.documents.all():
            if not document.extracted_text:
                continue

            chunks = chunk_text(document.extracted_text, chunk_size=chunk_size, overlap=overlap)
            for chunk_index, chunk_content in enumerate(chunks):
                chunk, _ = DocumentChunk.objects.get_or_create(
                    workspace=workspace,
                    document=document,
                    chunk_index=chunk_index,
                    defaults={
                        'content': chunk_content,
                        'section': '',
                        'subsection': '',
                        'page_number': None,
                        'embedding': build_embedding_from_text(chunk_content),
                    },
                )
                content_changed = chunk.content != chunk_content
                if content_changed:
                    chunk.content = chunk_content
                    chunk.embedding = build_embedding_from_text(chunk_content)
                if not chunk.embedding:
                    chunk.embedding = build_embedding_from_text(chunk_content)
                chunk.save(update_fields=['content', 'embedding'])
                created_chunks.append(chunk)
    return DocumentChunk.objects.filter(workspace_id=workspace_id).order_by('document_id', 'chunk_index')


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
        chunks = chunk_text(full_text, chunk_size, overlap)

        for chunk_idx, chunk_text_data in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{chunk_idx}"
            chunk_mapping[chunk_id] = {
                "doc_id": doc_id,
                "text": chunk_text_data,
            }

            tokens = preprocess_text(chunk_text_data)
            for token in tokens:
                if token not in inverted_index:
                    inverted_index[token] = {}
                inverted_index[token][chunk_id] = inverted_index[token].get(chunk_id, 0) + 1

    return inverted_index, chunk_mapping