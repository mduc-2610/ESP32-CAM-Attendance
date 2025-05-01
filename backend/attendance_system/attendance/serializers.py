from rest_framework import serializers
from .models import AttendanceSession, Attendance
from users.serializers import UserSerializer

class AttendanceSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['id', 'session', 'user', 'user_details', 'timestamp', 'is_present']
        read_only_fields = ['timestamp']

class AttendanceSessionSerializer(serializers.ModelSerializer):
    attendances = AttendanceSerializer(many=True, read_only=True)
    target_users_details = UserSerializer(source='target_users', many=True, read_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'name', 'description', 'session_date', 'start_time', 'end_time',
            'is_active', 'is_finished', 'camera_mode', 'esp32_ip', 
            'target_users', 'target_users_details', 'attendances',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']