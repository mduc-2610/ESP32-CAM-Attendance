# camera/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CameraConfiguration, FaceImage
from .serializers import CameraConfigurationSerializer, FaceImageSerializer
from users.models import User

import os
import uuid
import base64
import requests
import cv2
import numpy as np
from django.conf import settings
from datetime import datetime
from .face_recognition_model import face_recognition_model

class CameraConfigurationViewSet(viewsets.ModelViewSet):
    queryset = CameraConfiguration.objects.all()
    serializer_class = CameraConfigurationSerializer
    
    @action(detail=False, methods=['post'])
    def test_connection(self, request):
        ip_address = request.data.get('ip_address')
        
        if not ip_address:
            return Response({"error": "IP address is required"}, status=400)
        
        # Try to connect to ESP32-CAM
        try:
            response = requests.get(f"http://{ip_address}/capture", timeout=5)
            
            if response.status_code == 200:
                config, created = CameraConfiguration.objects.update_or_create(
                    ip_address=ip_address,
                    defaults={
                        'name': request.data.get('name', f"ESP32-CAM-{ip_address}"),
                        'is_active': True,
                        'last_connected': datetime.now()
                    }
                )
                
                return Response({
                    "success": True,
                    "message": "Connection successful",
                    "config": CameraConfigurationSerializer(config).data
                })
            else:
                return Response({
                    "success": False,
                    "message": f"Connection failed: HTTP {response.status_code}"
                }, status=400)
                
        except requests.exceptions.RequestException as e:
            return Response({
                "success": False,
                "message": f"Connection failed: {str(e)}"
            }, status=400)

class FaceRecognitionViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def register_face(self, request):
        user_id = request.data.get('user_id')
        image_data = request.data.get('image_data')  # Base64 encoded image
        camera_mode = request.data.get('camera_mode', 'WEBCAM')
        esp32_ip = request.data.get('esp32_ip')
        
        try:
            user = User.objects.get(id=user_id)
            
            # Create user directory if it doesn't exist
            user_dir = os.path.join(settings.MEDIA_ROOT, str(user.uuid))
            os.makedirs(user_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            filename = f"face_{timestamp}.jpg"
            file_path = os.path.join(user_dir, filename)
            
            # Process image based on camera mode
            if camera_mode == 'WEBCAM' and image_data:
                # Decode base64 image
                image_data = image_data.split(',')[1] if ',' in image_data else image_data
                image_binary = base64.b64decode(image_data)
                
                # Save image
                with open(file_path, 'wb') as f:
                    f.write(image_binary)
                
            elif camera_mode == 'ESP32' and esp32_ip:
                try:
                    response = requests.get(f"http://{esp32_ip}/capture", timeout=5)
                    if response.status_code == 200:
                        with open(file_path, 'wb') as f:
                            f.write(response.content)
                    else:
                        return Response({
                            "success": False,
                            "message": f"Failed to capture from ESP32-CAM: HTTP {response.status_code}"
                        }, status=400)
                except requests.exceptions.RequestException as e:
                    return Response({
                        "success": False,
                        "message": f"Failed to capture from ESP32-CAM: {str(e)}"
                    }, status=400)
            else:
                return Response({
                    "success": False,
                    "message": "Invalid data: image_data required for WEBCAM mode, esp32_ip required for ESP32 mode"
                }, status=400)
            
            image = cv2.imread(file_path)
            if image is None:
                os.remove(file_path)  
                return Response({
                    "success": False,
                    "message": "Invalid image format or empty image"
                }, status=400)
                
            faces = face_recognition_model.detect_faces(image)
            
            if len(faces) == 0:
                os.remove(file_path) 
                return Response({
                    "success": False,
                    "message": "No face detected in the image"
                }, status=400)
            
            # Create face image record
            relative_path = os.path.join(str(user.uuid), filename)
            face_image = FaceImage.objects.create(
                user=user,
                image_path=relative_path,
                is_primary=FaceImage.objects.filter(user=user).count() == 0  # First image is primary
            )
            
            # Update the face recognition model with the new image
            try:
                face_recognition_model.update_model_for_user(user.id, [file_path])
            except Exception as e:
                print(f"Warning: Could not update face recognition model: {str(e)}")
                # Continue even if model update fails
            
            return Response({
                "success": True,
                "message": "Face registered successfully",
                "face_image": {
                    "id": face_image.id,
                    "path": relative_path,
                    "url": f"{settings.MEDIA_URL}{relative_path}"
                }
            })
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    @action(detail=False, methods=['post'])
    def recognize_face(self, request):
        session_id = request.data.get('session_id')
        image_data = request.data.get('image_data')  # Base64 encoded image
        camera_mode = request.data.get('camera_mode', 'WEBCAM')
        esp32_ip = request.data.get('esp32_ip')
        
        try:
            from attendance.models import AttendanceSession, Attendance
            
            session = AttendanceSession.objects.get(id=session_id)
            
            if session.is_finished:
                return Response({"error": "Session is already finished"}, status=400)
            
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp')
            os.makedirs(temp_dir, exist_ok=True)
            temp_file = os.path.join(temp_dir, f"temp_{uuid.uuid4()}.jpg")
            
            if camera_mode == 'WEBCAM' and image_data:
                image_data = image_data.split(',')[1] if ',' in image_data else image_data
                image_binary = base64.b64decode(image_data)
                
                with open(temp_file, 'wb') as f:
                    f.write(image_binary)
                
            elif camera_mode == 'ESP32' and esp32_ip:
                try:
                    import time
                    timestamp_ms = int(time.time() * 1000)
                    response = requests.get(f"http://{esp32_ip}/capture?t={timestamp_ms}", timeout=10)
            
                    if response.status_code == 200:
                        with open(temp_file, 'wb') as f:
                            f.write(response.content)
                    else:
                        return Response({
                            "success": False,
                            "message": f"Failed to capture from ESP32-CAM: HTTP {response.status_code}"
                        }, status=400)
                except requests.exceptions.RequestException as e:
                    return Response({
                        "success": False,
                        "message": f"Failed to capture from ESP32-CAM: {str(e)}"
                    }, status=400)
            else:
                return Response({
                    "success": False,
                    "message": "Invalid data: image_data required for WEBCAM mode, esp32_ip required for ESP32 mode"
                }, status=400)
            
            # Load the input image
            input_image = cv2.imread(temp_file)
            if input_image is None:
                os.remove(temp_file)
                return Response({
                    "success": False,
                    "message": "Invalid image format or empty image"
                }, status=400)
                
            # Use our custom model to recognize faces
            face_results = face_recognition_model.recognize_face(input_image)
            
            if not face_results:
                os.remove(temp_file)
                return Response({
                    "success": False,
                    "message": "No face detected in the input image"
                }, status=400)
            
            # Get all users in this session
            target_users = session.target_users.all()
            target_user_ids = [str(user.id) for user in target_users]
            
            matches = []
            
            # Process recognition results
            for face_result in face_results:
                user_id = face_result['label']
                confidence = face_result['confidence']
                
                # Only consider high confidence matches for target users
                if user_id in target_user_ids and confidence > 0.7:  # Confidence threshold
                    try:
                        user = User.objects.get(id=int(user_id))
                        
                        # Mark attendance for this user
                        attendance, created = Attendance.objects.update_or_create(
                            session=session,
                            user=user,
                            defaults={'is_present': True}
                        )
                        
                        matches.append({
                            'user_id': user.id,
                            'name': user.name,
                            'uuid': str(user.uuid),
                            'confidence': confidence,
                            'attendance_marked': True
                        })
                    except User.DoesNotExist:
                        print(f"Warning: User with ID {user_id} not found")
            
            # Clean up temp file
            os.remove(temp_file)
            
            if matches:
                return Response({
                    "success": True,
                    "message": "Face(s) recognized successfully",
                    "matches": matches
                })
            else:
                return Response({
                    "success": False,
                    "message": "No matching faces found in the system"
                })
            
        except AttendanceSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def train_model(self, request):
        """Endpoint to trigger model training on all available face images"""
        try:
            # Get all users and their face images
            all_images = []
            all_labels = []
            
            users = User.objects.all()
            total_images = 0
            
            for user in users:
                face_images = FaceImage.objects.filter(user=user)
                total_images += face_images.count()
                
                for face_img in face_images:
                    img_path = os.path.join(settings.MEDIA_ROOT, face_img.image_path)
                    if os.path.exists(img_path):
                        all_images.append(img_path)
                        all_labels.append(str(user.id))  # Use user ID as label
            
            if len(all_images) < 2:
                return Response({
                    "success": False,
                    "message": "Need at least 2 face images to train the model"
                }, status=400)
            
            # Train the model
            training_results = face_recognition_model.train_model(all_images, all_labels)
            
            return Response({
                "success": True,
                "message": "Model trained successfully",
                "details": {
                    "total_users": users.count(),
                    "total_images": total_images,
                    "used_images": len(all_images),
                    "accuracy": training_results['accuracy'],
                    "validation_accuracy": training_results['val_accuracy']
                }
            })
            
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error training model: {str(e)}"
            }, status=400)