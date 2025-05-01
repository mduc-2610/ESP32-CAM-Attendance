from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import JsonResponse
from .models import User
from .serializers import UserSerializer
import os
import uuid
from django.conf import settings

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'email', 'tag']
    
    @action(detail=True, methods=['get'])
    def face_images(self, request, pk=None):
        user = self.get_object()
        user_folder = os.path.join(settings.MEDIA_ROOT, str(user.uuid))
        
        if not os.path.exists(user_folder):
            os.makedirs(user_folder, exist_ok=True)
            
        images = []
        if os.path.exists(user_folder):
            for file in os.listdir(user_folder):
                if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    images.append({
                        'name': file,
                        'url': f"{settings.MEDIA_URL}{user.uuid}/{file}"
                    })
        
        return Response({
            'user': UserSerializer(user).data,
            'images': images
        })