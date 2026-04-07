"""DLP evaluation service.

Evaluates file operations against enabled DLP rules and records events.
"""

import fnmatch
import os
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dlp import (
    DLPAction,
    DLPActionTaken,
    DLPEvent,
    DLPRule,
    DLPRuleType,
    DLPSeverity,
)

# Map DLPAction -> DLPActionTaken
_ACTION_MAP = {
    DLPAction.alert: DLPActionTaken.alerted,
    DLPAction.block: DLPActionTaken.blocked,
    DLPAction.log: DLPActionTaken.logged,
}


class DLPService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_file_operation(
        self,
        file_path: str,
        file_name: str,
        file_size: int | None,
        user_name: str,
        device_id: str | None,
    ) -> tuple[list[DLPRule], list[DLPEvent]]:
        """Evaluate a file operation against all enabled DLP rules.

        Returns:
            Tuple of (matched_rules, created_events)
        """
        # Fetch all enabled rules
        result = await self.db.execute(
            select(DLPRule).where(DLPRule.is_enabled == True)  # noqa: E712
        )
        rules = result.scalars().all()

        matched_rules: list[DLPRule] = []
        created_events: list[DLPEvent] = []

        for rule in rules:
            if self._matches(rule, file_path, file_name, file_size):
                matched_rules.append(rule)

                event = DLPEvent(
                    rule_id=rule.id,
                    device_id=device_id,
                    user_name=user_name,
                    file_path=file_path,
                    file_name=file_name,
                    file_size=file_size,
                    action_taken=_ACTION_MAP[rule.action],
                    matched_pattern=rule.pattern,
                )
                self.db.add(event)
                created_events.append(event)

        if created_events:
            await self.db.flush()

        return matched_rules, created_events

    @staticmethod
    def _matches(
        rule: DLPRule,
        file_path: str,
        file_name: str,
        file_size: int | None,
    ) -> bool:
        """Check if a single rule matches the file operation."""
        if rule.rule_type == DLPRuleType.file_extension:
            # pattern is comma-separated extensions like ".exe,.msi"
            extensions = [ext.strip().lower() for ext in rule.pattern.split(",")]
            _, ext = os.path.splitext(file_name)
            return ext.lower() in extensions

        if rule.rule_type == DLPRuleType.path_pattern:
            # pattern is a glob or regex for the file path
            try:
                if fnmatch.fnmatch(file_path.lower(), rule.pattern.lower()):
                    return True
                return bool(re.search(rule.pattern, file_path, re.IGNORECASE))
            except re.error:
                return fnmatch.fnmatch(file_path.lower(), rule.pattern.lower())

        if rule.rule_type == DLPRuleType.content_keyword:
            # pattern is comma-separated keywords to match in file_name or file_path
            keywords = [kw.strip().lower() for kw in rule.pattern.split(",")]
            searchable = f"{file_path} {file_name}".lower()
            return any(kw in searchable for kw in keywords if kw)

        if rule.rule_type == DLPRuleType.size_limit:
            # pattern is max size in bytes (e.g. "104857600" for 100MB)
            if file_size is None:
                return False
            try:
                max_size = int(rule.pattern)
                return file_size > max_size
            except ValueError:
                return False

        return False

    @classmethod
    async def seed_default_rules(cls, db: AsyncSession) -> list[DLPRule]:
        """Create default DLP rules if none exist."""
        result = await db.execute(select(DLPRule))
        existing = result.scalars().all()
        if existing:
            return list(existing)

        defaults = [
            DLPRule(
                name="実行ファイル検出",
                description="USBや外部メディアへの実行ファイル(.exe/.msi)コピーを検出",
                rule_type=DLPRuleType.file_extension,
                pattern=".exe,.msi,.bat,.cmd,.ps1",
                action=DLPAction.alert,
                severity=DLPSeverity.high,
                is_enabled=True,
            ),
            DLPRule(
                name="個人情報キーワード検出",
                description="ファイル名やパスに個人情報関連キーワードが含まれる場合に警告",
                rule_type=DLPRuleType.content_keyword,
                pattern="マイナンバー,個人情報,住所録,給与明細,password,credential,secret",
                action=DLPAction.block,
                severity=DLPSeverity.critical,
                is_enabled=True,
            ),
            DLPRule(
                name="大容量ファイル転送検出",
                description="100MBを超えるファイルの転送を検出",
                rule_type=DLPRuleType.size_limit,
                pattern="104857600",
                action=DLPAction.alert,
                severity=DLPSeverity.medium,
                is_enabled=True,
            ),
            DLPRule(
                name="USB パス検出",
                description="USBドライブパスへのファイル操作を検出",
                rule_type=DLPRuleType.path_pattern,
                pattern="*:/usb/*,*/media/usb*,*/mnt/usb*,E:\\*,F:\\*,G:\\*",
                action=DLPAction.alert,
                severity=DLPSeverity.high,
                is_enabled=True,
            ),
        ]

        for rule in defaults:
            db.add(rule)
        await db.flush()

        return defaults
