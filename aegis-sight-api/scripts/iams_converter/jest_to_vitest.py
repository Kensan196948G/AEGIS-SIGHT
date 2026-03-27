"""Jest テストファイルを Vitest フォーマットに変換するコンバーター.

変換ルール:
- jest.fn -> vi.fn マッピング
- jest.mock -> vi.mock
- jest.spyOn -> vi.spyOn
- jest.useFakeTimers -> vi.useFakeTimers
- @testing-library -> @testing-library 維持
- import 文の自動変換（vitest からの import 追加）
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


# jest -> vi マッピング
JEST_TO_VI_MAP: dict[str, str] = {
    "jest.fn": "vi.fn",
    "jest.mock": "vi.mock",
    "jest.spyOn": "vi.spyOn",
    "jest.useFakeTimers": "vi.useFakeTimers",
    "jest.useRealTimers": "vi.useRealTimers",
    "jest.advanceTimersByTime": "vi.advanceTimersByTime",
    "jest.runAllTimers": "vi.runAllTimers",
    "jest.clearAllMocks": "vi.clearAllMocks",
    "jest.resetAllMocks": "vi.resetAllMocks",
    "jest.restoreAllMocks": "vi.restoreAllMocks",
    "jest.clearAllTimers": "vi.clearAllTimers",
    "jest.setTimeout": "vi.setConfig",
    "jest.requireActual": "vi.importActual",
}

# vitest で必要な import
VITEST_GLOBALS = {"describe", "it", "test", "expect", "beforeEach", "afterEach", "beforeAll", "afterAll", "vi"}


class JestToVitestConverter:
    """Jest テストを Vitest に変換するコンバーター."""

    def __init__(self) -> None:
        self._vi_imports_needed: set[str] = set()

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
            stem = src.stem.replace(".test", ".test").replace(".spec", ".spec")
            output_path = str(src.parent / f"{stem}{src.suffix}")

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
        """Jest テストコードを Vitest コードに変換する.

        Args:
            source: Jest テストのソースコード

        Returns:
            str: Vitest フォーマットに変換されたコード
        """
        self._vi_imports_needed = set()
        lines = source.splitlines()
        output_lines: list[str] = []
        existing_imports: list[int] = []

        for i, line in enumerate(lines):
            converted = self._convert_line(line)
            output_lines.append(converted)

            # 既存の import 行を追跡
            if line.strip().startswith("import "):
                existing_imports.append(i)

        # vitest import を解決
        self._detect_needed_imports(source)
        vitest_import = self._generate_vitest_import()

        # 既存の @jest/ import を除去し vitest import を挿入
        final_lines: list[str] = []
        vitest_import_added = False

        for i, line in enumerate(output_lines):
            # @jest/ パッケージの import を除去
            if re.match(r"\s*import\s+.*from\s+['\"]@jest/", line):
                continue
            # jest globals import を除去（vitest import で置き換え）
            if re.match(r"\s*import\s+.*from\s+['\"]jest['\"]", line):
                if not vitest_import_added:
                    final_lines.append(vitest_import)
                    vitest_import_added = True
                continue

            final_lines.append(line)

        # vitest import が未追加なら先頭に追加
        if not vitest_import_added and vitest_import:
            final_lines.insert(0, vitest_import)

        return "\n".join(final_lines) + "\n"

    def _convert_line(self, line: str) -> str:
        """1行を変換する."""
        result = line

        # jest.* -> vi.* 置換
        for jest_api, vi_api in JEST_TO_VI_MAP.items():
            if jest_api in result:
                result = result.replace(jest_api, vi_api)
                self._vi_imports_needed.add("vi")

        # jest.requireActual の特殊処理（async 化）
        if "vi.importActual" in result and "await" not in result:
            result = re.sub(
                r"vi\.importActual\(([^)]+)\)",
                r"await vi.importActual(\1)",
                result,
            )

        # @testing-library はそのまま維持（変換不要）

        return result

    def _detect_needed_imports(self, source: str) -> None:
        """ソースから vitest で必要な import を検出する."""
        for global_name in VITEST_GLOBALS:
            # 関数として使用されているか確認
            pattern = rf"\b{global_name}\s*\("
            if re.search(pattern, source):
                self._vi_imports_needed.add(global_name)

        # vi.* が使われている場合
        if re.search(r"\bvi\.", source) or any(
            jest_api in source for jest_api in JEST_TO_VI_MAP
        ):
            self._vi_imports_needed.add("vi")

    def _generate_vitest_import(self) -> str:
        """vitest import 文を生成する."""
        if not self._vi_imports_needed:
            return ""

        imports = sorted(self._vi_imports_needed)
        return f"import {{ {', '.join(imports)} }} from 'vitest';"


def main() -> None:
    """CLI エントリポイント."""
    import sys

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python jest_to_vitest.py <source_file> [output_file]")
        sys.exit(1)

    source = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) > 2 else None

    converter = JestToVitestConverter()
    result = converter.convert_file(source, output)

    if result.success:
        print(f"変換成功: {result.output_path} ({result.lines_converted}行)")
    else:
        print(f"変換失敗: {', '.join(result.errors)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
