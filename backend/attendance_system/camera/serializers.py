from rest_framework import serializers
from .models import CameraConfiguration, FaceImage
from urllib.parse import urljoin
from django.conf import settings
import os

class CameraConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraConfiguration
        fields = ['id', 'name', 'ip_address', 'is_active', 'last_connected', 'created_at', 'updated_at']
        read_only_fields = ['last_connected', 'created_at', 'updated_at']

class FaceImageSerializer(serializers.ModelSerializer):
    image_path = serializers.SerializerMethodField()
    
    def get_image_path(self, obj):
        request = self.context.get('request')
        if request:
            base_url = f"{request.scheme}://{request.get_host()}"
            return urljoin(base_url, os.path.join(settings.MEDIA_URL, str(obj.image_path)))
        return None

    class Meta:
        model = FaceImage
        fields = ['id', 'user', 'image_path', 'is_primary', 'created_at']
        read_only_fields = ['created_at']