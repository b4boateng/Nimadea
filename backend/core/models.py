from django.db import models
from django.contrib.auth.models import User


class Workspace(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workspaces',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    target_hours = models.PositiveIntegerField(default=10)
    studied_hours = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=255, blank=True)


class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    timezone = models.CharField(max_length=64, default='UTC')
    email_notifications = models.BooleanField(default=True)


class Document(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='documents',
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/', blank=True, null=True)
    extracted_text = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='documents',
        null=True,
        blank=True,
    )


class DocumentChunk(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='chunks',
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='chunks',
    )
    content = models.TextField()
    chunk_index = models.PositiveIntegerField(default=0)
    section = models.CharField(max_length=255, blank=True, default='')
    subsection = models.CharField(max_length=255, blank=True, default='')
    page_number = models.PositiveIntegerField(blank=True, null=True)
    embedding = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'document', 'chunk_index'],
                name='unique_document_chunk_index',
            )
        ]
        ordering = ['document_id', 'chunk_index']

    def __str__(self):
        return f"{self.document.title} chunk {self.chunk_index}"


class IndexStore(models.Model):
    inverted_index = models.JSONField(default=dict)
    chunk_mapping = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Index Store ({self.updated_at})"