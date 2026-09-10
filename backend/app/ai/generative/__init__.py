"""
app/ai/generative
=================
Locally trained, lightweight Causal Transformer response model for Rural Care Navigator.
100% offline, CPU-optimized, zero cloud API dependencies.
"""

from backend.app.ai.generative.config import GenerativeModelConfig
from backend.app.ai.generative.generator_service import LocalGenerativeResponseService
from backend.app.ai.generative.model import CausalTransformerLM
from backend.app.ai.generative.tokenizer import LocalSubwordTokenizer
from backend.app.ai.generative.validator import GenerativeResponseValidator

__all__ = [
    "GenerativeModelConfig",
    "LocalGenerativeResponseService",
    "CausalTransformerLM",
    "LocalSubwordTokenizer",
    "GenerativeResponseValidator",
]
