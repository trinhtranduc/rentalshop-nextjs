"""
CLIP model loading and inference
"""

import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
import numpy as np
from typing import List, Optional
import boto3
from botocore.exceptions import ClientError
import os

class EmbeddingModel:
    """CLIP model wrapper for image embedding generation"""
    
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._loaded = False
    
    async def load(self):
        """Load CLIP model and processor"""
        try:
            print(f"🔄 Loading model: {self.model_name} on {self.device}...")
            
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model = CLIPModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            
            self._loaded = True
            print(f"✅ Model loaded successfully on {self.device}")
        
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            raise
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self._loaded
    
    async def generate_embedding(self, image_bytes: bytes) -> List[float]:
        """
        Generate embedding from image bytes
        
        Args:
            image_bytes: Image file bytes
        
        Returns:
            Normalized embedding vector (512 dimensions)
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Process image
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate embedding
            with torch.no_grad():
                outputs = self.model.get_image_features(**inputs)
                embedding = outputs[0].cpu().numpy()
            
            # Normalize embedding (for cosine similarity)
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            
            return embedding.tolist()
        
        except Exception as e:
            print(f"❌ Error generating embedding: {e}")
            raise

    async def generate_embeddings_batch(self, image_bytes_list: List[bytes]) -> List[List[float]]:
        """
        Generate embeddings from multiple images (BATCH PROCESSING - MUCH FASTER)
        
        Args:
            image_bytes_list: List of image file bytes
        
        Returns:
            List of normalized embedding vectors (512 dimensions each)
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        if not image_bytes_list:
            return []
        
        try:
            # Load all images
            images = []
            for image_bytes in image_bytes_list:
                image = Image.open(io.BytesIO(image_bytes))
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                images.append(image)
            
            # Process all images in batch (much faster than individual processing)
            inputs = self.processor(images=images, return_tensors="pt", padding=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate embeddings for all images at once
            with torch.no_grad():
                outputs = self.model.get_image_features(**inputs)
                embeddings = outputs.cpu().numpy()
            
            # Normalize each embedding
            normalized_embeddings = []
            for embedding in embeddings:
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                normalized_embeddings.append(embedding.tolist())
            
            return normalized_embeddings
        
        except Exception as e:
            print(f"❌ Error generating batch embeddings: {e}")
            raise
    
    async def generate_embeddings_from_s3_keys(
        self, 
        s3_keys: List[str], 
        bucket_name: str,
        region: str = 'ap-southeast-1',
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None
    ) -> List[List[float]]:
        """
        Generate embeddings from S3 keys (DIRECT S3 ACCESS - MUCH FASTER)
        
        This method downloads images directly from S3, avoiding the need to:
        - Download images in Node.js
        - Upload images to Python API
        - Much faster because Python API and S3 are in same AWS network
        
        Args:
            s3_keys: List of S3 keys (e.g., ['products/merchant-1/image.jpg'])
            bucket_name: S3 bucket name (e.g., 'anyrent-images-dev')
            region: AWS region (default: 'ap-southeast-1')
            aws_access_key_id: AWS access key (optional, falls back to env var)
            aws_secret_access_key: AWS secret key (optional, falls back to env var)
        
        Returns:
            List of normalized embedding vectors (512 dimensions each)
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        if not s3_keys:
            return []
        
        try:
            # Initialize S3 client
            # AWS credentials MUST be provided via form data (NO FALLBACK to env vars)
            # This ensures explicit credential passing for security and control
            if not aws_access_key_id or not aws_secret_access_key:
                raise RuntimeError(
                    "AWS credentials are required. Please provide aws_access_key_id and aws_secret_access_key in the request form data."
                )
            
            # Clean and validate credentials
            final_access_key = aws_access_key_id.strip() if isinstance(aws_access_key_id, str) else None
            final_secret_key = aws_secret_access_key.strip() if isinstance(aws_secret_access_key, str) else None
            
            if not final_access_key or not final_secret_key:
                raise RuntimeError(
                    "AWS credentials cannot be empty. Please provide valid aws_access_key_id and aws_secret_access_key in the request form data."
                )
            
            s3_client = boto3.client(
                's3',
                region_name=region,
                aws_access_key_id=final_access_key,
                aws_secret_access_key=final_secret_key
            )
            
            # Download all images from S3 in parallel
            image_bytes_list = []
            for s3_key in s3_keys:
                try:
                    response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
                    image_bytes = response['Body'].read()
                    image_bytes_list.append(image_bytes)
                except ClientError as e:
                    print(f"⚠️  Error downloading {s3_key} from S3: {e}")
                    # Skip failed downloads - return empty list for this image
                    image_bytes_list.append(None)
            
            # Filter out None values (failed downloads)
            valid_image_bytes = [b for b in image_bytes_list if b is not None]
            
            if not valid_image_bytes:
                raise RuntimeError("No valid images downloaded from S3")
            
            # Load all images
            images = []
            for image_bytes in valid_image_bytes:
                image = Image.open(io.BytesIO(image_bytes))
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                images.append(image)
            
            # Process all images in batch (much faster than individual processing)
            inputs = self.processor(images=images, return_tensors="pt", padding=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate embeddings for all images at once
            with torch.no_grad():
                outputs = self.model.get_image_features(**inputs)
                embeddings = outputs.cpu().numpy()
            
            # Normalize each embedding
            normalized_embeddings = []
            for embedding in embeddings:
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                normalized_embeddings.append(embedding.tolist())
            
            return normalized_embeddings
        
        except Exception as e:
            print(f"❌ Error generating embeddings from S3 keys: {e}")
            raise
            raise