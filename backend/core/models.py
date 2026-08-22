from django.db import models

# 1. Define Workspace FIRST
class Workspace(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    target_hours = models.PositiveIntegerField(default=10)
    studied_hours = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# 2. Define Document SECOND
class Document(models.Model):
    workspace = models.ForeignKey(
        Workspace, 
        on_delete=models.CASCADE, 
        related_name='documents', 
        null=True, 
        blank=True
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    extracted_text = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# 3. IndexStore
class IndexStore(models.Model):
    inverted_index = models.JSONField(default=dict)
    chunk_mapping = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Index Store ({self.updated_at})"