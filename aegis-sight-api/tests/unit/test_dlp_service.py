"""Unit tests for DLPService._matches() static method — no DB required."""

from unittest.mock import MagicMock

from app.models.dlp import DLPRuleType
from app.services.dlp_service import DLPService


def _make_rule(rule_type: DLPRuleType, pattern: str) -> MagicMock:
    rule = MagicMock()
    rule.rule_type = rule_type
    rule.pattern = pattern
    return rule


# ---------------------------------------------------------------------------
# file_extension rules
# ---------------------------------------------------------------------------


class TestMatchesFileExtension:
    def test_matching_exe(self) -> None:
        rule = _make_rule(DLPRuleType.file_extension, ".exe,.msi")
        assert DLPService._matches(rule, "/tmp/malware.exe", "malware.exe", None) is True

    def test_matching_msi(self) -> None:
        rule = _make_rule(DLPRuleType.file_extension, ".exe,.msi")
        assert DLPService._matches(rule, "/tmp/install.msi", "install.msi", None) is True

    def test_non_matching_extension(self) -> None:
        rule = _make_rule(DLPRuleType.file_extension, ".exe,.msi")
        assert DLPService._matches(rule, "/tmp/doc.pdf", "doc.pdf", None) is False

    def test_case_insensitive_extension(self) -> None:
        rule = _make_rule(DLPRuleType.file_extension, ".exe")
        assert DLPService._matches(rule, "/tmp/VIRUS.EXE", "VIRUS.EXE", None) is True

    def test_single_extension_pattern(self) -> None:
        rule = _make_rule(DLPRuleType.file_extension, ".bat")
        assert DLPService._matches(rule, "/tmp/run.bat", "run.bat", None) is True

    def test_no_extension_file_no_match(self) -> None:
        rule = _make_rule(DLPRuleType.file_extension, ".exe")
        assert DLPService._matches(rule, "/tmp/Makefile", "Makefile", None) is False

    def test_pattern_with_spaces(self) -> None:
        rule = _make_rule(DLPRuleType.file_extension, ".exe, .msi, .bat")
        assert DLPService._matches(rule, "/tmp/x.bat", "x.bat", None) is True


# ---------------------------------------------------------------------------
# path_pattern rules (glob / regex)
# ---------------------------------------------------------------------------


class TestMatchesPathPattern:
    def test_glob_wildcard_match(self) -> None:
        rule = _make_rule(DLPRuleType.path_pattern, "*/secret/*")
        assert DLPService._matches(rule, "/data/secret/file.txt", "file.txt", None) is True

    def test_glob_no_match(self) -> None:
        rule = _make_rule(DLPRuleType.path_pattern, "*/secret/*")
        assert DLPService._matches(rule, "/data/public/file.txt", "file.txt", None) is False

    def test_regex_match(self) -> None:
        rule = _make_rule(DLPRuleType.path_pattern, r".*password.*")
        assert DLPService._matches(rule, "/home/user/passwords.txt", "passwords.txt", None) is True

    def test_invalid_regex_falls_back_to_glob(self) -> None:
        rule = _make_rule(DLPRuleType.path_pattern, "*/tmp/*")
        assert DLPService._matches(rule, "/home/user/tmp/file", "file", None) is True

    def test_case_insensitive_path(self) -> None:
        rule = _make_rule(DLPRuleType.path_pattern, "*/SECRET/*")
        assert DLPService._matches(rule, "/data/secret/file.txt", "file.txt", None) is True


# ---------------------------------------------------------------------------
# content_keyword rules
# ---------------------------------------------------------------------------


class TestMatchesContentKeyword:
    def test_keyword_in_file_name(self) -> None:
        rule = _make_rule(DLPRuleType.content_keyword, "password,secret")
        assert DLPService._matches(rule, "/home/user/doc.txt", "password_list.txt", None) is True

    def test_keyword_in_file_path(self) -> None:
        rule = _make_rule(DLPRuleType.content_keyword, "confidential")
        assert DLPService._matches(rule, "/corp/confidential/report.pdf", "report.pdf", None) is True

    def test_no_keyword_match(self) -> None:
        rule = _make_rule(DLPRuleType.content_keyword, "password,secret")
        assert DLPService._matches(rule, "/home/user/doc.txt", "report.pdf", None) is False

    def test_case_insensitive_keyword(self) -> None:
        rule = _make_rule(DLPRuleType.content_keyword, "PASSWORD")
        assert DLPService._matches(rule, "/tmp/password_file", "password_file", None) is True

    def test_multiple_keywords_first_matches(self) -> None:
        rule = _make_rule(DLPRuleType.content_keyword, "alpha,beta,gamma")
        assert DLPService._matches(rule, "/tmp/beta_file.txt", "beta_file.txt", None) is True

    def test_empty_keyword_skipped(self) -> None:
        rule = _make_rule(DLPRuleType.content_keyword, ",password,")
        assert DLPService._matches(rule, "/tmp/password.txt", "password.txt", None) is True


# ---------------------------------------------------------------------------
# size_limit rules
# ---------------------------------------------------------------------------


class TestMatchesSizeLimit:
    def test_file_exceeds_limit(self) -> None:
        rule = _make_rule(DLPRuleType.size_limit, "1048576")  # 1 MB
        assert DLPService._matches(rule, "/tmp/big.bin", "big.bin", 2097152) is True

    def test_file_within_limit(self) -> None:
        rule = _make_rule(DLPRuleType.size_limit, "1048576")
        assert DLPService._matches(rule, "/tmp/small.txt", "small.txt", 100) is False

    def test_file_size_none_returns_false(self) -> None:
        rule = _make_rule(DLPRuleType.size_limit, "1048576")
        assert DLPService._matches(rule, "/tmp/unknown", "unknown", None) is False

    def test_invalid_pattern_returns_false(self) -> None:
        rule = _make_rule(DLPRuleType.size_limit, "not-a-number")
        assert DLPService._matches(rule, "/tmp/file.txt", "file.txt", 1000) is False

    def test_exact_limit_not_exceeded(self) -> None:
        rule = _make_rule(DLPRuleType.size_limit, "1000")
        assert DLPService._matches(rule, "/tmp/file.txt", "file.txt", 1000) is False

    def test_one_byte_over_limit(self) -> None:
        rule = _make_rule(DLPRuleType.size_limit, "1000")
        assert DLPService._matches(rule, "/tmp/file.txt", "file.txt", 1001) is True


# ---------------------------------------------------------------------------
# unknown rule type
# ---------------------------------------------------------------------------


class TestMatchesUnknownType:
    def test_unknown_rule_type_returns_false(self) -> None:
        rule = _make_rule(MagicMock(), "pattern")
        result = DLPService._matches(rule, "/tmp/file.txt", "file.txt", 100)
        assert result is False
