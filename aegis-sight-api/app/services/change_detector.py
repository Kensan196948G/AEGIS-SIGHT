"""
Change detection service.

Compares new device configuration data against the most recent snapshot
and creates ConfigChange records for every detected difference.
"""

import hashlib
import json
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.change_tracking import (
    ChangeType,
    ConfigChange,
    ConfigSnapshot,
    SnapshotType,
)

logger = logging.getLogger(__name__)


class ChangeDetector:
    """Detects configuration changes between snapshots."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def detect_changes(
        self,
        device_id: str,
        new_data: dict[str, Any],
        snapshot_type: SnapshotType,
    ) -> tuple[ConfigSnapshot, list[ConfigChange]]:
        """Compare *new_data* against the latest snapshot for the device.

        Returns the newly created snapshot and all detected changes.
        """
        checksum = self._compute_checksum(new_data)

        # Fetch the most recent snapshot of the same type for this device
        previous = await self._get_latest_snapshot(device_id, snapshot_type)

        # Create the new snapshot
        new_snapshot = ConfigSnapshot(
            device_id=device_id,
            snapshot_type=snapshot_type,
            data=new_data,
            checksum=checksum,
            captured_at=datetime.now(UTC),
        )
        self.db.add(new_snapshot)
        await self.db.flush()

        # Short-circuit if the checksum is identical
        if previous is not None and previous.checksum == checksum:
            logger.debug(
                "No changes detected for device %s (%s)", device_id, snapshot_type.value
            )
            return new_snapshot, []

        # Compute recursive diff
        old_data = previous.data if previous is not None else {}
        diffs = self._recursive_diff(old_data, new_data, prefix="")

        changes: list[ConfigChange] = []
        now = datetime.now(UTC)

        for field_path, change_type, old_val, new_val in diffs:
            change = ConfigChange(
                device_id=device_id,
                snapshot_before_id=previous.id if previous else None,
                snapshot_after_id=new_snapshot.id,
                change_type=change_type,
                field_path=field_path,
                old_value=self._wrap_value(old_val),
                new_value=self._wrap_value(new_val),
                detected_at=now,
            )
            self.db.add(change)
            changes.append(change)

        await self.db.flush()

        if changes:
            logger.info(
                "Detected %d change(s) for device %s (%s)",
                len(changes),
                device_id,
                snapshot_type.value,
            )
            # Trigger notification for critical changes
            self._notify_if_critical(device_id, changes)

        return new_snapshot, changes

    # ------------------------------------------------------------------
    # Diff logic
    # ------------------------------------------------------------------

    @staticmethod
    def _recursive_diff(
        old: dict, new: dict, prefix: str
    ) -> list[tuple[str, ChangeType, Any, Any]]:
        """Recursively compare two dicts and return a list of differences.

        Each entry is (field_path, change_type, old_value, new_value).
        """
        diffs: list[tuple[str, ChangeType, Any, Any]] = []
        all_keys = set(old.keys()) | set(new.keys())

        for key in sorted(all_keys):
            path = f"{prefix}.{key}" if prefix else key
            in_old = key in old
            in_new = key in new

            if in_old and not in_new:
                diffs.append((path, ChangeType.removed, old[key], None))
            elif not in_old and in_new:
                diffs.append((path, ChangeType.added, None, new[key]))
            else:
                old_val = old[key]
                new_val = new[key]
                if isinstance(old_val, dict) and isinstance(new_val, dict):
                    diffs.extend(
                        ChangeDetector._recursive_diff(old_val, new_val, prefix=path)
                    )
                elif old_val != new_val:
                    diffs.append((path, ChangeType.modified, old_val, new_val))

        return diffs

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_latest_snapshot(
        self, device_id: str, snapshot_type: SnapshotType
    ) -> ConfigSnapshot | None:
        result = await self.db.execute(
            select(ConfigSnapshot)
            .where(
                ConfigSnapshot.device_id == device_id,
                ConfigSnapshot.snapshot_type == snapshot_type,
            )
            .order_by(ConfigSnapshot.captured_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _compute_checksum(data: dict) -> str:
        """SHA-256 checksum of JSON-serialised data (sorted keys)."""
        raw = json.dumps(data, sort_keys=True, default=str).encode()
        return hashlib.sha256(raw).hexdigest()

    @staticmethod
    def _wrap_value(val: Any) -> dict | None:
        """Wrap a scalar value in a JSONB-friendly dict, or return None."""
        if val is None:
            return None
        if isinstance(val, dict):
            return val
        return {"value": val}

    @staticmethod
    def _notify_if_critical(device_id: str, changes: list[ConfigChange]) -> None:
        """Log (and in future, dispatch) notifications for important changes.

        Critical fields: security-related removals or modifications.
        """
        critical_prefixes = ("security", "defender", "bitlocker", "firewall")
        for change in changes:
            if any(change.field_path.lower().startswith(p) for p in critical_prefixes):
                logger.warning(
                    "CRITICAL change detected on device %s: %s %s at '%s'",
                    device_id,
                    change.change_type.value,
                    change.field_path,
                    change.detected_at,
                )
