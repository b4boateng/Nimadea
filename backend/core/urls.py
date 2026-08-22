# core/urls.py
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    WorkspaceListView,
    WorkspaceDetailView,
    DocumentUploadView,
    DocumentDeleteView,
    AIQueryView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Workspace & Document API Endpoints
    path('api/workspaces/', WorkspaceListView.as_view(), name='workspace-list'),
    path('api/workspaces/<int:pk>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
    path('api/upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('api/documents/<int:pk>/', DocumentDeleteView.as_view(), name='document-delete'),
    path('api/ai-query/', AIQueryView.as_view(), name='ai-query'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)