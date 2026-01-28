"""
CLIP model loading and inference
"""

import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
import numpy as np
from typing import List

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
