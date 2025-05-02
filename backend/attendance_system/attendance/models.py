import uuid
from django.db import models
from users.models import User

class AttendanceSession(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    session_date = models.DateField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_finished = models.BooleanField(default=False)
    camera_mode = models.CharField(
        max_length=10, 
        choices=[('WEBCAM', 'Webcam'), ('ESP32', 'ESP32-CAM')],
        default='WEBCAM'
    )
    esp32_ip = models.CharField(max_length=50, blank=True, null=True)
    target_users = models.ManyToManyField(User, related_name='sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.session_date})"
    
    class Meta:
        ordering = ['-session_date', 'name']

class Attendance(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4, unique=True)
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='attendances')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances')
    timestamp = models.DateTimeField(auto_now_add=True)
    is_present = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('session', 'user')
        ordering = ['session', 'timestamp']

    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.user.name} - {self.session.name} - {status}"