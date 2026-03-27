"""IAMS Converter テストスイート."""

import sys
import tempfile
from pathlib import Path

import pytest

# sys.path にプロジェクトルートを追加
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from scripts.iams_converter.jest_to_pytest import JestToPytestConverter
from scripts.iams_converter.jest_to_vitest import JestToVitestConverter
from scripts.iams_converter.conversion_report import (
    ConversionReport,
    CoverageEstimate,
    FileConversionEntry,
)


# ============================================================
# Jest -> Pytest 変換テスト
# ============================================================

class TestJestToPytestConverter:
    """JestToPytestConverter のテスト."""

    def setup_method(self) -> None:
        self.converter = JestToPytestConverter()

    def test_describe_to_class(self) -> None:
        """describe ブロックが class に変換される."""
        source = "describe('UserService', () => {"
        result = self.converter.convert(source)
        assert "class TestUserservice:" in result or "class TestUserService:" in result

    def test_it_to_def(self) -> None:
        """it ブロックが def test_ に変換される."""
        source = "  it('should return user', () => {"
        result = self.converter.convert(source)
        assert "def test_should_return_user" in result

    def test_test_to_def(self) -> None:
        """test ブロックが def test_ に変換される."""
        source = "  test('creates a new item', () => {"
        result = self.converter.convert(source)
        assert "def test_creates_a_new_item" in result

    def test_expect_toBe(self) -> None:
        """expect().toBe() が assert == に変換される."""
        source = "    expect(result).toBe(42);"
        result = self.converter.convert(source)
        assert "assert result == 42" in result

    def test_expect_toEqual(self) -> None:
        """expect().toEqual() が assert == に変換される."""
        source = "    expect(data).toEqual(expected);"
        result = self.converter.convert(source)
        assert "assert data == expected" in result

    def test_expect_toBeTruthy(self) -> None:
        """expect().toBeTruthy() が assert に変換される."""
        source = "    expect(value).toBeTruthy();"
        result = self.converter.convert(source)
        assert "assert value" in result

    def test_expect_toBeFalsy(self) -> None:
        """expect().toBeFalsy() が assert not に変換される."""
        source = "    expect(value).toBeFalsy();"
        result = self.converter.convert(source)
        assert "assert not value" in result

    def test_expect_toBeNull(self) -> None:
        """expect().toBeNull() が assert is None に変換される."""
        source = "    expect(result).toBeNull();"
        result = self.converter.convert(source)
        assert "assert result is None" in result

    def test_expect_toContain(self) -> None:
        """expect().toContain() が assert in に変換される."""
        source = '    expect(list).toContain("item");'
        result = self.converter.convert(source)
        assert "in" in result

    def test_expect_toHaveLength(self) -> None:
        """expect().toHaveLength() が assert len() に変換される."""
        source = "    expect(items).toHaveLength(3);"
        result = self.converter.convert(source)
        assert "assert len(items) == 3" in result

    def test_jest_fn_to_magicmock(self) -> None:
        """jest.fn() が MagicMock() に変換される."""
        source = "    const callback = jest.fn();"
        result = self.converter.convert(source)
        assert "MagicMock()" in result
        assert "from unittest.mock import MagicMock" in result

    def test_beforeEach_to_setup_method(self) -> None:
        """beforeEach が setup_method に変換される."""
        source = "  beforeEach(() => {"
        result = self.converter.convert(source)
        assert "setup_method" in result

    def test_afterEach_to_teardown_method(self) -> None:
        """afterEach が teardown_method に変換される."""
        source = "  afterEach(() => {"
        result = self.converter.convert(source)
        assert "teardown_method" in result

    def test_import_becomes_comment(self) -> None:
        """import 文がコメントに変換される."""
        source = "import { render } from '@testing-library/react';"
        result = self.converter.convert(source)
        assert "# import" in result or "import pytest" in result

    def test_convert_file(self) -> None:
        """ファイル変換が正常に動作する."""
        source_content = """describe('Calculator', () => {
  it('should add numbers', () => {
    expect(1 + 2).toBe(3);
  });
});"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".test.js", delete=False) as f:
            f.write(source_content)
            source_path = f.name

        output_path = source_path.replace(".test.js", "_test.py")
        try:
            result = self.converter.convert_file(source_path, output_path)
            assert result.success is True
            assert result.lines_converted > 0
            assert Path(output_path).exists()
        finally:
            Path(source_path).unlink(missing_ok=True)
            Path(output_path).unlink(missing_ok=True)

    def test_convert_file_not_found(self) -> None:
        """存在しないファイルの場合はエラーになる."""
        result = self.converter.convert_file("/nonexistent/file.test.js")
        assert result.success is False
        assert len(result.errors) > 0


# ============================================================
# Jest -> Vitest 変換テスト
# ============================================================

class TestJestToVitestConverter:
    """JestToVitestConverter のテスト."""

    def setup_method(self) -> None:
        self.converter = JestToVitestConverter()

    def test_jest_fn_to_vi_fn(self) -> None:
        """jest.fn が vi.fn に変換される."""
        source = "const mock = jest.fn();"
        result = self.converter.convert(source)
        assert "vi.fn()" in result
        assert "jest.fn" not in result

    def test_jest_mock_to_vi_mock(self) -> None:
        """jest.mock が vi.mock に変換される."""
        source = "jest.mock('./module');"
        result = self.converter.convert(source)
        assert "vi.mock(" in result

    def test_jest_spyOn_to_vi_spyOn(self) -> None:
        """jest.spyOn が vi.spyOn に変換される."""
        source = "jest.spyOn(object, 'method');"
        result = self.converter.convert(source)
        assert "vi.spyOn(" in result

    def test_jest_useFakeTimers_to_vi(self) -> None:
        """jest.useFakeTimers が vi.useFakeTimers に変換される."""
        source = "jest.useFakeTimers();"
        result = self.converter.convert(source)
        assert "vi.useFakeTimers()" in result

    def test_jest_clearAllMocks_to_vi(self) -> None:
        """jest.clearAllMocks が vi.clearAllMocks に変換される."""
        source = "jest.clearAllMocks();"
        result = self.converter.convert(source)
        assert "vi.clearAllMocks()" in result

    def test_testing_library_preserved(self) -> None:
        """@testing-library import はそのまま維持される."""
        source = "import { render, screen } from '@testing-library/react';"
        result = self.converter.convert(source)
        assert "@testing-library/react" in result

    def test_vitest_import_added(self) -> None:
        """vitest import が追加される."""
        source = """describe('Test', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});"""
        result = self.converter.convert(source)
        assert "from 'vitest'" in result

    def test_vi_import_added_when_jest_api_used(self) -> None:
        """jest API 使用時に vi import が追加される."""
        source = "const fn = jest.fn();"
        result = self.converter.convert(source)
        assert "vi" in result
        assert "from 'vitest'" in result

    def test_convert_file(self) -> None:
        """ファイル変換が正常に動作する."""
        source_content = """import { render } from '@testing-library/react';

describe('Component', () => {
  const mockFn = jest.fn();

  it('renders', () => {
    expect(true).toBe(true);
  });
});"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".test.tsx", delete=False) as f:
            f.write(source_content)
            source_path = f.name

        output_path = source_path.replace(".test.tsx", ".vitest.tsx")
        try:
            result = self.converter.convert_file(source_path, output_path)
            assert result.success is True
            assert result.lines_converted > 0
        finally:
            Path(source_path).unlink(missing_ok=True)
            Path(output_path).unlink(missing_ok=True)


# ============================================================
# 変換レポートテスト
# ============================================================

class TestConversionReport:
    """ConversionReport のテスト."""

    def setup_method(self) -> None:
        self.report = ConversionReport()

    def test_add_entry(self) -> None:
        """エントリを追加できる."""
        entry = FileConversionEntry(
            source_path="test.js",
            output_path="test_test.py",
            status="success",
            lines_converted=50,
        )
        self.report.add_entry(entry)
        assert self.report.total_count == 1

    def test_success_count(self) -> None:
        """成功件数が正しくカウントされる."""
        self.report.add_entry(FileConversionEntry("a.js", "a.py", status="success"))
        self.report.add_entry(FileConversionEntry("b.js", "b.py", status="failed"))
        self.report.add_entry(FileConversionEntry("c.js", "c.py", status="success"))
        assert self.report.success_count == 2
        assert self.report.failed_count == 1

    def test_skipped_count(self) -> None:
        """スキップ件数が正しくカウントされる."""
        self.report.add_entry(FileConversionEntry("a.js", "a.py", status="skipped"))
        assert self.report.skipped_count == 1

    def test_total_lines_converted(self) -> None:
        """変換行数合計が正しい."""
        self.report.add_entry(FileConversionEntry("a.js", "a.py", status="success", lines_converted=100))
        self.report.add_entry(FileConversionEntry("b.js", "b.py", status="success", lines_converted=50))
        assert self.report.total_lines_converted == 150

    def test_generate_summary(self) -> None:
        """サマリーが生成される."""
        self.report.add_entry(FileConversionEntry("a.js", "a.py", status="success", lines_converted=100))
        self.report.finalize()
        summary = self.report.generate_summary()
        assert "IAMS テスト変換レポート" in summary
        assert "成功" in summary
        assert "1 ファイル" in summary

    def test_coverage_estimate(self) -> None:
        """カバレッジ予測が正しく計算される."""
        self.report.coverage = CoverageEstimate(
            total_assertions=100,
            converted_assertions=85,
            unconverted_patterns=["custom matcher"],
        )
        assert self.report.coverage.coverage_ratio == 0.85

    def test_coverage_zero_division(self) -> None:
        """アサーション0件の場合、カバレッジ率は0."""
        assert self.report.coverage.coverage_ratio == 0.0

    def test_to_dict(self) -> None:
        """辞書変換が正しく動作する."""
        self.report.add_entry(FileConversionEntry("a.js", "a.py", status="success"))
        self.report.finalize()
        d = self.report.to_dict()
        assert d["summary"]["total"] == 1
        assert d["summary"]["success"] == 1

    def test_save_json(self) -> None:
        """JSON保存が正しく動作する."""
        self.report.add_entry(FileConversionEntry("a.js", "a.py", status="success"))
        self.report.finalize()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            path = f.name

        try:
            self.report.save_json(path)
            assert Path(path).exists()
            import json
            data = json.loads(Path(path).read_text())
            assert data["summary"]["success"] == 1
        finally:
            Path(path).unlink(missing_ok=True)

    def test_save_text(self) -> None:
        """テキスト保存が正しく動作する."""
        self.report.add_entry(FileConversionEntry("a.js", "a.py", status="success"))
        self.report.finalize()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            path = f.name

        try:
            self.report.save_text(path)
            assert Path(path).exists()
            content = Path(path).read_text()
            assert "IAMS" in content
        finally:
            Path(path).unlink(missing_ok=True)

    def test_report_with_errors_and_warnings(self) -> None:
        """エラー・警告を含むレポートが正しく生成される."""
        self.report.add_entry(
            FileConversionEntry(
                "fail.js", "fail.py",
                status="failed",
                errors=["SyntaxError"],
            )
        )
        self.report.add_entry(
            FileConversionEntry(
                "warn.js", "warn.py",
                status="success",
                warnings=["未対応パターンあり"],
                lines_converted=30,
            )
        )
        self.report.finalize()
        summary = self.report.generate_summary()
        assert "失敗詳細" in summary
        assert "SyntaxError" in summary
        assert "警告" in summary
