"""Unit tests for app/core/security.py — password hashing and JWT functions."""

from datetime import timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)

_TEST_SECRET = "unit-test-secret-key"
_TEST_ALGO = "HS256"

_mock_settings = patch.multiple(
    "app.core.security.settings",
    SECRET_KEY=_TEST_SECRET,
    ALGORITHM=_TEST_ALGO,
    ACCESS_TOKEN_EXPIRE_MINUTES=30,
)


# ---------------------------------------------------------------------------
# verify_password / get_password_hash
# ---------------------------------------------------------------------------


class TestGetPasswordHash:
    def test_returns_string(self) -> None:
        hashed = get_password_hash("mypassword")
        assert isinstance(hashed, str)

    def test_not_plain_text(self) -> None:
        hashed = get_password_hash("mypassword")
        assert hashed != "mypassword"

    def test_bcrypt_prefix(self) -> None:
        hashed = get_password_hash("mypassword")
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")

    def test_different_passwords_produce_different_hashes(self) -> None:
        assert get_password_hash("password1") != get_password_hash("password2")

    def test_same_password_produces_different_hashes(self) -> None:
        # bcrypt embeds a random salt
        assert get_password_hash("same") != get_password_hash("same")


class TestVerifyPassword:
    def test_correct_password_returns_true(self) -> None:
        hashed = get_password_hash("correct")
        assert verify_password("correct", hashed) is True

    def test_wrong_password_returns_false(self) -> None:
        hashed = get_password_hash("correct")
        assert verify_password("wrong", hashed) is False

    def test_empty_password_with_hash(self) -> None:
        hashed = get_password_hash("")
        assert verify_password("", hashed) is True

    def test_case_sensitive(self) -> None:
        hashed = get_password_hash("Password")
        assert verify_password("password", hashed) is False

    def test_unicode_password(self) -> None:
        pwd = "パスワード123"
        hashed = get_password_hash(pwd)
        assert verify_password(pwd, hashed) is True


# ---------------------------------------------------------------------------
# create_access_token
# ---------------------------------------------------------------------------


class TestCreateAccessToken:
    def test_returns_string(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user123"})
        assert isinstance(token, str)

    def test_token_has_three_parts(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user123"})
        assert len(token.split(".")) == 3

    def test_custom_expires_delta(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user123"}, expires_delta=timedelta(hours=1))
        assert isinstance(token, str)

    def test_empty_data(self) -> None:
        with _mock_settings:
            token = create_access_token({})
        assert isinstance(token, str)

    def test_data_preserved_in_payload(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "alice", "role": "admin"})
            payload = decode_access_token(token)
        assert payload["sub"] == "alice"
        assert payload["role"] == "admin"

    def test_exp_claim_present(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user123"})
            payload = decode_access_token(token)
        assert "exp" in payload


# ---------------------------------------------------------------------------
# decode_access_token
# ---------------------------------------------------------------------------


class TestDecodeAccessToken:
    def test_valid_token_returns_dict(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user42"})
            payload = decode_access_token(token)
        assert isinstance(payload, dict)
        assert payload["sub"] == "user42"

    def test_invalid_token_raises_http_401(self) -> None:
        with _mock_settings:
            with pytest.raises(HTTPException) as exc_info:
                decode_access_token("not.a.valid.token")
        assert exc_info.value.status_code == 401

    def test_tampered_token_raises_http_401(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user1"})
            parts = token.split(".")
            tampered = parts[0] + "." + parts[1] + "." + "invalidsig"
            with pytest.raises(HTTPException) as exc_info:
                decode_access_token(tampered)
        assert exc_info.value.status_code == 401

    def test_expired_token_raises_http_401(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user1"}, expires_delta=timedelta(seconds=-1))
            with pytest.raises(HTTPException) as exc_info:
                decode_access_token(token)
        assert exc_info.value.status_code == 401

    def test_wrong_secret_raises_http_401(self) -> None:
        with _mock_settings:
            token = create_access_token({"sub": "user1"})
        # decode with different secret
        with patch.multiple(
            "app.core.security.settings",
            SECRET_KEY="different-secret",
            ALGORITHM=_TEST_ALGO,
        ):
            with pytest.raises(HTTPException) as exc_info:
                decode_access_token(token)
        assert exc_info.value.status_code == 401

    def test_www_authenticate_header_present(self) -> None:
        with _mock_settings:
            with pytest.raises(HTTPException) as exc_info:
                decode_access_token("bad.token.here")
        assert exc_info.value.headers is not None
        assert "WWW-Authenticate" in exc_info.value.headers
