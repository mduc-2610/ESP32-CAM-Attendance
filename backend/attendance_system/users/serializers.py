from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'uuid', 'name', 'email', 'tag', 'created_at', 'updated_at']
        read_only_fields = ['uuid', 'created_at', 'updated_at']
