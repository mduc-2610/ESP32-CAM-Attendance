# users/serializers.py
from rest_framework import serializers
from .models import User, UserTag

class UserTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTag
        fields = ['id', 'name', 'description']

class UserSerializer(serializers.ModelSerializer):
    tags = UserTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        source='tags',
        queryset=UserTag.objects.all(),
        many=True,
        required=False,
        write_only=True
    )
    
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'tags', 'tag_ids', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        user = User.objects.create(**validated_data)
        user.tags.set(tags)
        return user
    
    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if tags is not None:
            instance.tags.set(tags)
        
        return instance