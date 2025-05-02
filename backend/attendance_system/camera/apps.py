from django.apps import AppConfig

import os
import threading
import time

class CameraConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'camera'

    # def ready(self):
    #     # Don't run initialization when Django is only loading models
    #     # This prevents double initialization when using manage.py runserver
    #     if os.environ.get('RUN_MAIN') != 'true':
    #         return
            
    #     # Import here to avoid AppRegistryNotReady exception
    #     from .face_recognition_model import face_recognition_model
    #     from .models import FaceImage
    #     from users.models import User
    #     from django.conf import settings
        
    #     def initialize_model():
    #         """Initialize and train the face recognition model if needed"""
    #         print("Initializing face recognition model...")
    #         time.sleep(5)  # Wait for Django to fully initialize
            
    #         try:
    #             # Check if we have face images
    #             total_faces = FaceImage.objects.count()
    #             total_users = User.objects.count()
                
    #             print(f"Found {total_faces} face images for {total_users} users")
                
    #             # If we have at least 2 faces and they're not already loaded in the model
    #             if total_faces >= 2 and face_recognition_model.model is None:
    #                 print("Training face recognition model...")
                    
    #                 # Get all user face images
    #                 all_images = []
    #                 all_labels = []
                    
    #                 for user in User.objects.all():
    #                     face_images = FaceImage.objects.filter(user=user)
                        
    #                     for face_img in face_images:
    #                         img_path = os.path.join(settings.MEDIA_ROOT, face_img.image_path)
    #                         if os.path.exists(img_path):
    #                             all_images.append(img_path)
    #                             all_labels.append(str(user.id))  # Use user ID as label
                    
    #                 if len(all_images) >= 2:
    #                     # Train the model
    #                     training_results = face_recognition_model.train_model(all_images, all_labels)
    #                     print(f"Model trained with {len(all_images)} images. " +
    #                           f"Accuracy: {training_results['accuracy']:.2f}, " +
    #                           f"Validation accuracy: {training_results['val_accuracy']:.2f}")
    #                 else:
    #                     print("Not enough valid images found for training")
    #             elif face_recognition_model.model is not None:
    #                 print("Face recognition model already loaded")
    #             else:
    #                 print("Not enough face images for training")
            
    #         except Exception as e:
    #             print(f"Error initializing face recognition model: {str(e)}")
        
    #     # Run initialization in a separate thread to avoid blocking server startup
    #     init_thread = threading.Thread(target=initialize_model)
    #     init_thread.daemon = True
    #     init_thread.start()
