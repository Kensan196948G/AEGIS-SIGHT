"""Tests for EncryptionService."""

import hashlib

import pytest
from cryptography.exceptions import InvalidTag

from app.services.encryption_service import EncryptionService

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def svc() -> EncryptionService:
    """EncryptionService with a deterministic test key."""
    return EncryptionService(secret_key="test-secret-key-for-unit-tests")


# ---------------------------------------------------------------------------
# Encrypt / Decrypt
# ---------------------------------------------------------------------------


class TestEncryptDecrypt:
    def test_roundtrip(self, svc: EncryptionService):
        """Encrypting then decrypting returns the original plaintext."""
        plaintext = "AEGIS-SIGHT-LICENSE-KEY-12345"
        ciphertext = svc.encrypt(plaintext)
        assert ciphertext != plaintext
        assert svc.decrypt(ciphertext) == plaintext

    def test_different_ciphertexts(self, svc: EncryptionService):
        """Two encryptions of the same plaintext produce different ciphertexts (random nonce)."""
        plaintext = "same-input"
        ct1 = svc.encrypt(plaintext)
        ct2 = svc.encrypt(plaintext)
        assert ct1 != ct2

    def test_decrypt_wrong_key_fails(self):
        """Decrypting with a different key raises an error."""
        svc1 = EncryptionService(secret_key="key-one")
        svc2 = EncryptionService(secret_key="key-two")
        ciphertext = svc1.encrypt("secret data")
        with pytest.raises(InvalidTag):
            svc2.decrypt(ciphertext)

    def test_empty_string(self, svc: EncryptionService):
        """Empty string can be encrypted and decrypted."""
        ct = svc.encrypt("")
        assert svc.decrypt(ct) == ""

    def test_unicode(self, svc: EncryptionService):
        """Unicode content survives encryption roundtrip."""
        plaintext = "AEGIS-SIGHT ライセンスキー 🔐"
        ct = svc.encrypt(plaintext)
        assert svc.decrypt(ct) == plaintext

    def test_long_plaintext(self, svc: EncryptionService):
        """Large payloads are handled correctly."""
        plaintext = "A" * 100_000
        ct = svc.encrypt(plaintext)
        assert svc.decrypt(ct) == plaintext


# ---------------------------------------------------------------------------
# Hashing
# ---------------------------------------------------------------------------


class TestHash:
    def test_hash_deterministic(self):
        """Same input always produces the same hash."""
        h1 = EncryptionService.hash_value("test-value")
        h2 = EncryptionService.hash_value("test-value")
        assert h1 == h2

    def test_hash_is_sha256(self):
        """hash_value produces a valid SHA-256 hex digest."""
        value = "hello"
        expected = hashlib.sha256(b"hello").hexdigest()
        assert EncryptionService.hash_value(value) == expected
        assert len(EncryptionService.hash_value(value)) == 64

    def test_different_inputs_different_hashes(self):
        """Different inputs produce different hashes."""
        h1 = EncryptionService.hash_value("input-a")
        h2 = EncryptionService.hash_value("input-b")
        assert h1 != h2


# ---------------------------------------------------------------------------
# Key generation
# ---------------------------------------------------------------------------


class TestKeyGeneration:
    def test_generate_key_length(self):
        """Generated key is a URL-safe Base64 string of 44 characters (32 bytes)."""
        key = EncryptionService.generate_key()
        assert isinstance(key, str)
        # 32 bytes in base64 = 44 chars (with padding) or 43 without
        assert len(key) >= 43

    def test_generate_key_uniqueness(self):
        """Two generated keys are different."""
        k1 = EncryptionService.generate_key()
        k2 = EncryptionService.generate_key()
        assert k1 != k2
