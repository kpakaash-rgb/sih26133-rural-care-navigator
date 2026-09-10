"""
app/ai/generative/train.py
==========================
End-to-end local training pipeline for the Rural Care Navigator Causal Transformer.
1. Generates & saves the diverse healthcare intake dataset (32 scenarios).
2. Trains the local Subword BPE Tokenizer from scratch on the corpus.
3. Trains the CausalTransformerLM with teacher-forced cross entropy on response tokens.
4. Evaluates validation loss and perplexity.
5. Serializes weights, tokenizer vocabulary, and training metadata.
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Tuple

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split

# Ensure repo root is on sys.path
REPO_ROOT = Path(__file__).resolve().parents[4]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.ai.generative.config import GenerativeModelConfig
from backend.app.ai.generative.dataset import (
    IntakeGenerativeDataset,
    generate_rural_intake_dataset,
    load_dataset_jsonl,
    save_dataset_jsonl,
)
from backend.app.ai.generative.model import CausalTransformerLM
from backend.app.ai.generative.tokenizer import LocalSubwordTokenizer


def train_generative_model(epochs: int = 35) -> Dict[str, Any]:
    """Train local causal transformer from scratch on CPU."""
    start_wall_time = time.time()
    config = GenerativeModelConfig(epochs=epochs)

    print("=================================================================")
    print("Training Rural Care Navigator Local Generative Conversational LM")
    print("=================================================================")

    # 1. Load or synthesize diverse intake corpus (do not modify existing dataset)
    if config.data_path.exists():
        print(f"\n[1/5] Loading existing intake training dataset from {config.data_path}...")
        samples = load_dataset_jsonl(config.data_path)
        print(f"Loaded {len(samples)} existing conversational pairs (dataset preserved).")
    else:
        print("\n[1/5] Synthesizing diverse intake training dataset...")
        samples = generate_rural_intake_dataset()
        save_dataset_jsonl(samples, config.data_path)
        print(f"Generated {len(samples)} diverse conversational pairs -> {config.data_path}")

    # 2. Train local Subword BPE Tokenizer from scratch on new clean corpus
    print("\n[2/5] Training local Subword BPE Tokenizer from scratch on clean corpus...")
    corpus_texts: List[str] = []
    for s in samples:
        corpus_texts.append(f"<|context|>\n{s['context']}\n<|response|>\n{s['response']}<|end|>")

    tokenizer = LocalSubwordTokenizer(vocab_size=config.vocab_size)
    tokenizer.train(corpus_texts, min_frequency=2)
    tokenizer.save(config.tokenizer_path)
    print(f"BPE Tokenizer trained successfully. Learned vocabulary size: {tokenizer.vocab_size}")

    # Update config with actual vocabulary size
    config.vocab_size = tokenizer.vocab_size

    # 3. Create Dataset & Train/Validation Split
    print("\n[3/5] Encoding context-response pairs into tensors...")
    full_dataset = IntakeGenerativeDataset(samples, tokenizer, max_seq_len=config.max_seq_len)

    val_size = max(1, int(len(full_dataset) * config.val_split))
    train_size = len(full_dataset) - val_size
    generator = torch.Generator().manual_seed(config.seed)
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size], generator=generator)

    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False)

    print(f"Train samples: {train_size} | Validation samples: {val_size}")

    # 4. Instantiate Model & Optimizer
    print("\n[4/5] Initializing CausalTransformerLM...")
    torch.manual_seed(config.seed)
    model = CausalTransformerLM(config)
    num_params = model.get_num_params()
    print(f"Model parameters: {num_params:,} ({num_params / 1e6:.2f}M)")

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.learning_rate,
        weight_decay=config.weight_decay,
    )

    # Cosine annealing learning rate schedule
    total_steps = len(train_loader) * config.epochs
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=total_steps, eta_min=1e-5)

    print(f"\n[5/5] Training for {config.epochs} epochs on CPU (batch_size={config.batch_size})...")
    best_val_loss = float("inf")
    train_losses: List[float] = []
    val_losses: List[float] = []

    for epoch in range(1, config.epochs + 1):
        # Training loop
        model.train()
        running_train_loss = 0.0
        train_steps = 0

        for input_ids, targets, loss_mask in train_loader:
            optimizer.zero_grad()
            _, loss = model(input_ids, targets=targets, loss_mask=loss_mask)

            if loss is not None and not torch.isnan(loss):
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                scheduler.step()

                running_train_loss += loss.item()
                train_steps += 1

        avg_train_loss = running_train_loss / max(1, train_steps)
        train_losses.append(avg_train_loss)

        # Validation loop
        model.eval()
        running_val_loss = 0.0
        val_steps = 0

        with torch.no_grad():
            for input_ids, targets, loss_mask in val_loader:
                _, v_loss = model(input_ids, targets=targets, loss_mask=loss_mask)
                if v_loss is not None and not torch.isnan(v_loss):
                    running_val_loss += v_loss.item()
                    val_steps += 1

        avg_val_loss = running_val_loss / max(1, val_steps)
        val_losses.append(avg_val_loss)

        val_perplexity = math.exp(min(avg_val_loss, 20.0))

        if epoch == 1 or epoch % 5 == 0 or epoch == config.epochs:
            print(
                f"Epoch {epoch:2d}/{config.epochs:2d} | "
                f"Train Loss: {avg_train_loss:.4f} | "
                f"Val Loss: {avg_val_loss:.4f} | "
                f"Val Perplexity: {val_perplexity:.2f}"
            )

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            # Save best checkpoint
            config.weights_dir.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), config.model_weights_path)

    total_training_duration = time.time() - start_wall_time
    final_perplexity = math.exp(min(best_val_loss, 20.0))

    # Calculate model file size
    model_file_size_mb = config.model_weights_path.stat().st_size / (1024 * 1024)

    # Save training metadata
    metadata = {
        "model_architecture": "Decoder-only Causal Transformer (NanoGPT-style)",
        "d_model": config.d_model,
        "n_layer": config.n_layer,
        "n_head": config.n_head,
        "d_ff": config.d_ff,
        "max_seq_len": config.max_seq_len,
        "dataset_example_count": len(samples),
        "train_example_count": train_size,
        "validation_example_count": val_size,
        "vocabulary_size": tokenizer.vocab_size,
        "parameter_count": num_params,
        "train_loss": round(float(train_losses[-1]), 4),
        "validation_loss": round(float(best_val_loss), 4),
        "perplexity": round(float(final_perplexity), 2),
        "number_of_epochs": config.epochs,
        "training_duration": f"{round(total_training_duration, 2)}s",
        "training_duration_seconds": round(total_training_duration, 2),
        "model_file_size_mb": round(model_file_size_mb, 2),
        "hardware_used": "CPU (PyTorch - Intel/AMD x86_64)",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(config.metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("\n=================================================================")
    print("Training Complete & Artifacts Saved:")
    print(f"  - Weights:       {config.model_weights_path} ({model_file_size_mb:.2f} MB)")
    print(f"  - Tokenizer:     {config.tokenizer_path} ({tokenizer.vocab_size} tokens)")
    print(f"  - Metadata:      {config.metadata_path}")
    print(f"  - Parameters:    {num_params:,}")
    print(f"  - Best Val Loss: {best_val_loss:.4f} (Perplexity: {final_perplexity:.2f})")
    print(f"  - Total Time:    {total_training_duration:.2f} s")
    print("=================================================================")

    return metadata


if __name__ == "__main__":
    train_generative_model(epochs=35)
