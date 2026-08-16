from django.urls import path
from .views import DocumentUploadView, AIQueryView

urlpatterns = [
    path('api/upload/', DocumentUploadView.as_view(), name='document-upload'),
    # Add the query endpoint here:
    path('api/query/', AIQueryView.as_view(), name='ai-query'),
]