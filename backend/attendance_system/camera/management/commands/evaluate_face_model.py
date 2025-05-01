from django.core.management.base import BaseCommand
from django.conf import settings
from camera.face_recognition_model import face_recognition_model
from camera.models import FaceImage
from users.models import User
import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
import pandas as pd
import random
from tqdm import tqdm

class Command(BaseCommand):
    help = 'Evaluate the face recognition model performance'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='model_evaluation',
            help='Directory to save evaluation results'
        )
        parser.add_argument(
            '--test-split',
            type=float,
            default=0.2,
            help='Proportion of images to use for testing (default: 0.2)'
        )
    
    def handle(self, *args, **options):
        # Check if model exists
        if face_recognition_model.model is None:
            self.stdout.write(self.style.ERROR('No trained model found. Please train the model first.'))
            return
        
        output_dir = os.path.join(settings.BASE_DIR, options['output_dir'])
        os.makedirs(output_dir, exist_ok=True)
        
        self.stdout.write(self.style.NOTICE('Starting face recognition model evaluation...'))
        
        # Collect all images
        all_images = []
        all_labels = []
        user_names = {}  # Map user IDs to names for reporting
        
        users = User.objects.all()
        for user in users:
            face_images = FaceImage.objects.filter(user=user)
            user_names[str(user.id)] = user.name
            
            for face_img in face_images:
                img_path = os.path.join(settings.MEDIA_ROOT, face_img.image_path)
                if os.path.exists(img_path):
                    all_images.append(img_path)
                    all_labels.append(str(user.id))
        
        # Check if we have enough images
        if len(all_images) < 5:
            self.stdout.write(self.style.ERROR('Not enough images for evaluation. Need at least 5 images.'))
            return
        
        # Split into train/test sets
        test_split = options['test_split']
        combined = list(zip(all_images, all_labels))
        random.shuffle(combined)
        
        # Ensure each user has at least one image in test set if possible
        user_counts = {}
        for _, label in combined:
            user_counts[label] = user_counts.get(label, 0) + 1
        
        # Identify users with only one image
        single_image_users = [user for user, count in user_counts.items() if count == 1]
        if single_image_users:
            self.stdout.write(self.style.WARNING(
                f"{len(single_image_users)} users have only one image, which may affect evaluation"
            ))
        
        # Create test set with stratification
        test_images = []
        test_labels = []
        train_images = []
        train_labels = []
        
        # Group by user
        user_images = {}
        for img, label in combined:
            if label not in user_images:
                user_images[label] = []
            user_images[label].append(img)
        
        # Split for each user
        for label, images in user_images.items():
            n_test = max(1, int(len(images) * test_split))
            
            user_test_images = images[:n_test]
            user_train_images = images[n_test:]
            
            test_images.extend(user_test_images)
            test_labels.extend([label] * len(user_test_images))
            
            train_images.extend(user_train_images)
            train_labels.extend([label] * len(user_train_images))
        
        self.stdout.write(self.style.SUCCESS(
            f"Split dataset: {len(train_images)} training images, {len(test_images)} test images"
        ))
        
        # Evaluate the model on test set
        self.stdout.write('Evaluating model on test images...')
        
        y_true = []
        y_pred = []
        confidences = []
        
        # Process each test image
        for img_path, true_label in tqdm(zip(test_images, test_labels), total=len(test_images)):
            try:
                # Load and process image
                image = cv2.imread(img_path)
                if image is None:
                    continue
                
                # Get prediction
                results = face_recognition_model.recognize_face(image)
                
                if results:
                    pred_label = results[0]['label']
                    confidence = results[0]['confidence']
                    
                    y_true.append(true_label)
                    y_pred.append(pred_label)
                    confidences.append(confidence)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Error processing {img_path}: {str(e)}"))
        
        if not y_true:
            self.stdout.write(self.style.ERROR("No valid predictions made. Evaluation failed."))
            return
        
        # Calculate accuracy
        accuracy = sum(1 for t, p in zip(y_true, y_pred) if t == p) / len(y_true)
        self.stdout.write(self.style.SUCCESS(f"Overall accuracy: {accuracy:.4f}"))
        
        # Generate confusion matrix
        labels = sorted(list(set(y_true + y_pred)))
        label_names = [f"{user_names.get(label, label)} ({label})" for label in labels]
        
        cm = confusion_matrix(y_true, y_pred, labels=labels)
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=label_names, yticklabels=label_names)
        plt.xlabel('Predicted')
        plt.ylabel('True')
        plt.title('Confusion Matrix')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'confusion_matrix.png'))
        
        # Generate classification report
        report = classification_report(y_true, y_pred, labels=labels, target_names=label_names, output_dict=True)
        report_df = pd.DataFrame(report).transpose()
        
        # Save report
        report_df.to_csv(os.path.join(output_dir, 'classification_report.csv'))
        
        # Plot confidence distribution
        plt.figure(figsize=(10, 6))
        plt.hist(confidences, bins=20, alpha=0.7)
        plt.axvline(x=0.7, color='r', linestyle='--', label='Confidence Threshold (0.7)')
        plt.xlabel('Confidence')
        plt.ylabel('Count')
        plt.title('Prediction Confidence Distribution')
        plt.legend()
        plt.savefig(os.path.join(output_dir, 'confidence_distribution.png'))
        
        # Save detailed results
        results_df = pd.DataFrame({
            'true_label': y_true,
            'predicted_label': y_pred,
            'confidence': confidences,
            'correct': [t == p for t, p in zip(y_true, y_pred)]
        })
        results_df['true_name'] = results_df['true_label'].map(user_names)
        results_df['predicted_name'] = results_df['predicted_label'].map(user_names)
        results_df.to_csv(os.path.join(output_dir, 'detailed_results.csv'), index=False)
        
        # Print summary
        self.stdout.write(self.style.SUCCESS(
            f"\nEvaluation complete! Results saved to {output_dir}\n"
            f"- Accuracy: {accuracy:.4f}\n"
            f"- Test images: {len(y_true)}\n"
            f"- Users: {len(labels)}"
        ))
        
        # Generate recommendations
        low_perf_users = []
        for label in labels:
            mask = np.array(y_true) == label
            if mask.sum() > 0:
                user_acc = sum(1 for i, correct in enumerate(mask) if y_pred[i] == label) / mask.sum()
                if user_acc < 0.7:
                    low_perf_users.append((label, user_names.get(label, label), user_acc))
        
        if low_perf_users:
            self.stdout.write(self.style.WARNING("\nUsers with low recognition accuracy:"))
            for user_id, name, acc in sorted(low_perf_users, key=lambda x: x[2]):
                self.stdout.write(f"- {name} (ID: {user_id}): {acc:.2f} accuracy")
            
            self.stdout.write(self.style.NOTICE(
                "\nRecommendation: Consider adding more training images for these users"
                " or ensuring better quality images with clear facial features."
            ))