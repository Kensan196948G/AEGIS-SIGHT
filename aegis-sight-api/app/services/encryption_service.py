"""Data encryption service for AEGIS-SIGHT.

Provides AES-256-GCM encryption/decryption and SHA-256 hashing utilities.
The encryption key is derived from ``settings.SECRET_KEY`` using PBKDF2.
"""

from __future__ import annotations

import base64
import hashlib
import os
import secrets

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings

# Fixed salt for deterministic key derivation from SECRET_KEY.
# In production, consider storing a unique salt per deployment.
_DEFAULT_SALT = b"aegis-sight-encryption-salt-v1"

# PBKDF2 iteration count (OWASP recommended >= 600 000 for SHA-256).
_PBKDF2_ITERATIONS = 600_000

# AES-256-GCM nonce size (96 bits / 12 bytes is recommended by NIST).
_NONCE_SIZE = 12


class EncryptionService:
    """AES-256-GCM encryption service with PBKDF2 key derivation."""

    def __init__(
        self,
        secret_key: str | None = None,
        salt: bytes | None = None,
        iterations: int = _PBKDF2_ITERATIONS,
    ) -> None:
        secret = (secret_key or settings.SECRET_KEY).encode()
        self._salt = salt or _DEFAULT_SALT
        self._iterations = iterations
        self._key = self._derive_key(secret, self._salt, self._iterations)

    # ------------------------------------------------------------------
    # Key derivation
    # ------------------------------------------------------------------

    @staticmethod
    def _derive_key(secret: bytes, salt: bytes, iterations: int) -> bytes:
        """Derive a 256-bit key from *secret* using PBKDF2-HMAC-SHA256."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=iterations,
        )
        return kdf.derive(secret)

    # ------------------------------------------------------------------
    # Encryption / Decryption  (AES-256-GCM)
    # ------------------------------------------------------------------

    def encrypt(self, plaintext: str) -> str:
        """Encrypt *plaintext* and return a URL-safe Base64 encoded ciphertext.

        The output format is ``base64(nonce + ciphertext + tag)``.
        """
        aesgcm = AESGCM(self._key)
        nonce = os.urandom(_NONCE_SIZE)
        ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
        # nonce (12 bytes) + ciphertext+tag
        return base64.urlsafe_b64encode(nonce + ct).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a Base64-encoded ciphertext produced by :meth:`encrypt`."""
        raw = base64.urlsafe_b64decode(ciphertext.encode())
        nonce = raw[:_NONCE_SIZE]
        ct = raw[_NONCE_SIZE:]
        aesgcm = AESGCM(self._key)
        return aesgcm.decrypt(nonce, ct, None).decode()

    # ------------------------------------------------------------------
    # Hashing
    # ------------------------------------------------------------------

    @staticmethod
    def hash_value(value: str) -> str:
        """Return the SHA-256 hex digest of *value*."""
        return hashlib.sha256(value.encode()).hexdigest()

    # ------------------------------------------------------------------
    # Key generation helper
    # ------------------------------------------------------------------

    @staticmethod
    def generate_key() -> str:
        """Generate a cryptographically secure 256-bit key (URL-safe Base64)."""
        return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
