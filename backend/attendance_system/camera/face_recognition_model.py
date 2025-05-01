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
        
        # Initialize label encoder
        if self.label_encoder is None:
            self.label_encoder = LabelEncoder()
        
        # Encode labels
        encoded_labels = self.label_encoder.fit_transform(labels)
        
        # Extract faces from images
        faces = []
        valid_labels = []
        
        for i, (image_path, label) in enumerate(zip(image_paths, labels)):
            try:
                # Load image
                image = cv2.imread(image_path)
                if image is None:
                    print(f"Warning: Could not load image {image_path}")
                    continue
                
                # Detect faces
                detected_faces = self.detect_faces(image)
                
                if len(detected_faces) == 0:
                    print(f"Warning: No face detected in {image_path}")
                    continue
                    
                # Use the first detected face (assuming one face per image)
                face = self.extract_face(image, detected_faces[0])
                faces.append(face)
                valid_labels.append(label)
            except Exception as e:
                print(f"Error processing image {image_path}: {str(e)}")
        
        if not faces:
            raise ValueError("No valid faces found in the provided images")
        
        # Convert lists to arrays
        faces = np.array(faces)
        valid_labels = np.array(valid_labels)
        encoded_valid_labels = self.label_encoder.transform(valid_labels)
        
        # Convert to categorical
        one_hot_labels = tf.keras.utils.to_categorical(encoded_valid_labels)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            faces, one_hot_labels, 
            test_size=0.2, stratify=one_hot_labels, random_state=42
        )
        
        # Build or load the model
        if self.model is None:
            print("Building new model...")
            self.model = self._build_model(len(self.label_encoder.classes_))
        elif len(self.label_encoder.classes_) != self.model.layers[-1].output_shape[-1]:
            print("Rebuilding model due to change in number of classes...")
            self.model = self._build_model(len(self.label_encoder.classes_))
        
        # Callbacks for training
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
        
        # Train the model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=20,
            batch_size=32,
            callbacks=[checkpoint, early_stopping]
        )
        
        # Save the label encoder
        with open(self.encoder_path, 'wb') as f:
            pickle.dump(self.label_encoder, f)
        
        # Clear cache
        self.face_embeddings = {}
        
        # Return training results
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
        
        # Detect faces
        faces = self.detect_faces(image)
        
        if len(faces) == 0:
            return []
        
        results = []
        
        # Process each detected face
        for face_location in faces:
            # Extract and preprocess face
            face = self.extract_face(image, face_location)
            face = np.expand_dims(face, axis=0)  # Add batch dimension
            
            # Make prediction
            predictions = self.model.predict(face)
            predicted_index = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_index])
            
            # Get predicted label
            predicted_label = self.label_encoder.inverse_transform([predicted_index])[0]
            
            # Add to results
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
        
        for image_path in image_paths:
            try:
                image = cv2.imread(image_path)
                if image is not None:
                    face_results = self.recognize_face(image)
                    results[image_path] = face_results
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
        
        # Load existing user images from database
        from camera.models import FaceImage
        from users.models import User
        
        # Get all users
        users = User.objects.all()
        
        # Collect images for all users
        for user in users:
            face_images = FaceImage.objects.filter(user=user)
            
            for face_img in face_images:
                img_path = os.path.join(settings.MEDIA_ROOT, face_img.image_path)
                if os.path.exists(img_path):
                    all_user_images.append(img_path)
                    all_user_labels.append(str(user.id))  # Use user ID as label
        
        # Add new images for the current user
        for img_path in image_paths:
            all_user_images.append(img_path)
            all_user_labels.append(str(user_id))
        
        # Train model with all images
        return self.train_model(all_user_images, all_user_labels)

# Create a singleton instance
face_recognition_model = FaceRecognitionModel()