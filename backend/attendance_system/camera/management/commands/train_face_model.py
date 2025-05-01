from django.core.management.base import BaseCommand
from django.conf import settings
from camera.face_recognition_model import face_recognition_model
from camera.models import FaceImage
from users.models import User
import os
import time

class Command(BaseCommand):
    help = 'Train the face recognition model using all available face images'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force retraining even if model already exists',
        )
    
    def handle(self, *args, **options):
        start_time = time.time()
        self.stdout.write(self.style.NOTICE('Starting face recognition model training...'))
        
        # Check if model exists and if we should force retrain
        model_exists = face_recognition_model.model is not None
        force_retrain = options['force']
        
        if model_exists and not force_retrain:
            self.stdout.write(self.style.WARNING('Model already exists. Use --force to retrain.'))
            return
        
        # Get all user face images
        all_images = []
        all_labels = []
        
        # Show progress
        users = User.objects.all()
        self.stdout.write(f'Processing images for {users.count()} users')
        
        for user in users:
            face_images = FaceImage.objects.filter(user=user)
            
            if face_images.count() > 0:
                self.stdout.write(f'  - Processing {face_images.count()} images for user {user.name}')
            
            valid_images = 0
            for face_img in face_images:
                img_path = os.path.join(settings.MEDIA_ROOT, face_img.image_path)
                if os.path.exists(img_path):
                    all_images.append(img_path)
                    all_labels.append(str(user.id))
                    valid_images += 1
            
            if valid_images > 0:
                self.stdout.write(self.style.SUCCESS(f'    ✓ Found {valid_images} valid images'))
        
        total_images = len(all_images)
        if total_images < 2:
            self.stdout.write(self.style.ERROR('Not enough images for training. Need at least 2 images.'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'Found {total_images} valid face images for training'))
        
        try:
            # Train the model
            self.stdout.write('Training model... (this may take several minutes)')
            training_results = face_recognition_model.train_model(all_images, all_labels)
            
            # Report results
            elapsed_time = time.time() - start_time
            self.stdout.write(self.style.SUCCESS(
                f"Model trained successfully in {elapsed_time:.1f} seconds\n"
                f"- Number of classes: {training_results['num_classes']}\n"
                f"- Training accuracy: {training_results['accuracy']:.2f}\n"
                f"- Validation accuracy: {training_results['val_accuracy']:.2f}\n"
                f"- Model saved to: {training_results['model_path']}"
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error training model: {str(e)}'))