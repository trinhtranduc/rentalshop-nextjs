"""
CLIP ViT-B/32 image embeddings via ONNX Runtime (no PyTorch).

Model: Xenova/clip-vit-base-patch32  onnx/vision_model.onnx
Output: 512-dim image_embeds (visual projection is in the graph)
"""

from __future__ import annotations

import io
import os
from typing import List, Optional

import numpy as np
import onnxruntime as ort
from PIL import Image
from botocore.exceptions import ClientError

CLIP_IMAGE_SIZE = 224
CLIP_MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
CLIP_STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
EXPECTED_DIM = 512

DEFAULT_MODEL_PATH = os.getenv(
    "CLIP_ONNX_PATH",
    "/models/clip-vit-base-patch32/onnx/vision_model.onnx",
)
HF_REPO_ID = "Xenova/clip-vit-base-patch32"
HF_FILENAME = "onnx/vision_model.onnx"


def _resize_shortest_edge(image: Image.Image, size: int) -> Image.Image:
    """CLIP / torchvision Resize(size): scale so the shorter side == size."""
    width, height = image.size
    if width == 0 or height == 0:
        raise ValueError("Invalid image size")
    if width <= height:
        new_width = size
        new_height = int(round(height * size / width))
    else:
        new_height = size
        new_width = int(round(width * size / height))
    return image.resize((new_width, new_height), Image.Resampling.BICUBIC)


def _center_crop(image: Image.Image, size: int) -> Image.Image:
    width, height = image.size
    left = max((width - size) // 2, 0)
    top = max((height - size) // 2, 0)
    return image.crop((left, top, left + size, top + size))


def preprocess_clip_image(image: Image.Image) -> np.ndarray:
    """
    OpenAI CLIP image preprocess:
    RGB → bicubic shortest_edge 224 → center-crop 224 → /255 → CLIP mean/std → NCHW float32
    """
    image = image.convert("RGB")
    image = _resize_shortest_edge(image, CLIP_IMAGE_SIZE)
    image = _center_crop(image, CLIP_IMAGE_SIZE)
    arr = np.asarray(image).astype(np.float32) / 255.0
    arr = (arr - CLIP_MEAN) / CLIP_STD
    return np.transpose(arr, (2, 0, 1))  # CHW


def l2_normalize(embeddings: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(embeddings, axis=-1, keepdims=True)
    norms = np.maximum(norms, 1e-12)
    return embeddings / norms


def ensure_onnx_model(path: str) -> str:
    if os.path.isfile(path):
        return path
    from huggingface_hub import hf_hub_download

    print(f"⬇️  ONNX not found at {path}, downloading {HF_REPO_ID}/{HF_FILENAME}")
    local_dir = os.path.dirname(os.path.dirname(path)) or "/models/clip-vit-base-patch32"
    downloaded = hf_hub_download(
        repo_id=HF_REPO_ID,
        filename=HF_FILENAME,
        local_dir=local_dir,
    )
    return downloaded


class EmbeddingModel:
    """ONNX Runtime CLIP vision encoder."""

    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        self.model_path = model_path
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None
        self.output_name: Optional[str] = None
        self._loaded = False

    def is_loaded(self) -> bool:
        return self._loaded and self.session is not None

    async def load(self) -> None:
        path = ensure_onnx_model(self.model_path)
        intra = int(os.getenv("ORT_INTRA_OP_NUM_THREADS", "1"))

        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = intra
        sess_options.inter_op_num_threads = 1
        sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        print(f"🔄 Loading ONNX CLIP vision model: {path} (intra_op={intra})")
        self.session = ort.InferenceSession(
            path,
            sess_options=sess_options,
            providers=["CPUExecutionProvider"],
        )

        inputs = self.session.get_inputs()
        outputs = self.session.get_outputs()
        self.input_name = inputs[0].name
        output_names = [o.name for o in outputs]
        if "image_embeds" in output_names:
            self.output_name = "image_embeds"
        else:
            self.output_name = outputs[-1].name

        dummy = np.zeros((1, 3, CLIP_IMAGE_SIZE, CLIP_IMAGE_SIZE), dtype=np.float32)
        probe = self.session.run([self.output_name], {self.input_name: dummy})[0]
        dim = int(probe.shape[-1])
        if dim != EXPECTED_DIM:
            raise RuntimeError(
                f"Unexpected CLIP embedding dim {dim} (expected {EXPECTED_DIM}). "
                f"outputs={output_names}. Use onnx/vision_model.onnx with image_embeds."
            )

        self._loaded = True
        print(
            f"✅ ONNX CLIP loaded: input={self.input_name} output={self.output_name} dim={dim}"
        )

    def _bytes_to_image(self, image_bytes: bytes) -> Image.Image:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        return image

    def _run(self, images: List[Image.Image]) -> np.ndarray:
        if not self.session or not self.input_name or not self.output_name:
            raise RuntimeError("Model not loaded. Call load() first.")
        batch = np.stack([preprocess_clip_image(image) for image in images], axis=0)
        raw = self.session.run([self.output_name], {self.input_name: batch})[0]
        embeds = np.asarray(raw, dtype=np.float32)
        if embeds.ndim == 3:
            # Some vision graphs emit [B, seq, hidden]; pool CLS if needed
            embeds = embeds[:, 0, :]
        return l2_normalize(embeds)

    async def generate_embedding(self, image_bytes: bytes) -> List[float]:
        image = self._bytes_to_image(image_bytes)
        embedding = self._run([image])[0]
        return embedding.astype(np.float32).tolist()

    async def generate_embeddings_batch(self, image_bytes_list: List[bytes]) -> List[List[float]]:
        if not image_bytes_list:
            return []
        images = [self._bytes_to_image(b) for b in image_bytes_list]
        embeddings = self._run(images)
        return embeddings.astype(np.float32).tolist()

    async def generate_embeddings_from_s3_keys(
        self,
        s3_keys: List[str],
        bucket_name: str,
        region: str = "ap-southeast-1",
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
    ) -> List[List[float]]:
        """
        Download images from S3 then embed. Order of embeddings matches s3_keys 1:1.
        Fail the whole batch on download errors so Node does not pair the wrong vector.
        """
        if not s3_keys:
            return []
        if not aws_access_key_id or not aws_secret_access_key:
            raise RuntimeError(
                "AWS credentials are required. Please provide aws_access_key_id and aws_secret_access_key in the request form data."
            )

        import boto3

        access_key = aws_access_key_id.strip()
        secret_key = aws_secret_access_key.strip()
        if not access_key or not secret_key:
            raise RuntimeError("AWS credentials cannot be empty.")

        s3_client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

        image_bytes_list: List[bytes] = []
        for s3_key in s3_keys:
            try:
                response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
                image_bytes_list.append(response["Body"].read())
            except ClientError as e:
                raise RuntimeError(f"Failed to download {s3_key} from S3: {e}") from e

        return await self.generate_embeddings_batch(image_bytes_list)
