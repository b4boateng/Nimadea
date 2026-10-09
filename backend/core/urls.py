# core/urls.py
from django.contrib import admin
from django.urls import path
from django.conf import settings
from rest_framework.authtoken.views import obtain_auth_token

from .views import (
    WorkspaceListView,
    WorkspaceDetailView,
    DocumentUploadView,
    DocumentDeleteView,
    DocumentDownloadView,
    AIQueryView,
    ProfileView,
    RegisterView,
    SettingsView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Workspace & Document API Endpoints
    path('api/workspaces/', WorkspaceListView.as_view(), name='workspace-list'),
    path('api/workspaces/<int:pk>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
    path('api/upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('api/documents/<int:pk>/', DocumentDeleteView.as_view(), name='document-delete'),
    path('api/ai-query/', AIQueryView.as_view(), name='ai-query'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', obtain_auth_token, name='login'),
    path('api/auth/profile/', ProfileView.as_view(), name='profile'),
    path('api/auth/settings/', SettingsView.as_view(), name='settings'),
    path('api/documents/<int:pk>/download/', DocumentDownloadView.as_view(), name='document-download'),
]
