from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CameraConfigurationViewSet

router = DefaultRouter()
router.register(r'config', CameraConfigurationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]