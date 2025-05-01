from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceSessionViewSet, AttendanceReportViewSet

router = DefaultRouter()
router.register(r'sessions', AttendanceSessionViewSet)
router.register(r'reports', AttendanceReportViewSet, basename='attendance-report')

urlpatterns = [
    path('', include(router.urls)),
]