import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Workspace, Document, IndexStore
from .serializers import WorkspaceSerializer, DocumentSerializer
from core.services.loader import extract_text_from_file
from core.services.indexer import build_chunked_index, build_document_chunks_for_workspace
from core.services.ranker import build_context_from_candidates, hybrid_retrieve_chunks
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

        if doc.workspace_id:
            build_document_chunks_for_workspace(doc.workspace_id)

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
        workspace_id = request.data.get('workspace_id')

        mode = request.data.get('mode', 'fast')

        if not query:
            return Response({"error": "No query provided."}, status=status.HTTP_400_BAD_REQUEST)

        docs = Document.objects.all()
        if workspace_id:
            try:
                workspace = Workspace.objects.get(pk=workspace_id)
            except Workspace.DoesNotExist:
                return Response({"error": "Workspace not found."}, status=status.HTTP_404_NOT_FOUND)
            docs = docs.filter(workspace=workspace)

        if selected_doc_ids:
            try:
                selected_doc_ids = [int(doc_id) for doc_id in selected_doc_ids]
            except (TypeError, ValueError):
                return Response(
                    {"error": "document_ids must contain only valid document IDs."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            scoped_docs = docs.filter(id__in=selected_doc_ids)
            if scoped_docs.count() != len(set(selected_doc_ids)):
                return Response(
                    {"error": "One or more selected documents are outside this workspace."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            docs = scoped_docs

        doc_dict = {str(d.id): d.extracted_text for d in docs}

        if not doc_dict:
            return Response(
                {"ai_response": "Please upload and select at least one document to chat with."},
                status=status.HTTP_200_OK,
            )

        if workspace_id:
            build_document_chunks_for_workspace(workspace_id)

        candidates = hybrid_retrieve_chunks(
            query=query,
            workspace_id=workspace_id,
            document_ids=selected_doc_ids or None,
            limit=5,
        )

        if candidates:
            retrieval_context = build_context_from_candidates(candidates)
            context = retrieval_context['context']
            source_metadata = retrieval_context['sources']
        else:
            context = "\n---\n".join(list(doc_dict.values())[:2])[:2500]
            source_metadata = []

        ai_response = query_hosted_llm(query, context, mode=mode)

        return Response({
            "query": query,
            "ai_response": ai_response,
            "sources": source_metadata,
        })