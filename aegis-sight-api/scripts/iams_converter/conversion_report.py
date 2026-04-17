"""変換結果レポート生成モジュール.

変換成功/失敗/スキップ件数、カバレッジ予測を含むレポートを生成する。
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class FileConversionEntry:
    """個別ファイルの変換結果."""

    source_path: str
    output_path: str
    status: str  # "success" | "failed" | "skipped"
    lines_converted: int = 0
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    conversion_type: str = ""  # "jest_to_pytest" | "jest_to_vitest"


@dataclass
class CoverageEstimate:
    """カバレッジ予測."""

    total_assertions: int = 0
    converted_assertions: int = 0
    unconverted_patterns: list[str] = field(default_factory=list)

    @property
    def coverage_ratio(self) -> float:
        """変換カバレッジ率を返す."""
        if self.total_assertions == 0:
            return 0.0
        return self.converted_assertions / self.total_assertions


class ConversionReport:
    """変換結果レポートを生成・管理するクラス."""

    def __init__(self) -> None:
        self.entries: list[FileConversionEntry] = []
        self.started_at: datetime = datetime.now(UTC)
        self.finished_at: datetime | None = None
        self.coverage: CoverageEstimate = CoverageEstimate()

    def add_entry(self, entry: FileConversionEntry) -> None:
        """変換結果エントリを追加する."""
        self.entries.append(entry)
        logger.info(
            "レポートエントリ追加: %s [%s]",
            entry.source_path,
            entry.status,
        )

    def finalize(self) -> None:
        """レポートを確定する."""
        self.finished_at = datetime.now(UTC)

    @property
    def success_count(self) -> int:
        """成功件数."""
        return sum(1 for e in self.entries if e.status == "success")

    @property
    def failed_count(self) -> int:
        """失敗件数."""
        return sum(1 for e in self.entries if e.status == "failed")

    @property
    def skipped_count(self) -> int:
        """スキップ件数."""
        return sum(1 for e in self.entries if e.status == "skipped")

    @property
    def total_count(self) -> int:
        """合計件数."""
        return len(self.entries)

    @property
    def total_lines_converted(self) -> int:
        """変換行数合計."""
        return sum(e.lines_converted for e in self.entries)

    def generate_summary(self) -> str:
        """テキスト形式のサマリーを生成する.

        Returns:
            str: サマリーテキスト
        """
        duration = ""
        if self.finished_at:
            elapsed = (self.finished_at - self.started_at).total_seconds()
            duration = f" ({elapsed:.1f}秒)"

        lines = [
            "=" * 60,
            "IAMS テスト変換レポート",
            "=" * 60,
            f"実行日時: {self.started_at.strftime('%Y-%m-%d %H:%M:%S UTC')}{duration}",
            "",
            "--- 変換結果サマリー ---",
            f"  合計:     {self.total_count} ファイル",
            f"  成功:     {self.success_count} ファイル",
            f"  失敗:     {self.failed_count} ファイル",
            f"  スキップ: {self.skipped_count} ファイル",
            f"  変換行数: {self.total_lines_converted} 行",
            "",
        ]

        # カバレッジ予測
        if self.coverage.total_assertions > 0:
            lines.extend([
                "--- カバレッジ予測 ---",
                f"  アサーション総数:     {self.coverage.total_assertions}",
                f"  変換済みアサーション: {self.coverage.converted_assertions}",
                f"  カバレッジ率:         {self.coverage.coverage_ratio:.1%}",
            ])
            if self.coverage.unconverted_patterns:
                lines.append("  未変換パターン:")
                for pattern in self.coverage.unconverted_patterns:
                    lines.append(f"    - {pattern}")
            lines.append("")

        # 失敗詳細
        failed = [e for e in self.entries if e.status == "failed"]
        if failed:
            lines.append("--- 失敗詳細 ---")
            for entry in failed:
                lines.append(f"  {entry.source_path}:")
                for err in entry.errors:
                    lines.append(f"    エラー: {err}")
            lines.append("")

        # 警告詳細
        warned = [e for e in self.entries if e.warnings]
        if warned:
            lines.append("--- 警告 ---")
            for entry in warned:
                lines.append(f"  {entry.source_path}:")
                for warn in entry.warnings:
                    lines.append(f"    警告: {warn}")
            lines.append("")

        lines.append("=" * 60)
        return "\n".join(lines)

    def to_dict(self) -> dict:
        """辞書形式でレポートを返す."""
        return {
            "started_at": self.started_at.isoformat(),
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "summary": {
                "total": self.total_count,
                "success": self.success_count,
                "failed": self.failed_count,
                "skipped": self.skipped_count,
                "lines_converted": self.total_lines_converted,
            },
            "coverage": {
                "total_assertions": self.coverage.total_assertions,
                "converted_assertions": self.coverage.converted_assertions,
                "coverage_ratio": round(self.coverage.coverage_ratio, 4),
                "unconverted_patterns": self.coverage.unconverted_patterns,
            },
            "entries": [
                {
                    "source_path": e.source_path,
                    "output_path": e.output_path,
                    "status": e.status,
                    "lines_converted": e.lines_converted,
                    "conversion_type": e.conversion_type,
                    "warnings": e.warnings,
                    "errors": e.errors,
                }
                for e in self.entries
            ],
        }

    def save_json(self, path: str) -> None:
        """JSON ファイルとしてレポートを保存する.

        Args:
            path: 出力先パス
        """
        Path(path).write_text(
            json.dumps(self.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info("レポートを保存しました: %s", path)

    def save_text(self, path: str) -> None:
        """テキストファイルとしてレポートを保存する.

        Args:
            path: 出力先パス
        """
        Path(path).write_text(self.generate_summary(), encoding="utf-8")
        logger.info("レポートを保存しました: %s", path)
