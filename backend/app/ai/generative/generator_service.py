"""
app/ai/generative/generator_service.py
======================================
In-process runtime inference service for the local Causal Transformer response model.
Transforms active ConversationMemory state into structured context prompts,
generates natural response phrasing autoregressively, and validates outputs.
Falls back seamlessly to the deterministic response generator if validation fails.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import torch

from backend.app.ai.generative.config import GenerativeModelConfig
from backend.app.ai.generative.dataset import serialize_context
from backend.app.ai.generative.model import CausalTransformerLM
from backend.app.ai.generative.tokenizer import LocalSubwordTokenizer
from backend.app.ai.generative.validator import GenerativeResponseValidator

logger = logging.getLogger("rural_care.generative_service")


class LocalGenerativeResponseService:
    """
    Singleton service managing runtime inference for the local generative model.
    100% offline, CPU-optimized, zero cloud dependency.
    """

    _instance: Optional["LocalGenerativeResponseService"] = None

    def __init__(self, config: Optional[GenerativeModelConfig] = None):
        self.config = config or GenerativeModelConfig()
        self.tokenizer: Optional[LocalSubwordTokenizer] = None
        self.model: Optional[CausalTransformerLM] = None
        self.validator = GenerativeResponseValidator()
        self._is_ready = False
        self.load()

    @classmethod
    def get_instance(cls) -> "LocalGenerativeResponseService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load(self) -> bool:
        """Load tokenizer vocabulary and model weights."""
        try:
            if not self.config.tokenizer_path.exists() or not self.config.model_weights_path.exists():
                logger.info(
                    "[LOCAL_GEN_LM] Weights not found at %s. Service pending initial training.",
                    self.config.model_weights_path,
                )
                self._is_ready = False
                return False

            # 1. Load Tokenizer
            self.tokenizer = LocalSubwordTokenizer.load(self.config.tokenizer_path)
            self.config.vocab_size = self.tokenizer.vocab_size

            # 2. Load Model
            self.model = CausalTransformerLM(self.config)
            state_dict = torch.load(self.config.model_weights_path, map_location="cpu")
            self.model.load_state_dict(state_dict)
            self.model.eval()

            self._is_ready = True
            logger.info(
                "[LOCAL_GEN_LM] Generative LM loaded successfully (params=%d, vocab=%d)",
                self.model.get_num_params(),
                self.tokenizer.vocab_size,
            )
            return True
        except Exception as exc:
            logger.exception("[LOCAL_GEN_LM] Failed to load generative model: %s", exc)
            self._is_ready = False
            return False

    @property
    def is_ready(self) -> bool:
        return self._is_ready and self.model is not None and self.tokenizer is not None

    def build_context_prompt(self, action: Any, memory: Any) -> str:
        """Serialize current state into prompt format."""
        phase = getattr(memory, "call_phase", "SYMPTOMS") or "SYMPTOMS"

        # Format symptoms
        symptoms_list = getattr(memory, "symptoms", []) or []
        sym_str = ",".join(symptoms_list) if symptoms_list else "NONE"

        dur_str = getattr(memory, "duration", None) or "NONE"
        loc_str = getattr(memory, "locality", None) or "NONE"
        name_str = getattr(memory, "patient_name", None) or "NONE"
        age_str = str(getattr(memory, "age", "NONE")) if getattr(memory, "age", None) else "NONE"
        gender_str = getattr(memory, "gender", None) or "NONE"

        # Triage and facility details
        triage_res = getattr(memory, "triage_result", None) or {}
        care_str = triage_res.get("recommended_care", "NONE") if isinstance(triage_res, dict) else "NONE"

        facility_obj = getattr(memory, "recommended_facility", None) or {}
        fac_str = facility_obj.get("name", "NONE") if isinstance(facility_obj, dict) else "NONE"

        # Language preference
        lang = "en"
        mem_lang = getattr(memory, "language", "en-IN")
        act_lang = getattr(action, "language", "en")
        if "hi" in str(mem_lang).lower() or act_lang == "hi":
            lang = "hi"

        context_body = serialize_context(
            phase=phase,
            sym=sym_str,
            dur=dur_str,
            loc=loc_str,
            name=name_str,
            age=age_str,
            gender=gender_str,
            care=care_str,
            facility=fac_str,
            lang=lang,
        )

        return f"<|context|>\n{context_body}\n<|response|>\n"

    def generate(
        self,
        action: Any,
        memory: Any,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        top_k: Optional[int] = None,
        max_new_tokens: Optional[int] = None,
    ) -> Tuple[Optional[str], bool, Optional[str], float]:
        """
        Generate response text conditioned on state and validate.
        Returns:
            (response_text, is_valid, failure_reason, latency_ms)
        """
        t0 = time.perf_counter()

        # Deterministic Emergency Bypass: Never call generative model for emergency
        if action and (getattr(action, "emergency", False) or getattr(action, "intent", None) == "EMERGENCY"):
            return None, False, "emergency_bypass_deterministic", 0.0

        if not self.is_ready:
            return None, False, "model_not_ready", 0.0

        try:
            prompt_str = self.build_context_prompt(action, memory)
            prompt_tokens = self.tokenizer.encode(prompt_str)
            prompt_tensor = torch.tensor([prompt_tokens], dtype=torch.long)

            temp = temperature if temperature is not None else self.config.temperature
            p = top_p if top_p is not None else self.config.top_p
            k = top_k if top_k is not None else self.config.top_k
            max_tokens = max_new_tokens or self.config.max_new_tokens

            # Autoregressively sample tokens
            out_tokens = self.model.generate(
                prompt_tensor,
                max_new_tokens=max_tokens,
                temperature=temp,
                top_p=p,
                top_k=k,
                eos_token_id=self.tokenizer.end_token_id,
                repetition_penalty=self.config.repetition_penalty,
            )

            # Extract generated tokens after the prompt
            gen_tokens = out_tokens[0][len(prompt_tokens):].tolist()
            raw_response = self.tokenizer.decode(gen_tokens, skip_special_tokens=True)
            cleaned_response = self.validator.clean_text(raw_response)

            latency_ms = (time.perf_counter() - t0) * 1000

            # Validate generated response against clinical & state boundaries
            is_valid, reason = self.validator.validate(cleaned_response, memory, action)
            if not is_valid:
                logger.info("[LOCAL_GEN_LM] Validation rejected (%s): '%s'", reason, cleaned_response)
                return cleaned_response, False, reason, latency_ms

            return cleaned_response, True, None, latency_ms

        except Exception as exc:
            logger.exception("[LOCAL_GEN_LM] Error during generation: %s", exc)
            latency_ms = (time.perf_counter() - t0) * 1000
            return None, False, f"exception: {exc}", latency_ms

    def generate_text_from_context(
        self,
        context_str: str,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        top_k: Optional[int] = None,
        max_new_tokens: Optional[int] = None,
    ) -> Tuple[str, float]:
        """Generate response text directly from a raw context string."""
        t0 = time.perf_counter()
        if not self.is_ready:
            raise RuntimeError("Generative model not loaded")
        prompt_str = f"<|context|>\n{context_str.strip()}\n<|response|>\n"
        prompt_tokens = self.tokenizer.encode(prompt_str)
        prompt_tensor = torch.tensor([prompt_tokens], dtype=torch.long)

        temp = temperature if temperature is not None else self.config.temperature
        p = top_p if top_p is not None else self.config.top_p
        k = top_k if top_k is not None else self.config.top_k
        max_tokens = max_new_tokens or self.config.max_new_tokens

        out_tokens = self.model.generate(
            prompt_tensor,
            max_new_tokens=max_tokens,
            temperature=temp,
            top_p=p,
            top_k=k,
            eos_token_id=self.tokenizer.end_token_id,
            repetition_penalty=self.config.repetition_penalty,
        )
        gen_tokens = out_tokens[0][len(prompt_tokens):].tolist()
        raw_response = self.tokenizer.decode(gen_tokens, skip_special_tokens=True)
        cleaned_response = self.validator.clean_text(raw_response)
        latency_ms = (time.perf_counter() - t0) * 1000
        return cleaned_response, latency_ms

