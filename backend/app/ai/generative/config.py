"""
app/ai/generative/config.py
===========================
Hyperparameters and configuration for the local lightweight generative
conversational response model (NanoGPT-style Causal Transformer).
"""

from dataclasses import dataclass
from pathlib import Path


@dataclass
class GenerativeModelConfig:
    # Architecture
    d_model: int = 160
    n_layer: int = 4
    n_head: int = 4
    d_ff: int = 640
    max_seq_len: int = 128
    vocab_size: int = 3072
    dropout: float = 0.1

    # Special Tokens
    pad_token: str = "<|pad|>"
    unk_token: str = "<|unk|>"
    context_token: str = "<|context|>"
    response_token: str = "<|response|>"
    end_token: str = "<|end|>"

    # Training Hyperparameters
    batch_size: int = 32
    learning_rate: float = 5e-4
    weight_decay: float = 0.01
    epochs: int = 40
    warmup_steps: int = 100
    val_split: float = 0.15
    seed: int = 42

    # Paths
    base_dir: Path = Path(__file__).resolve().parent
    data_path: Path = Path(__file__).resolve().parent / "data" / "generative_dataset.jsonl"
    weights_dir: Path = Path(__file__).resolve().parent / "weights"
    model_weights_path: Path = Path(__file__).resolve().parent / "weights" / "generative_lm.pt"
    tokenizer_path: Path = Path(__file__).resolve().parent / "weights" / "tokenizer.json"
    metadata_path: Path = Path(__file__).resolve().parent / "weights" / "metadata.json"

    # Generation Defaults
    temperature: float = 0.2
    top_p: float = 0.85
    top_k: int = 20
    max_new_tokens: int = 40
    repetition_penalty: float = 1.10
