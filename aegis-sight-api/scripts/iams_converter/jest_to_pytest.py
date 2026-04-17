"""Jest テストファイルを pytest フォーマットに変換するコンバーター.

変換ルール:
- describe/it -> class/def test_ マッピング
- expect() -> assert マッピング
- beforeEach/afterEach -> setup_method/teardown_method
- jest.fn() -> unittest.mock.MagicMock
"""

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class ConversionResult:
    """変換結果を保持するデータクラス."""

    source_path: str
    output_path: str
    success: bool = False
    lines_converted: int = 0
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class JestToPytestConverter:
    """Jest テストを pytest に変換するコンバーター."""

    # expect().toBe(x) -> assert ... == x
    EXPECT_MATCHERS: dict[str, str] = {
        "toBe": "==",
        "toEqual": "==",
        "toStrictEqual": "==",
        "toBeTruthy": "",
        "toBeFalsy": "",
        "toBeNull": "is None",
        "toBeUndefined": "is None",
        "toBeDefined": "is not None",
        "toBeGreaterThan": ">",
        "toBeGreaterThanOrEqual": ">=",
        "toBeLessThan": "<",
        "toBeLessThanOrEqual": "<=",
        "toContain": "in",
        "toHaveLength": "",
        "toThrow": "",
        "toBeInstanceOf": "",
    }

    def __init__(self) -> None:
        self._indent_level = 0
        self._imports_needed: set[str] = set()

    def convert_file(self, source_path: str, output_path: str | None = None) -> ConversionResult:
        """ファイル単位で変換を実行する.

        Args:
            source_path: 変換元の Jest テストファイルパス
            output_path: 出力先パス（None の場合は自動生成）

        Returns:
            ConversionResult: 変換結果
        """
        src = Path(source_path)
        if output_path is None:
            stem = src.stem.replace(".test", "_test").replace(".spec", "_test")
            output_path = str(src.parent / f"{stem}.py")

        result = ConversionResult(source_path=source_path, output_path=output_path)

        try:
            content = src.read_text(encoding="utf-8")
            converted = self.convert(content)
            Path(output_path).write_text(converted, encoding="utf-8")
            result.success = True
            result.lines_converted = converted.count("\n") + 1
            logger.info("変換完了: %s -> %s (%d行)", source_path, output_path, result.lines_converted)
        except FileNotFoundError:
            result.errors.append(f"ファイルが見つかりません: {source_path}")
            logger.error("ファイルが見つかりません: %s", source_path)
        except Exception as e:
            result.errors.append(str(e))
            logger.error("変換エラー: %s - %s", source_path, e)

        return result

    def convert(self, source: str) -> str:
        """Jest テストコードを pytest コードに変換する.

        Args:
            source: Jest テストのソースコード

        Returns:
            str: pytest フォーマットに変換されたコード
        """
        self._imports_needed = set()
        self._indent_level = 0
        lines = source.splitlines()
        output_lines: list[str] = []

        for line in lines:
            converted = self._convert_line(line)
            if converted is not None:
                output_lines.append(converted)

        # ヘッダー生成
        header = self._generate_header()
        return header + "\n".join(output_lines) + "\n"

    def _generate_header(self) -> str:
        """インポート文を含むヘッダーを生成する."""
        lines = ['"""Auto-converted from Jest to pytest by IAMS Converter."""', ""]

        if "MagicMock" in self._imports_needed or "patch" in self._imports_needed:
            mock_imports = sorted(self._imports_needed & {"MagicMock", "patch", "call"})
            if mock_imports:
                lines.append(f"from unittest.mock import {', '.join(mock_imports)}")

        lines.append("import pytest")
        lines.append("")
        lines.append("")
        return "\n".join(lines)

    def _convert_line(self, line: str) -> str | None:
        """1行を変換する."""
        stripped = line.strip()

        # import文をスキップ
        if stripped.startswith("import ") or stripped.startswith("const "):
            if "require(" in stripped or "from " in stripped:
                return f"# {stripped}"
            return None

        # describe -> class
        describe_match = re.match(r"(\s*)describe\(['\"](.+?)['\"],\s*(?:\(\)\s*=>|function\s*\(\))\s*\{?", line)
        if describe_match:
            indent = describe_match.group(1)
            name = self._to_class_name(describe_match.group(2))
            self._indent_level += 1
            return f"{indent}class Test{name}:"

        # it/test -> def test_
        it_match = re.match(
            r"(\s*)(?:it|test)\(['\"](.+?)['\"],\s*(?:async\s+)?(?:\(\)\s*=>|function\s*\(\))\s*\{?", line
        )
        if it_match:
            indent = it_match.group(1)
            name = self._to_test_name(it_match.group(2))
            return f"{indent}def test_{name}(self):"

        # beforeEach -> setup_method
        if re.match(r"\s*beforeEach\(", stripped):
            return line.replace("beforeEach(", "def setup_method(self").rstrip(" {") + ":"

        # afterEach -> teardown_method
        if re.match(r"\s*afterEach\(", stripped):
            return line.replace("afterEach(", "def teardown_method(self").rstrip(" {") + ":"

        # beforeAll -> setup_class
        if re.match(r"\s*beforeAll\(", stripped):
            return line.replace("beforeAll(", "@classmethod\n    def setup_class(cls").rstrip(" {") + ":"

        # afterAll -> teardown_class
        if re.match(r"\s*afterAll\(", stripped):
            return line.replace("afterAll(", "@classmethod\n    def teardown_class(cls").rstrip(" {") + ":"

        # jest.fn() -> MagicMock()
        if "jest.fn()" in line:
            self._imports_needed.add("MagicMock")
            line = line.replace("jest.fn()", "MagicMock()")

        # jest.spyOn -> patch
        if "jest.spyOn" in line:
            self._imports_needed.add("patch")

        # expect() 変換
        line = self._convert_expect(line)

        # 閉じ括弧/ブレースの除去
        if stripped in ("});", "});", "}", "});"):
            return ""

        # const/let/var -> 代入
        line = re.sub(r"\b(const|let|var)\s+", "", line)

        # アロー関数の簡易変換
        line = re.sub(r"\(\)\s*=>\s*\{?", "", line)

        # セミコロン除去
        line = line.rstrip(";")

        return line

    def _convert_expect(self, line: str) -> str:
        """expect() アサーションを assert 文に変換する."""
        # expect(x).toBe(y)
        match = re.search(r"expect\((.+?)\)\.(\w+)\(([^)]*)\)", line)
        if match:
            actual = match.group(1)
            matcher = match.group(2)
            expected = match.group(3)
            indent = re.match(r"(\s*)", line).group(1)

            # .not. 対応
            is_negated = ".not." in line
            if is_negated:
                line.replace(".not.", ".")

            if matcher == "toBe" or matcher == "toEqual" or matcher == "toStrictEqual":
                op = "!=" if is_negated else "=="
                return f"{indent}assert {actual} {op} {expected}"
            elif matcher == "toBeTruthy":
                return f"{indent}assert {'not ' if is_negated else ''}{actual}"
            elif matcher == "toBeFalsy":
                return f"{indent}assert {'' if is_negated else 'not '}{actual}"
            elif matcher == "toBeNull" or matcher == "toBeUndefined":
                op = "is not None" if is_negated else "is None"
                return f"{indent}assert {actual} {op}"
            elif matcher == "toBeDefined":
                op = "is None" if is_negated else "is not None"
                return f"{indent}assert {actual} {op}"
            elif matcher == "toContain":
                op = "not in" if is_negated else "in"
                return f"{indent}assert {expected} {op} {actual}"
            elif matcher == "toHaveLength":
                op = "!=" if is_negated else "=="
                return f"{indent}assert len({actual}) {op} {expected}"
            elif matcher == "toBeGreaterThan":
                return f"{indent}assert {actual} > {expected}"
            elif matcher == "toBeGreaterThanOrEqual":
                return f"{indent}assert {actual} >= {expected}"
            elif matcher == "toBeLessThan":
                return f"{indent}assert {actual} < {expected}"
            elif matcher == "toBeLessThanOrEqual":
                return f"{indent}assert {actual} <= {expected}"
            elif matcher == "toBeInstanceOf":
                return f"{indent}assert isinstance({actual}, {expected})"
            elif matcher == "toHaveBeenCalledWith":
                self._imports_needed.add("call")
                return f"{indent}{actual}.assert_called_with({expected})"
            elif matcher == "toHaveBeenCalled":
                return f"{indent}{actual}.assert_called()"
            elif matcher == "toHaveBeenCalledTimes":
                return f"{indent}assert {actual}.call_count == {expected}"

        # expect(() => ...).toThrow()
        throw_match = re.search(r"expect\(\(\)\s*=>\s*(.+?)\)\.toThrow\(([^)]*)\)", line)
        if throw_match:
            expr = throw_match.group(1)
            error_type = throw_match.group(2) or "Exception"
            indent = re.match(r"(\s*)", line).group(1)
            return f"{indent}with pytest.raises({error_type}):\n{indent}    {expr}"

        return line

    @staticmethod
    def _to_class_name(desc: str) -> str:
        """describe 文字列をクラス名に変換する."""
        # 特殊文字除去、キャメルケース化
        words = re.split(r"[\s\-_/]+", desc)
        return "".join(w.capitalize() for w in words if w)

    @staticmethod
    def _to_test_name(desc: str) -> str:
        """it/test 文字列をテスト関数名に変換する."""
        # スネークケース化
        name = re.sub(r"[^\w\s]", "", desc)
        name = re.sub(r"\s+", "_", name).lower()
        return name


def main() -> None:
    """CLI エントリポイント."""
    import sys

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python jest_to_pytest.py <source_file> [output_file]")
        sys.exit(1)

    source = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) > 2 else None

    converter = JestToPytestConverter()
    result = converter.convert_file(source, output)

    if result.success:
        print(f"変換成功: {result.output_path} ({result.lines_converted}行)")
    else:
        print(f"変換失敗: {', '.join(result.errors)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
