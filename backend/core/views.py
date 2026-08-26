import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Workspace, Document, IndexStore
from .serializers import WorkspaceSerializer, DocumentSerializer
from core.services.loader import extract_text_from_file
from core.services.indexer import build_chunked_index
from core.services.ranker import rank_chunks
from core.services.ai_service import query_hosted_llm

class WorkspaceListView(APIView):
    def get(self, request):
        workspaces = Workspace.objects.all().order_by('-created_at')
        serializer = WorkspaceSerializer(workspaces, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = WorkspaceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WorkspaceDetailView(APIView):
    def get(self, request, pk):
        try:
            workspace = Workspace.objects.get(pk=pk)
            return Response(WorkspaceSerializer(workspace).data)
        except Workspace.DoesNotExist:
            return Response({"error": "Workspace not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        """Update studied hours or target hours"""
        try:
            workspace = Workspace.objects.get(pk=pk)
            additional_hours = request.data.get('studied_hours_add', 0)
            if additional_hours:
                workspace.studied_hours = round(workspace.studied_hours + float(additional_hours), 2)
                workspace.save()
            return Response(WorkspaceSerializer(workspace).data)
        except Workspace.DoesNotExist:
            return Response({"error": "Workspace not found."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            workspace = Workspace.objects.get(pk=pk)
            # Remove physical files
            for doc in workspace.documents.all():
                if doc.file and os.path.isfile(doc.file.path):
                    os.remove(doc.file.path)
            
            workspace.delete()
            
            # Rebuild index
            all_docs = Document.objects.all()
            if all_docs.exists():
                doc_dict = {str(d.id): d.extracted_text for d in all_docs}
                inverted_index, chunk_mapping = build_chunked_index(doc_dict)
            else:
                inverted_index, chunk_mapping = {}, {}

            index_store, _ = IndexStore.objects.get_or_create(id=1)
            index_store.inverted_index = inverted_index
            index_store.chunk_mapping = chunk_mapping
            index_store.save()

            return Response({"message": "Workspace deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except Workspace.DoesNotExist:
            return Response({"error": "Workspace not found."}, status=status.HTTP_404_NOT_FOUND)

class DocumentUploadView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get('file')
        workspace_id = request.data.get('workspace_id')

        if not uploaded_file:
            return Response({"error": "No file detected."}, status=status.HTTP_400_BAD_REQUEST)

        workspace = None
        if workspace_id:
            try:
                workspace = Workspace.objects.get(pk=workspace_id)
            except Workspace.DoesNotExist:
                return Response({"error": "Workspace not found."}, status=status.HTTP_404_NOT_FOUND)

        doc = Document.objects.create(
            workspace=workspace,
            title=uploaded_file.name,
            file=uploaded_file
        )
        doc.extracted_text = extract_text_from_file(doc.file.path)
        doc.save()

        # Re-index all active documents
        all_docs = Document.objects.all()
        doc_dict = {str(d.id): d.extracted_text for d in all_docs}
        inverted_index, chunk_mapping = build_chunked_index(doc_dict)

        index_store, _ = IndexStore.objects.get_or_create(id=1)
        index_store.inverted_index = inverted_index
        index_store.chunk_mapping = chunk_mapping
        index_store.save()

        return Response({"message": "Document uploaded and indexed successfully.", "doc_id": doc.id}, status=status.HTTP_201_CREATED)

class DocumentDeleteView(APIView):
    def delete(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
            if doc.file and os.path.isfile(doc.file.path):
                os.remove(doc.file.path)
            doc.delete()

            # Rebuild index
            all_docs = Document.objects.all()
            if all_docs.exists():
                doc_dict = {str(d.id): d.extracted_text for d in all_docs}
                inverted_index, chunk_mapping = build_chunked_index(doc_dict)
            else:
                inverted_index, chunk_mapping = {}, {}

            index_store, _ = IndexStore.objects.get_or_create(id=1)
            index_store.inverted_index = inverted_index
            index_store.chunk_mapping = chunk_mapping
            index_store.save()

            return Response({"message": "Document deleted."}, status=status.HTTP_204_NO_CONTENT)
        except Document.DoesNotExist:
            return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
class AIQueryView(APIView):
    def post(self, request):
        query = request.data.get('query')
        selected_doc_ids = request.data.get('document_ids', [])
        
        # Allows the frontend to specify a fast or complex task model
        mode = request.data.get('mode', 'fast') 

        if not query:
            return Response({"error": "No query provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Filter strictly to the chosen files
        if selected_doc_ids:
            docs = Document.objects.filter(id__in=selected_doc_ids)
        else:
            docs = Document.objects.all()

        doc_dict = {str(d.id): d.extracted_text for d in docs}

        if not doc_dict:
            return Response(
                {"ai_response": "Please upload and select at least one document to chat with."}, 
                status=status.HTTP_200_OK
            )

        # 1. Build a dynamic index strictly scoped to the active documents
        inverted_index, chunk_mapping = build_chunked_index(doc_dict)
        
        # 2. Rank and extract the top text chunks as strings
        top_chunks = rank_chunks(query, inverted_index, chunk_mapping)
        
        # 3. Combine the chunks into a single context string
        if not top_chunks:
            # Fallback to the beginning of the documents if no specific match is found
            context = "\n---\n".join(list(doc_dict.values())[:2])[:2500]
        else:
            context = "\n---\n".join(top_chunks)

        # 4. Query the hosted Gemini LLM
        ai_response = query_hosted_llm(query, context, mode=mode)
        
        return Response({
            "query": query, 
            "ai_response": ai_response
        })