# attendance_system/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from users.views import UserViewSet, UserTagViewSet
from attendance.views import AttendanceSessionViewSet
from camera.views import CameraConfigurationViewSet, FaceRecognitionViewSet

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'user-tags', UserTagViewSet)  # Add UserTag endpoints
router.register(r'attendance/sessions', AttendanceSessionViewSet)
router.register(r'camera/configs', CameraConfigurationViewSet)
router.register(r'face-recognition', FaceRecognitionViewSet, basename='face-recognition')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('rest_framework.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)