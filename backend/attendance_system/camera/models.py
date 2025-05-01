from django.db import models

class CameraConfiguration(models.Model):
    name = models.CharField(max_length=50)
    ip_address = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    last_connected = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.ip_address})"
    
    class Meta:
        ordering = ['name']

class FaceImage(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='face_images')
    image_path = models.CharField(max_length=255)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Face image for {self.user.name}"
    
    class Meta:
        ordering = ['user', '-created_at']