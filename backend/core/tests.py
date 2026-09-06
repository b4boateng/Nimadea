from unittest.mock import patch

from django.test import TestCase

from core.models import Document, DocumentChunk, Workspace
from core.services.ai_service import generate_embedding
from core.services.indexer import build_document_chunks_for_workspace
from core.services.ranker import build_context_from_candidates, hybrid_retrieve_chunks


class RAGScopeTests(TestCase):
    def setUp(self):
        self.workspace_a = Workspace.objects.create(
            name="Workspace A",
            description="Alpha",
        )
        self.workspace_b = Workspace.objects.create(
            name="Workspace B",
            description="Beta",
        )

        self.document_a = Document.objects.create(
            workspace=self.workspace_a,
            title="Alpha Notes",
            extracted_text="Alpha beta gamma delta and study patterns.",
        )
        self.document_b = Document.objects.create(
            workspace=self.workspace_b,
            title="Beta Notes",
            extracted_text="Omega beta theta and practice routines.",
        )

    def test_chunk_generation_scope_is_workspace_safe(self):
        chunks = build_document_chunks_for_workspace(self.workspace_a.id)

        self.assertTrue(chunks.exists())
        self.assertTrue(all(chunk.workspace_id == self.workspace_a.id for chunk in chunks))
        self.assertFalse(any(chunk.document_id == self.document_b.id for chunk in chunks))

        chunk_text = " ".join(chunk.content.lower() for chunk in chunks)
        self.assertIn("alpha", chunk_text)
        self.assertNotIn("omega", chunk_text)

    def test_documentchunk_model_tracks_metadata(self):
        chunk = DocumentChunk.objects.create(
            workspace=self.workspace_a,
            document=self.document_a,
            content="Alpha concept summary",
            chunk_index=0,
            section="Overview",
            subsection="Key ideas",
            page_number=3,
        )

        self.assertEqual(chunk.document_id, self.document_a.id)
        self.assertEqual(chunk.workspace_id, self.workspace_a.id)
        self.assertEqual(chunk.section, "Overview")
        self.assertEqual(chunk.page_number, 3)

    def test_hybrid_retrieval_uses_vector_similarity_and_workspace_scope(self):
        chunk_a = DocumentChunk.objects.create(
            workspace=self.workspace_a,
            document=self.document_a,
            content="Alpha study patterns improve learning retention.",
            chunk_index=0,
            section="Overview",
            embedding=[0.9, 0.1, 0.8],
        )
        chunk_b = DocumentChunk.objects.create(
            workspace=self.workspace_a,
            document=self.document_a,
            content="Omega practice is unrelated to alpha concepts.",
            chunk_index=1,
            section="Extra",
            embedding=[0.1, 0.9, 0.2],
        )
        DocumentChunk.objects.create(
            workspace=self.workspace_b,
            document=self.document_b,
            content="Omega study patterns help with unrelated tasks.",
            chunk_index=0,
            section="Other",
            embedding=[0.2, 0.8, 0.9],
        )

        results = hybrid_retrieve_chunks(
            query="alpha learning retention",
            workspace_id=self.workspace_a.id,
            document_ids=[self.document_a.id],
            limit=2,
        )

        self.assertTrue(results)
        self.assertEqual(results[0]["chunk_id"], chunk_a.id)
        self.assertNotIn(self.workspace_b.id, {item["workspace_id"] for item in results})
        self.assertTrue(results[0]["embedding"])

    def test_context_builder_collects_source_metadata(self):
        candidates = [
            {
                "chunk_id": 1,
                "document_id": self.document_a.id,
                "workspace_id": self.workspace_a.id,
                "content": "Alpha study patterns improve retention.",
                "section": "Overview",
                "subsection": "Key ideas",
                "page_number": 3,
                "score": 0.91,
            }
        ]

        result = build_context_from_candidates(candidates)

        self.assertIn("Alpha study patterns improve retention.", result["context"])
        self.assertEqual(result["sources"][0]["document_id"], self.document_a.id)
        self.assertEqual(result["sources"][0]["section"], "Overview")
        self.assertEqual(result["sources"][0]["page_number"], 3)

    def test_generate_embedding_uses_gemini_provider_when_available(self):
        with patch("core.services.ai_service.requests.post") as mock_post:
            mock_post.return_value.raise_for_status.return_value = None
            mock_post.return_value.json.return_value = {
                "embedding": {"values": [0.1, 0.2, 0.3]}
            }

            with patch.dict("os.environ", {"GEMINI_API_KEY": "demo-key"}, clear=False):
                result = generate_embedding("alpha learning retention")

        self.assertEqual(result, [0.1, 0.2, 0.3])
        mock_post.assert_called_once()

    @patch("core.services.indexer.build_embedding_from_text")
    def test_changed_document_content_regenerates_embedding(self, mock_embedding):
        mock_embedding.return_value = [0.4, 0.5, 0.6]
        document = self.document_a
        document.extracted_text = "Updated semantic content for this document."
        document.save(update_fields=["extracted_text"])

        chunks = build_document_chunks_for_workspace(self.workspace_a.id)

        self.assertEqual(chunks.first().content, document.extracted_text)
        self.assertEqual(chunks.first().embedding, [0.4, 0.5, 0.6])
        self.assertTrue(mock_embedding.called)
