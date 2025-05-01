# users/views.py
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import User, UserTag
from .serializers import UserSerializer, UserTagSerializer

class UserTagViewSet(viewsets.ModelViewSet):
    queryset = UserTag.objects.all()
    serializer_class = UserTagSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Get all users with this tag"""
        tag = self.get_object()
        users = tag.users.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'email', 'tags__name']  # Note: search by tag name
    
    @action(detail=True, methods=['get'])
    def face_images(self, request, pk=None):
        """Get face images for a user"""
        user = self.get_object()
        
        # This is just a placeholder - implement based on your FaceImage model
        # Assuming there's a model for face images related to users
        face_images = []  # FaceImage.objects.filter(user=user)
        
        # Mock data for demonstration
        user_data = UserSerializer(user).data
        
        # Return user data and face images
        return Response({
            'user': user_data,
            'images': face_images
        })
    
    @action(detail=False, methods=['get'])
    def by_tag(self, request):
        """Filter users by tag"""
        tag_id = request.query_params.get('tag_id')
        if not tag_id:
            return Response({"error": "tag_id parameter is required"}, status=400)
        
        tag = get_object_or_404(UserTag, id=tag_id)
        users = tag.users.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)