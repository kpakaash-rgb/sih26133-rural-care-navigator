"""
app/ai/generative/tokenizer.py
==============================
Lightweight, self-contained local Subword Byte-Pair Encoding (BPE) Tokenizer.
Trained directly from scratch on the Rural Care Navigator conversational corpus.
Supports English, Devanagari Hindi, and Romanized Hinglish with zero external pretrained data.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


class LocalSubwordTokenizer:
    """
    Subword Byte-Pair Encoding (BPE) tokenizer trained purely on local project data.
    Preserves special control tokens (<|context|>, <|response|>, <|end|>, etc.).
    """

    SPECIAL_TOKENS = [
        "<|pad|>",
        "<|unk|>",
        "<|context|>",
        "<|response|>",
        "<|end|>",
    ]

    def __init__(self, vocab_size: int = 3072):
        self.target_vocab_size = vocab_size
        self.special_tokens = list(self.SPECIAL_TOKENS)
        self.special_tokens_set: Set[str] = set(self.special_tokens)

        # Token mappings
        self.token_to_id: Dict[str, int] = {}
        self.id_to_token: Dict[int, str] = {}
        self.merges: List[Tuple[str, str]] = []
        self.merge_ranks: Dict[Tuple[str, str], int] = {}

        # Pre-assign special tokens
        for idx, token in enumerate(self.special_tokens):
            self.token_to_id[token] = idx
            self.id_to_token[idx] = token

    @property
    def pad_token_id(self) -> int:
        return self.token_to_id["<|pad|>"]

    @property
    def unk_token_id(self) -> int:
        return self.token_to_id["<|unk|>"]

    @property
    def context_token_id(self) -> int:
        return self.token_to_id["<|context|>"]

    @property
    def response_token_id(self) -> int:
        return self.token_to_id["<|response|>"]

    @property
    def end_token_id(self) -> int:
        return self.token_to_id["<|end|>"]

    @property
    def vocab_size(self) -> int:
        return len(self.token_to_id)

    def _split_into_words_and_specials(self, text: str) -> List[str]:
        """Split text while preserving exact special tokens and word boundary space markers."""
        # Create regex pattern for all special tokens
        special_pat = "(" + "|".join(re.escape(tok) for tok in self.special_tokens) + ")"
        raw_parts = re.split(special_pat, text)
        chunks: List[str] = []
        for part in raw_parts:
            if not part:
                continue
            if part in self.special_tokens_set:
                chunks.append(part)
            else:
                # Tokenize with SentencePiece-style prefix ' ' for whitespace
                tokens = re.findall(r"\n|[ ]*(?:[\w]+|[^\w\s])", part, re.UNICODE)
                for t in tokens:
                    if t == "\n":
                        chunks.append("\n")
                    elif t.startswith(" "):
                        chunks.append(" " + t.lstrip(" "))
                    else:
                        chunks.append(t)
        return chunks

    def train(self, texts: List[str], min_frequency: int = 2):
        """Train BPE subword vocabulary and merges from scratch on corpus."""
        # 1. Collect all initial characters across the corpus
        char_counts: Dict[str, int] = {}
        word_freqs: Dict[Tuple[str, ...], int] = {}

        for text in texts:
            chunks = self._split_into_words_and_specials(text)
            for chunk in chunks:
                if chunk in self.special_tokens_set:
                    continue
                # Split chunk into characters with a distinctive word-boundary marker or characters
                chars = tuple(list(chunk))
                if chars:
                    word_freqs[chars] = word_freqs.get(chars, 0) + 1
                    for ch in chars:
                        char_counts[ch] = char_counts.get(ch, 0) + 1

        # Add all unique characters to vocabulary
        for ch in sorted(char_counts.keys()):
            if ch not in self.token_to_id:
                new_id = len(self.token_to_id)
                self.token_to_id[ch] = new_id
                self.id_to_token[new_id] = ch

        # 2. Iteratively merge the most frequent adjacent pairs
        vocab_budget = self.target_vocab_size - len(self.token_to_id)
        current_words = dict(word_freqs)

        for merge_idx in range(vocab_budget):
            pair_counts: Dict[Tuple[str, str], int] = {}
            for word_tuple, freq in current_words.items():
                if len(word_tuple) < 2:
                    continue
                for i in range(len(word_tuple) - 1):
                    pair = (word_tuple[i], word_tuple[i + 1])
                    pair_counts[pair] = pair_counts.get(pair, 0) + freq

            if not pair_counts:
                break

            # Find best pair
            best_pair, best_count = max(pair_counts.items(), key=lambda item: item[1])
            if best_count < min_frequency:
                break

            merged_token = best_pair[0] + best_pair[1]
            if merged_token not in self.token_to_id:
                new_id = len(self.token_to_id)
                self.token_to_id[merged_token] = new_id
                self.id_to_token[new_id] = merged_token
                self.merges.append(best_pair)
                self.merge_ranks[best_pair] = merge_idx

            # Apply merge to current word representations
            new_words: Dict[Tuple[str, ...], int] = {}
            p0, p1 = best_pair
            for word_tuple, freq in current_words.items():
                if len(word_tuple) < 2:
                    new_words[word_tuple] = freq
                    continue
                new_tuple: List[str] = []
                i = 0
                while i < len(word_tuple):
                    if i < len(word_tuple) - 1 and word_tuple[i] == p0 and word_tuple[i + 1] == p1:
                        new_tuple.append(merged_token)
                        i += 2
                    else:
                        new_tuple.append(word_tuple[i])
                        i += 1
                new_words[tuple(new_tuple)] = freq
            current_words = new_words

    def _encode_word(self, word: str) -> List[str]:
        """Apply learned BPE merges greedily to a single word/symbol."""
        if len(word) <= 1:
            return [word] if word in self.token_to_id else [self.id_to_token[self.unk_token_id]]

        tokens = list(word)
        while len(tokens) > 1:
            # Find candidate pairs and their merge ranks
            pairs = [(tokens[i], tokens[i + 1]) for i in range(len(tokens) - 1)]
            candidates = [(pair, self.merge_ranks[pair]) for pair in pairs if pair in self.merge_ranks]
            if not candidates:
                break

            # Merge pair with smallest rank (highest priority)
            best_pair, _ = min(candidates, key=lambda item: item[1])
            p0, p1 = best_pair
            merged = p0 + p1
            new_tokens = []
            i = 0
            while i < len(tokens):
                if i < len(tokens) - 1 and tokens[i] == p0 and tokens[i + 1] == p1:
                    new_tokens.append(merged)
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            tokens = new_tokens

        return tokens

    def encode(self, text: str) -> List[int]:
        """Encode text string into token IDs."""
        chunks = self._split_into_words_and_specials(text)
        token_ids: List[int] = []

        for chunk in chunks:
            if chunk in self.special_tokens_set:
                token_ids.append(self.token_to_id[chunk])
            else:
                subwords = self._encode_word(chunk)
                for sw in subwords:
                    token_ids.append(self.token_to_id.get(sw, self.unk_token_id))

        return token_ids

    def decode(self, token_ids: List[int], skip_special_tokens: bool = False) -> str:
        """Decode token IDs back into string."""
        tokens: List[str] = []
        for tid in token_ids:
            if tid not in self.id_to_token:
                tok = "<|unk|>"
            else:
                tok = self.id_to_token[tid]

            if skip_special_tokens and tok in self.special_tokens_set:
                continue
            tokens.append(tok)

        return "".join(tokens).replace(" ", " ")

    def save(self, path: Path | str):
        """Save vocabulary and merges to JSON."""
        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "token_to_id": self.token_to_id,
            "merges": self.merges,
            "target_vocab_size": self.target_vocab_size,
        }
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: Path | str) -> "LocalSubwordTokenizer":
        """Load tokenizer from JSON."""
        load_path = Path(path)
        if not load_path.exists():
            raise FileNotFoundError(f"Tokenizer not found at {load_path}")

        with open(load_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        tokenizer = cls(vocab_size=data.get("target_vocab_size", 3072))
        tokenizer.token_to_id = data["token_to_id"]
        tokenizer.id_to_token = {int(v): k for k, v in tokenizer.token_to_id.items()}
        tokenizer.merges = [tuple(m) for m in data.get("merges", [])]
        tokenizer.merge_ranks = {tuple(m): idx for idx, m in enumerate(tokenizer.merges)}
        return tokenizer
