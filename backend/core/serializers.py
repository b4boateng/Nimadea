from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Document, UserProfile, UserSettings, Workspace


class RegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        UserSettings.objects.create(user=user)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['display_name']


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ['timezone', 'email_notifications']

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