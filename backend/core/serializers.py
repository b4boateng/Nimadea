from rest_framework import serializers
from .models import Document, Workspace

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'uploaded_at']

class WorkspaceSerializer(serializers.ModelSerializer):
    # This nested field automatically populates all documents linked to this workspace
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Workspace
        fields = [
            'id', 
            'name', 
            'description', 
            'target_hours', 
            'studied_hours', 
            'created_at', 
            'documents'
        ]