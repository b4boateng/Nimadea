from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from .models import Document
from .serializers import DocumentSerializer
from .models import Document, IndexStore
from .services.loader import extract_text_from_file
from .services.indexer import build_chunked_index
from .services.ranker import rank_results
from .services.ai_service import search_documents_and_query_ollama

class DocumentUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        
        # --- NEW SAFETY CHECK ---
        if not uploaded_file:
            return Response(
                {"error": "No file detected. Please ensure the form-data key is named exactly 'file'."}, 
                status=400
            )
        # ------------------------

        doc = Document.objects.create(title=uploaded_file.name, file=uploaded_file)
        
        # 1. Extract text immediately upon upload
        doc.extracted_text = extract_text_from_file(doc.file.path)
        doc.save()

        # 2. Retrieve all documents to rebuild the global index
        all_docs = Document.objects.all()
        doc_dict = {str(d.id): d.extracted_text for d in all_docs}
        
        # 3. Build the chunked index and mapping
        inverted_index, chunk_mapping = build_chunked_index(doc_dict)
        
        # 4. Save to Database (We only ever need one row in this table)
        index_store, created = IndexStore.objects.get_or_create(id=1)
        index_store.inverted_index = inverted_index
        index_store.chunk_mapping = chunk_mapping
        index_store.save()

        return Response({"message": "File uploaded and index updated successfully!", "doc_id": doc.id})

class AIQueryView(APIView):
    def post(self, request):
        query = request.data.get('query')
        
        # 1. Instantly fetch the pre-built index from the database!
        index_store = IndexStore.objects.first()
        
        if not index_store or not index_store.inverted_index:
            return Response({"error": "Index is empty. Please upload documents first."})

        # 2. Pass the pre-built data directly to your TF-IDF ranker
        ranked_chunks = rank_results(query, index_store.inverted_index, index_store.chunk_mapping)
        
        # 3. Hand the ranked chunks and mapping to Ollama to generate an answer
        ai_response = search_documents_and_query_ollama(query, ranked_chunks, index_store.chunk_mapping)

        return Response({
            "query": query,
            "ai_response": ai_response
        })




class DocumentListView(APIView):
    def get(self, request):
        documents = Document.objects.all().order_by('-uploaded_at')
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)