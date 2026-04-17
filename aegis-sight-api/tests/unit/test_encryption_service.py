"""Unit tests for EncryptionService — AES-256-GCM / PBKDF2 pure logic."""

import base64

import pytest
from cryptography.exceptions import InvalidTag

from app.services.encryption_service import (
    _DEFAULT_SALT,
    _NONCE_SIZE,
    _PBKDF2_ITERATIONS,
    EncryptionService,
)


def _svc(secret: str = "test-secret-key") -> EncryptionService:
    """Create an EncryptionService with a fast iteration count for tests."""
    return EncryptionService(secret_key=secret, iterations=1)


# ---------------------------------------------------------------------------
# Key derivation
# ---------------------------------------------------------------------------
class TestDeriveKey:
    def test_returns_32_bytes(self) -> None:
        key = EncryptionService._derive_key(b"secret", b"salt", 1)
        assert len(key) == 32

    def test_deterministic(self) -> None:
        k1 = EncryptionService._derive_key(b"secret", b"salt", 1)
        k2 = EncryptionService._derive_key(b"secret", b"salt", 1)
        assert k1 == k2

    def test_different_secrets_different_keys(self) -> None:
        k1 = EncryptionService._derive_key(b"secret1", b"salt", 1)
        k2 = EncryptionService._derive_key(b"secret2", b"salt", 1)
        assert k1 != k2

    def test_different_salts_different_keys(self) -> None:
        k1 = EncryptionService._derive_key(b"secret", b"salt1", 1)
        k2 = EncryptionService._derive_key(b"secret", b"salt2", 1)
        assert k1 != k2

    def test_default_iterations(self) -> None:
        assert _PBKDF2_ITERATIONS >= 600_000


# ---------------------------------------------------------------------------
# encrypt / decrypt round-trip
# ---------------------------------------------------------------------------
class TestEncryptDecrypt:
    def test_roundtrip_simple(self) -> None:
        svc = _svc()
        ct = svc.encrypt("hello world")
        assert svc.decrypt(ct) == "hello world"

    def test_roundtrip_empty_string(self) -> None:
        svc = _svc()
        ct = svc.encrypt("")
        assert svc.decrypt(ct) == ""

    def test_roundtrip_unicode(self) -> None:
        svc = _svc()
        msg = "個人情報: テスト"
        ct = svc.encrypt(msg)
        assert svc.decrypt(ct) == msg

    def test_roundtrip_long_text(self) -> None:
        svc = _svc()
        msg = "A" * 10_000
        ct = svc.encrypt(msg)
        assert svc.decrypt(ct) == msg

    def test_ciphertext_is_base64(self) -> None:
        svc = _svc()
        ct = svc.encrypt("test")
        # must be valid URL-safe base64
        raw = base64.urlsafe_b64decode(ct.encode())
        assert len(raw) > _NONCE_SIZE

    def test_nonce_prefix_size(self) -> None:
        svc = _svc()
        ct = svc.encrypt("test")
        raw = base64.urlsafe_b64decode(ct.encode())
        assert len(raw[:_NONCE_SIZE]) == 12

    def test_different_nonces_each_call(self) -> None:
        svc = _svc()
        ct1 = svc.encrypt("same plaintext")
        ct2 = svc.encrypt("same plaintext")
        # random nonce → different ciphertext
        assert ct1 != ct2

    def test_wrong_key_raises(self) -> None:
        svc1 = _svc("key-a")
        svc2 = _svc("key-b")
        ct = svc1.encrypt("secret")
        with pytest.raises(InvalidTag):
            svc2.decrypt(ct)

    def test_tampered_ciphertext_raises(self) -> None:
        svc = _svc()
        ct = svc.encrypt("data")
        raw = bytearray(base64.urlsafe_b64decode(ct.encode()))
        raw[-1] ^= 0xFF  # flip last byte (GCM tag)
        tampered = base64.urlsafe_b64encode(bytes(raw)).decode()
        with pytest.raises(InvalidTag):
            svc.decrypt(tampered)

    def test_truncated_ciphertext_raises(self) -> None:
        svc = _svc()
        ct = svc.encrypt("data")
        raw = base64.urlsafe_b64decode(ct.encode())
        truncated = base64.urlsafe_b64encode(raw[:8]).decode()
        with pytest.raises(InvalidTag):
            svc.decrypt(truncated)


# ---------------------------------------------------------------------------
# hash_value
# ---------------------------------------------------------------------------
class TestHashValue:
    def test_returns_hex_digest(self) -> None:
        digest = EncryptionService.hash_value("test")
        assert all(c in "0123456789abcdef" for c in digest)

    def test_sha256_length(self) -> None:
        digest = EncryptionService.hash_value("any string")
        assert len(digest) == 64

    def test_known_value(self) -> None:
        # SHA-256("") = e3b0c44298fc1c149afb...
        digest = EncryptionService.hash_value("")
        assert digest == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    def test_deterministic(self) -> None:
        assert EncryptionService.hash_value("x") == EncryptionService.hash_value("x")

    def test_different_inputs_different_digests(self) -> None:
        assert EncryptionService.hash_value("a") != EncryptionService.hash_value("b")


# ---------------------------------------------------------------------------
# generate_key
# ---------------------------------------------------------------------------
class TestGenerateKey:
    def test_returns_string(self) -> None:
        assert isinstance(EncryptionService.generate_key(), str)

    def test_decodes_to_32_bytes(self) -> None:
        key = EncryptionService.generate_key()
        raw = base64.urlsafe_b64decode(key.encode() + b"==")
        assert len(raw) == 32

    def test_unique_each_call(self) -> None:
        k1 = EncryptionService.generate_key()
        k2 = EncryptionService.generate_key()
        assert k1 != k2


# ---------------------------------------------------------------------------
# constructor / defaults
# ---------------------------------------------------------------------------
class TestConstructor:
    def test_default_salt_used(self) -> None:
        svc = EncryptionService(secret_key="k", iterations=1)
        assert svc._salt == _DEFAULT_SALT

    def test_custom_salt_used(self) -> None:
        svc = EncryptionService(secret_key="k", salt=b"custom", iterations=1)
        assert svc._salt == b"custom"

    def test_different_salt_different_key(self) -> None:
        svc1 = EncryptionService(secret_key="k", salt=b"s1", iterations=1)
        svc2 = EncryptionService(secret_key="k", salt=b"s2", iterations=1)
        assert svc1._key != svc2._key
