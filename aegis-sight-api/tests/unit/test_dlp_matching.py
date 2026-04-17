"""Unit tests for DLPService._matches() — pure logic, no database required."""


from app.models.dlp import DLPAction, DLPRule, DLPRuleType, DLPSeverity
from app.services.dlp_service import DLPService


def _rule(rule_type: DLPRuleType, pattern: str) -> DLPRule:
    return DLPRule(
        name="test",
        rule_type=rule_type,
        pattern=pattern,
        action=DLPAction.alert,
        severity=DLPSeverity.medium,
        is_enabled=True,
    )


# ---------------------------------------------------------------------------
# file_extension
# ---------------------------------------------------------------------------
class TestFileExtension:
    def test_matches_single_extension(self) -> None:
        rule = _rule(DLPRuleType.file_extension, ".exe")
        assert DLPService._matches(rule, "/tmp/malware.exe", "malware.exe", None)

    def test_matches_comma_separated(self) -> None:
        rule = _rule(DLPRuleType.file_extension, ".exe,.msi,.bat")
        assert DLPService._matches(rule, "/tmp/setup.msi", "setup.msi", None)
        assert DLPService._matches(rule, "/tmp/run.bat", "run.bat", None)

    def test_case_insensitive(self) -> None:
        rule = _rule(DLPRuleType.file_extension, ".EXE")
        assert DLPService._matches(rule, "/tmp/VIRUS.exe", "VIRUS.exe", None)

    def test_no_match_different_extension(self) -> None:
        rule = _rule(DLPRuleType.file_extension, ".exe,.msi")
        assert not DLPService._matches(rule, "/tmp/doc.txt", "doc.txt", None)

    def test_no_match_no_extension(self) -> None:
        rule = _rule(DLPRuleType.file_extension, ".exe")
        assert not DLPService._matches(rule, "/tmp/Makefile", "Makefile", None)

    def test_spaces_in_pattern(self) -> None:
        rule = _rule(DLPRuleType.file_extension, " .exe , .msi ")
        assert DLPService._matches(rule, "/tmp/a.exe", "a.exe", None)


# ---------------------------------------------------------------------------
# path_pattern
# ---------------------------------------------------------------------------
class TestPathPattern:
    def test_glob_match(self) -> None:
        rule = _rule(DLPRuleType.path_pattern, "*/usb/*")
        assert DLPService._matches(rule, "/media/usb/secret.txt", "secret.txt", None)

    def test_glob_no_match(self) -> None:
        rule = _rule(DLPRuleType.path_pattern, "*/usb/*")
        assert not DLPService._matches(rule, "/home/user/doc.txt", "doc.txt", None)

    def test_regex_fallback(self) -> None:
        rule = _rule(DLPRuleType.path_pattern, r"^/tmp/.*\.log$")
        assert DLPService._matches(rule, "/tmp/app.log", "app.log", None)

    def test_regex_no_match(self) -> None:
        rule = _rule(DLPRuleType.path_pattern, r"^/tmp/.*\.log$")
        assert not DLPService._matches(rule, "/var/app.log", "app.log", None)

    def test_invalid_regex_falls_back_to_glob(self) -> None:
        rule = _rule(DLPRuleType.path_pattern, "*/usb/*")
        # valid glob even though it looks regex-adjacent
        assert DLPService._matches(rule, "/media/usb/file.txt", "file.txt", None)

    def test_invalid_regex_glob_no_match(self) -> None:
        rule = _rule(DLPRuleType.path_pattern, "[invalid regex")
        # invalid regex falls back to fnmatch which also won't match a normal path
        assert not DLPService._matches(rule, "/home/user/doc.txt", "doc.txt", None)

    def test_case_insensitive_glob(self) -> None:
        rule = _rule(DLPRuleType.path_pattern, "*/USB/*")
        assert DLPService._matches(rule, "/media/usb/file.txt", "file.txt", None)


# ---------------------------------------------------------------------------
# content_keyword
# ---------------------------------------------------------------------------
class TestContentKeyword:
    def test_keyword_in_filename(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, "password")
        assert DLPService._matches(rule, "/tmp/x", "password_list.csv", None)

    def test_keyword_in_path(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, "secret")
        assert DLPService._matches(rule, "/home/user/secret/key.pem", "key.pem", None)

    def test_multiple_keywords_any_match(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, "password,credential,secret")
        assert DLPService._matches(rule, "/tmp/credential_dump.txt", "dump.txt", None)

    def test_case_insensitive(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, "PASSWORD")
        assert DLPService._matches(rule, "/tmp/x", "Password_File.txt", None)

    def test_no_match(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, "password,secret")
        assert not DLPService._matches(rule, "/tmp/report.csv", "report.csv", None)

    def test_empty_keyword_skipped(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, ",,,password,,,")
        assert DLPService._matches(rule, "/tmp/x", "password.txt", None)

    def test_empty_keywords_no_false_match(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, ",,,")
        assert not DLPService._matches(rule, "/tmp/file.txt", "file.txt", None)

    def test_japanese_keyword(self) -> None:
        rule = _rule(DLPRuleType.content_keyword, "個人情報")
        assert DLPService._matches(rule, "/tmp/x", "個人情報一覧.xlsx", None)


# ---------------------------------------------------------------------------
# size_limit
# ---------------------------------------------------------------------------
class TestSizeLimit:
    def test_exceeds_limit(self) -> None:
        rule = _rule(DLPRuleType.size_limit, "104857600")  # 100 MB
        assert DLPService._matches(rule, "/tmp/big.zip", "big.zip", 200_000_000)

    def test_exactly_at_limit_no_match(self) -> None:
        rule = _rule(DLPRuleType.size_limit, "104857600")
        assert not DLPService._matches(rule, "/tmp/exact.zip", "exact.zip", 104_857_600)

    def test_below_limit_no_match(self) -> None:
        rule = _rule(DLPRuleType.size_limit, "104857600")
        assert not DLPService._matches(rule, "/tmp/small.txt", "small.txt", 1024)

    def test_none_file_size_no_match(self) -> None:
        rule = _rule(DLPRuleType.size_limit, "104857600")
        assert not DLPService._matches(rule, "/tmp/file.txt", "file.txt", None)

    def test_invalid_pattern_no_match(self) -> None:
        rule = _rule(DLPRuleType.size_limit, "NOT_A_NUMBER")
        assert not DLPService._matches(rule, "/tmp/file.txt", "file.txt", 999_999)

    def test_zero_limit(self) -> None:
        rule = _rule(DLPRuleType.size_limit, "0")
        assert DLPService._matches(rule, "/tmp/any.txt", "any.txt", 1)


# ---------------------------------------------------------------------------
# unknown rule_type
# ---------------------------------------------------------------------------
class TestUnknownRuleType:
    def test_unknown_type_returns_false(self) -> None:
        rule = _rule(DLPRuleType.file_extension, ".exe")
        rule.rule_type = "nonexistent_type"  # type: ignore[assignment]
        assert not DLPService._matches(rule, "/tmp/x.exe", "x.exe", None)
