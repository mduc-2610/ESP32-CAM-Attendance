from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import JsonResponse
from django.utils import timezone
from .models import AttendanceSession, Attendance
from .serializers import AttendanceSessionSerializer, AttendanceSerializer
from users.models import User
import datetime

class AttendanceSessionViewSet(viewsets.ModelViewSet):
    queryset = AttendanceSession.objects.all()
    serializer_class = AttendanceSessionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'session_date']
    
    @action(detail=True, methods=['post'])
    def mark_attendance(self, request, pk=None):
        session = self.get_object()
        
        if session.is_finished:
            return Response({"error": "Cannot mark attendance for a finished session"}, status=400)
        
        try:
            user_id = request.data.get('user_id')
            is_present = request.data.get('is_present', True)
            
            user = User.objects.get(id=user_id)
            
            # Ensure user is in target users
            if user not in session.target_users.all():
                return Response({"error": "User not in target users for this session"}, status=400)
            
            # Create or update attendance record
            attendance, created = Attendance.objects.update_or_create(
                session=session,
                user=user,
                defaults={'is_present': is_present}
            )
            
            return Response({
                "success": True,
                "message": "Attendance marked successfully",
                "attendance": AttendanceSerializer(attendance).data
            })
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    @action(detail=True, methods=['post'])
    def finish_session(self, request, pk=None):
        session = self.get_object()
        
        if session.is_finished:
            return Response({"error": "Session already marked as finished"}, status=400)
        
        try:
            # Mark session as finished and inactive
            session.is_finished = True
            session.is_active = False
            session.end_time = timezone.now()
            session.save()
            
            # Mark all target users who don't have an attendance record as absent
            present_users = session.attendances.values_list('user_id', flat=True)
            absent_users = session.target_users.exclude(id__in=present_users)
            
            for user in absent_users:
                Attendance.objects.create(
                    session=session,
                    user=user,
                    is_present=False
                )
            
            return Response({
                "success": True,
                "message": "Session marked as finished",
                "session": AttendanceSessionSerializer(session).data
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    @action(detail=False, methods=['get'])
    def report(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        try:
            if start_date:
                start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
            else:
                # Default to 30 days ago
                start_date = (timezone.now() - datetime.timedelta(days=30)).date()
                
            if end_date:
                end_date = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
            else:
                end_date = timezone.now().date()
            
            # Query sessions in date range
            sessions = AttendanceSession.objects.filter(
                session_date__gte=start_date,
                session_date__lte=end_date
            ).prefetch_related('attendances', 'attendances__user', 'target_users')
            
            report_data = []
            for session in sessions:
                session_data = {
                    'id': session.id,
                    'name': session.name,
                    'date': session.session_date,
                    'is_finished': session.is_finished,
                    'total_users': session.target_users.count(),
                    'present_users': session.attendances.filter(is_present=True).count(),
                    'absent_users': session.attendances.filter(is_present=False).count(),
                }
                report_data.append(session_data)
            
            return Response({
                'start_date': start_date,
                'end_date': end_date,
                'sessions': report_data
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=400)
