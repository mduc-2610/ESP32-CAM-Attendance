from rest_framework import serializers
from .models import CameraConfiguration, FaceImage

class CameraConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraConfiguration
        fields = ['id', 'name', 'ip_address', 'is_active', 'last_connected', 'created_at', 'updated_at']
        read_only_fields = ['last_connected', 'created_at', 'updated_at']

class FaceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaceImage
        fields = ['id', 'user', 'image_path', 'is_primary', 'created_at']
        read_only_fields = ['created_at']