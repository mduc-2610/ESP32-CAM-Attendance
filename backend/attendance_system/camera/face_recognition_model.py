# camera/face_recognition_model.py
import os
import numpy as np
import cv2
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model, load_model
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Input, GlobalAveragePooling2D
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing.image import img_to_array
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from django.conf import settings
import pickle
import time

class FaceRecognitionModel:
    def __init__(self):
        self.face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.model_path = os.path.join(settings.BASE_DIR, 'camera', 'models', 'face_recognition_model.h5')
        self.encoder_path = os.path.join(settings.BASE_DIR, 'camera', 'models', 'label_encoder.pickle')
        self.model_directory = os.path.join(settings.BASE_DIR, 'camera', 'models')
        self.face_embeddings = {}  # Cache for face embeddings
        
        # Create models directory if it doesn't exist
        os.makedirs(self.model_directory, exist_ok=True)
        
        # Initialize the model if it exists, otherwise it will be created on first training
        self.model = None
        self.label_encoder = None
        self._load_model_if_exists()
    
    def _load_model_if_exists(self):
        """Load the model and encoder if they exist on disk"""
        if os.path.exists(self.model_path):
            print("Loading existing face recognition model...")
            self.model = load_model(self.model_path)
            
            if os.path.exists(self.encoder_path):
                with open(self.encoder_path, 'rb') as f:
                    self.label_encoder = pickle.load(f)
            
            print("Model loaded successfully")
        else:
            print("No existing model found. Will create on first training.")
    
    def _build_model(self, num_classes):
        """Build a MobileNetV2-based face recognition model"""
        # Use MobileNetV2 as base model (lightweight and efficient)
        base_model = MobileNetV2(
            weights='imagenet',
            include_top=False,
            input_shape=(224, 224, 3)
        )
        
        # Freeze the base model layers
        for layer in base_model.layers:
            layer.trainable = False
        
        # Build the model architecture
        model = Sequential([
            base_model,
            GlobalAveragePooling2D(),
            Dense(512, activation='relu'),
            Dropout(0.5),
            Dense(256, activation='relu'),
            Dropout(0.3),
            Dense(num_classes, activation='softmax')
        ])
        
        # Compile the model
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def detect_faces(self, image):
        """Detect faces in an image using Haar Cascade"""
        if image is None:
            return []
            
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        return faces
    
    def extract_face(self, image, face_location, required_size=(224, 224)):
        """Extract face from image based on detection and preprocess for model"""
        x, y, width, height = face_location
        face = image[y:y+height, x:x+width]
        
        # Resize to the required input dimensions
        face = cv2.resize(face, required_size)
        
        # Preprocess for model input
        face = img_to_array(face)
        face = preprocess_input(face)
        
        return face
    
    def train_model(self, image_paths, labels):
        """Train face recognition model with user images"""
        if not image_paths or len(image_paths) < 2:
            raise ValueError("Not enough images for training. Need at least 2 images.")
        
        if self.label_encoder is None:
            self.label_encoder = LabelEncoder()
        
        encoded_labels = self.label_encoder.fit_transform(labels)
        
        faces = []
        valid_labels = []
        
        for i, (image_path, label) in enumerate(zip(image_paths, labels)):
            try:
                image = cv2.imread(image_path)
                if image is None:
                    print(f"Warning: Could not load image {image_path}")
                    continue
                
                detected_faces = self.detect_faces(image)
                
                if len(detected_faces) == 0:
                    print(f"Warning: No face detected in {image_path}")
                    continue
                    
                face = self.extract_face(image, detected_faces[0])
                faces.append(face)
                valid_labels.append(label)
            except Exception as e:
                print(f"Error processing image {image_path}: {str(e)}")
        
        if not faces:
            raise ValueError("No valid faces found in the provided images")
        
        faces = np.array(faces)
        valid_labels = np.array(valid_labels)
        encoded_valid_labels = self.label_encoder.transform(valid_labels)
        
        one_hot_labels = tf.keras.utils.to_categorical(encoded_valid_labels)
        
        X_train, X_test, y_train, y_test = train_test_split(
            faces, one_hot_labels, 
            test_size=0.2, stratify=one_hot_labels, random_state=42
        )
        
        if self.model is None:
            print("Building new model...")
            self.model = self._build_model(len(self.label_encoder.classes_))
        elif len(self.label_encoder.classes_) != self.model.layers[-1].output_shape[-1]:
            print("Rebuilding model due to change in number of classes...")
            self.model = self._build_model(len(self.label_encoder.classes_))
        
        checkpoint = ModelCheckpoint(
            self.model_path, 
            monitor='val_accuracy', 
            verbose=1, 
            save_best_only=True, 
            mode='max'
        )
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True
        )
        
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=20,
            batch_size=32,
            callbacks=[checkpoint, early_stopping]
        )
        
        with open(self.encoder_path, 'wb') as f:
            pickle.dump(self.label_encoder, f)
        
        self.face_embeddings = {}
        
        return {
            'accuracy': float(history.history['accuracy'][-1]),
            'val_accuracy': float(history.history['val_accuracy'][-1]),
            'model_path': self.model_path,
            'num_classes': len(self.label_encoder.classes_),
            'num_samples': len(faces)
        }
    
    def recognize_face(self, image):
        """Recognize a face in the given image"""
        if self.model is None or self.label_encoder is None:
            raise ValueError("Model not trained yet. Please train the model first.")
        
        faces = self.detect_faces(image)
        
        if len(faces) == 0:
            return []
        
        from camera.models import FaceImage
        from users.models import User
        
        valid_user_ids = set()
        for user in User.objects.all():
            if FaceImage.objects.filter(user=user).exists():
                valid_user_ids.add(str(user.id))
        
        results = []
        
        for face_location in faces:
            face = self.extract_face(image, face_location)
            face = np.expand_dims(face, axis=0)  # Add batch dimension
            
            predictions = self.model.predict(face)
            predicted_index = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_index])
            
            predicted_label = self.label_encoder.inverse_transform([predicted_index])[0]
            
            if predicted_label in valid_user_ids:
                x, y, w, h = face_location
                results.append({
                    'label': predicted_label,
                    'confidence': confidence,
                    'location': (x, y, w, h)
                })
        
        return results
    

    def recognize_faces_batch(self, image_paths):
        """Recognize faces in multiple images"""
        results = {}
        
        from camera.models import FaceImage
        from users.models import User
        
        valid_user_ids = set()
        for user in User.objects.all():
            if FaceImage.objects.filter(user=user).exists():
                valid_user_ids.add(str(user.id))
        
        for image_path in image_paths:
            try:
                image = cv2.imread(image_path)
                if image is not None:
                    faces = self.detect_faces(image)
                    
                    if len(faces) == 0:
                        results[image_path] = []
                        continue
                    
                    batch_results = []
                    
                    for face_location in faces:
                        face = self.extract_face(image, face_location)
                        face = np.expand_dims(face, axis=0)  # Add batch dimension
                        
                        predictions = self.model.predict(face)
                        predicted_index = np.argmax(predictions[0])
                        confidence = float(predictions[0][predicted_index])
                        
                        predicted_label = self.label_encoder.inverse_transform([predicted_index])[0]
                        
                        if predicted_label in valid_user_ids:
                            x, y, w, h = face_location
                            batch_results.append({
                                'label': predicted_label,
                                'confidence': confidence,
                                'location': (x, y, w, h)
                            })
                    
                    results[image_path] = batch_results
                else:
                    results[image_path] = []
            except Exception as e:
                print(f"Error processing {image_path}: {str(e)}")
                results[image_path] = []
        
        return results

    def update_model_for_user(self, user_id, image_paths):
        """Update the model specifically for a user with new images"""
        all_user_images = []
        all_user_labels = []
        
        from camera.models import FaceImage
        from users.models import User
        
        users = User.objects.all()
        
        for user in users:
            face_images = FaceImage.objects.filter(user=user)
            
            for face_img in face_images:
                img_path = os.path.join(settings.MEDIA_ROOT, face_img.image_path)
                if os.path.exists(img_path):
                    all_user_images.append(img_path)
                    all_user_labels.append(str(user.id))  # Use user ID as label
        
        for img_path in image_paths:
            all_user_images.append(img_path)
            all_user_labels.append(str(user_id))
        
        return self.train_model(all_user_images, all_user_labels)

face_recognition_model = FaceRecognitionModel()