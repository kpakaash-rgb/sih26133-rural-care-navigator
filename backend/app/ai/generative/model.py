"""
app/ai/generative/model.py
==========================
Pure PyTorch implementation of a lightweight Causal Decoder-Only Transformer LM.
Designed and optimized for fast, offline CPU inference (< 30 ms per turn).
Built from scratch without Hugging Face transformers or external pretrained weights.
"""

from __future__ import annotations

import math
from typing import Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from backend.app.ai.generative.config import GenerativeModelConfig


class CausalSelfAttention(nn.Module):
    """Multi-head causal self-attention with lower-triangular causal masking."""

    def __init__(self, config: GenerativeModelConfig):
        super().__init__()
        assert config.d_model % config.n_head == 0, "d_model must be divisible by n_head"

        self.n_head = config.n_head
        self.d_head = config.d_model // config.n_head
        self.d_model = config.d_model

        # Q, K, V combined projection
        self.qkv_proj = nn.Linear(config.d_model, 3 * config.d_model, bias=False)
        self.out_proj = nn.Linear(config.d_model, config.d_model, bias=False)

        self.attn_dropout = nn.Dropout(config.dropout)
        self.resid_dropout = nn.Dropout(config.dropout)

        # Causal mask buffer (upper triangle masked to -inf)
        self.register_buffer(
            "causal_mask",
            torch.tril(torch.ones(config.max_seq_len, config.max_seq_len)).view(
                1, 1, config.max_seq_len, config.max_seq_len
            ),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.size()

        # Compute Q, K, V
        qkv = self.qkv_proj(x)
        q, k, v = qkv.chunk(3, dim=-1)

        # Reshape to (B, n_head, T, d_head)
        q = q.view(B, T, self.n_head, self.d_head).transpose(1, 2)
        k = k.view(B, T, self.n_head, self.d_head).transpose(1, 2)
        v = v.view(B, T, self.n_head, self.d_head).transpose(1, 2)

        # Scaled dot-product attention
        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(self.d_head))
        att = att.masked_fill(self.causal_mask[:, :, :T, :T] == 0, float("-inf"))
        att = F.softmax(att, dim=-1)
        att = self.attn_dropout(att)

        y = att @ v  # (B, n_head, T, d_head)
        y = y.transpose(1, 2).contiguous().view(B, T, C)

        return self.resid_dropout(self.out_proj(y))


class TransformerBlock(nn.Module):
    """Standard pre-LayerNorm Transformer decoder block."""

    def __init__(self, config: GenerativeModelConfig):
        super().__init__()
        self.ln_1 = nn.LayerNorm(config.d_model)
        self.attn = CausalSelfAttention(config)
        self.ln_2 = nn.LayerNorm(config.d_model)
        self.mlp = nn.Sequential(
            nn.Linear(config.d_model, config.d_ff, bias=True),
            nn.GELU(),
            nn.Linear(config.d_ff, config.d_model, bias=True),
            nn.Dropout(config.dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x


class CausalTransformerLM(nn.Module):
    """
    Decoder-only Causal Transformer Language Model.
    Trained from scratch locally for context-conditioned response generation.
    """

    def __init__(self, config: GenerativeModelConfig):
        super().__init__()
        self.config = config

        self.tok_emb = nn.Embedding(config.vocab_size, config.d_model)
        self.pos_emb = nn.Embedding(config.max_seq_len, config.d_model)
        self.drop = nn.Dropout(config.dropout)

        self.blocks = nn.ModuleList([TransformerBlock(config) for _ in range(config.n_layer)])
        self.ln_f = nn.LayerNorm(config.d_model)
        self.lm_head = nn.Linear(config.d_model, config.vocab_size, bias=False)

        # Weight tying between token embedding and LM head
        self.tok_emb.weight = self.lm_head.weight

        # Initialize weights
        self.apply(self._init_weights)

    def _init_weights(self, module: nn.Module):
        if isinstance(module, (nn.Linear, nn.Embedding)):
            module.weight.data.normal_(mean=0.0, std=0.02)
            if isinstance(module, nn.Linear) and module.bias is not None:
                module.bias.data.zero_()
        elif isinstance(module, nn.LayerNorm):
            module.bias.data.zero_()
            module.weight.data.fill_(1.0)

    def get_num_params(self) -> int:
        return sum(p.numel() for p in self.parameters())

    def forward(
        self,
        input_ids: torch.Tensor,
        targets: Optional[torch.Tensor] = None,
        loss_mask: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, Optional[torch.Tensor]]:
        """
        Forward pass.
        Args:
            input_ids: (B, T) token indices
            targets: (B, T) target token indices for teacher forcing
            loss_mask: (B, T) optional binary mask to compute loss ONLY on response tokens
        """
        B, T = input_ids.size()
        assert T <= self.config.max_seq_len, f"Sequence length {T} exceeds max_seq_len {self.config.max_seq_len}"

        positions = torch.arange(0, T, dtype=torch.long, device=input_ids.device).unsqueeze(0)

        # Token + Positional embeddings
        tok_vec = self.tok_emb(input_ids)
        pos_vec = self.pos_emb(positions)
        x = self.drop(tok_vec + pos_vec)

        # Pass through Transformer blocks
        for block in self.blocks:
            x = block(x)

        x = self.ln_f(x)
        logits = self.lm_head(x)  # (B, T, vocab_size)

        loss = None
        if targets is not None:
            # Shift tokens for next-token prediction
            shift_logits = logits[..., :-1, :].contiguous()
            shift_targets = targets[..., 1:].contiguous()

            if loss_mask is not None:
                shift_mask = loss_mask[..., 1:].contiguous().view(-1)
                flat_logits = shift_logits.view(-1, self.config.vocab_size)
                flat_targets = shift_targets.view(-1)

                # Calculate per-token cross entropy
                unmasked_loss = F.cross_entropy(
                    flat_logits, flat_targets, reduction="none", ignore_index=0
                )
                masked_loss = unmasked_loss * shift_mask
                loss = masked_loss.sum() / (shift_mask.sum() + 1e-8)
            else:
                loss = F.cross_entropy(
                    shift_logits.view(-1, self.config.vocab_size),
                    shift_targets.view(-1),
                    ignore_index=0,  # ignore pad token id 0
                )

        return logits, loss

    @torch.no_grad()
    def generate(
        self,
        prompt_ids: torch.Tensor,
        max_new_tokens: int = 40,
        temperature: float = 0.7,
        top_k: int = 40,
        top_p: float = 0.90,
        eos_token_id: int = 4,
        repetition_penalty: float = 1.15,
    ) -> torch.Tensor:
        """
        Autoregressive next-token sampling with temperature, top-k, and nucleus (top-p) filtering.
        """
        self.eval()
        generated = prompt_ids.clone()

        prompt_len = prompt_ids.size(1)

        for _ in range(max_new_tokens):
            # Crop to context window if needed
            cond_input = generated if generated.size(1) <= self.config.max_seq_len else generated[:, -self.config.max_seq_len:]

            logits, _ = self(cond_input)
            next_token_logits = logits[:, -1, :]  # (B, vocab_size)

            # Apply repetition penalty ONLY to tokens generated after the prompt
            if repetition_penalty != 1.0 and generated.size(1) > prompt_len:
                for b in range(generated.size(0)):
                    newly_generated_tokens = set(generated[b, prompt_len:].tolist())
                    for tok in newly_generated_tokens:
                        if next_token_logits[b, tok] > 0:
                            next_token_logits[b, tok] /= repetition_penalty
                        else:
                            next_token_logits[b, tok] *= repetition_penalty

            # Temperature scaling
            if temperature > 0:
                next_token_logits = next_token_logits / temperature
            else:
                # Greedy argmax
                next_token = torch.argmax(next_token_logits, dim=-1, keepdim=True)
                generated = torch.cat((generated, next_token), dim=1)
                if next_token.item() == eos_token_id:
                    break
                continue

            # Top-K filtering
            if top_k > 0:
                indices_to_remove = next_token_logits < torch.topk(next_token_logits, top_k)[0][..., -1, None]
                next_token_logits[indices_to_remove] = float("-inf")

            # Top-P (Nucleus) filtering
            if 0.0 < top_p < 1.0:
                sorted_logits, sorted_indices = torch.sort(next_token_logits, descending=True)
                cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)

                # Remove tokens with cumulative probability above top_p
                sorted_indices_to_remove = cumulative_probs > top_p
                # Shift right to keep first token above threshold
                sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
                sorted_indices_to_remove[..., 0] = 0

                indices_to_remove = sorted_indices_to_remove.scatter(1, sorted_indices, sorted_indices_to_remove)
                next_token_logits[indices_to_remove] = float("-inf")

            # Softmax to probabilities
            probs = F.softmax(next_token_logits, dim=-1)

            # Sample next token
            next_token = torch.multinomial(probs, num_samples=1)
            generated = torch.cat((generated, next_token), dim=1)

            if next_token.item() == eos_token_id:
                break

        return generated
