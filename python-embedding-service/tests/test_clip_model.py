"""#1087: CLIP_MODEL picks the ONNX model; unset keeps the model used before."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import models  # noqa: E402


def test_unset_is_openai(monkeypatch):
    monkeypatch.delenv("CLIP_MODEL", raising=False)
    assert models.clip_model_key() == "openai"


def test_openai_keeps_clip_onnx_path(monkeypatch):
    monkeypatch.setenv("CLIP_ONNX_PATH", "/custom/vision_model.onnx")
    assert models.clip_model_path("openai") == "/custom/vision_model.onnx"


def test_fashionclip_has_its_own_folder(monkeypatch):
    monkeypatch.setenv("CLIP_MODEL", " Marqo-FashionCLIP ")
    monkeypatch.setenv("CLIP_ONNX_PATH", "/models/clip-vit-base-patch32/onnx/vision_model.onnx")
    key = models.clip_model_key()
    assert key == "marqo-fashionclip"
    assert models.clip_model_path(key) == "/models/marqo-fashionclip/onnx/vision_model.onnx"
    assert models.CLIP_MODELS[key][0] == "Marqo/marqo-fashionCLIP"


def test_unknown_model_fails(monkeypatch):
    monkeypatch.setenv("CLIP_MODEL", "bogus")
    with pytest.raises(RuntimeError):
        models.clip_model_key()
