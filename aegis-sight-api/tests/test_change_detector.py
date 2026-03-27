"""Tests for the ChangeDetector service (diff logic)."""

import pytest

from app.models.change_tracking import ChangeType
from app.services.change_detector import ChangeDetector


# ---------------------------------------------------------------------------
# Unit tests for _recursive_diff (no DB needed)
# ---------------------------------------------------------------------------

class TestRecursiveDiff:
    """Tests for ChangeDetector._recursive_diff."""

    def test_empty_dicts(self):
        diffs = ChangeDetector._recursive_diff({}, {}, "")
        assert diffs == []

    def test_identical_dicts(self):
        data = {"a": 1, "b": "hello", "c": True}
        diffs = ChangeDetector._recursive_diff(data, data, "")
        assert diffs == []

    def test_added_field(self):
        old = {"a": 1}
        new = {"a": 1, "b": 2}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        path, ct, old_val, new_val = diffs[0]
        assert path == "b"
        assert ct == ChangeType.added
        assert old_val is None
        assert new_val == 2

    def test_removed_field(self):
        old = {"a": 1, "b": 2}
        new = {"a": 1}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        path, ct, old_val, new_val = diffs[0]
        assert path == "b"
        assert ct == ChangeType.removed
        assert old_val == 2
        assert new_val is None

    def test_modified_field(self):
        old = {"a": 1}
        new = {"a": 2}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        path, ct, old_val, new_val = diffs[0]
        assert path == "a"
        assert ct == ChangeType.modified
        assert old_val == 1
        assert new_val == 2

    def test_nested_diff(self):
        old = {"level1": {"level2": {"a": 1, "b": 2}}}
        new = {"level1": {"level2": {"a": 1, "b": 3}}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        path, ct, old_val, new_val = diffs[0]
        assert path == "level1.level2.b"
        assert ct == ChangeType.modified
        assert old_val == 2
        assert new_val == 3

    def test_nested_added(self):
        old = {"x": {"y": 1}}
        new = {"x": {"y": 1, "z": 99}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][0] == "x.z"
        assert diffs[0][1] == ChangeType.added

    def test_nested_removed(self):
        old = {"x": {"y": 1, "z": 99}}
        new = {"x": {"y": 1}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][0] == "x.z"
        assert diffs[0][1] == ChangeType.removed

    def test_multiple_changes(self):
        old = {"a": 1, "b": 2, "c": 3}
        new = {"a": 10, "c": 3, "d": 4}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 3
        types = {d[0]: d[1] for d in diffs}
        assert types["a"] == ChangeType.modified
        assert types["b"] == ChangeType.removed
        assert types["d"] == ChangeType.added

    def test_prefix_propagation(self):
        old = {"a": 1}
        new = {"a": 2}
        diffs = ChangeDetector._recursive_diff(old, new, "root.sub")
        assert diffs[0][0] == "root.sub.a"

    def test_type_change_counts_as_modified(self):
        old = {"val": "string"}
        new = {"val": 123}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][1] == ChangeType.modified

    def test_dict_to_scalar_counts_as_modified(self):
        old = {"val": {"nested": 1}}
        new = {"val": "flat"}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][1] == ChangeType.modified

    def test_scalar_to_dict_counts_as_modified(self):
        old = {"val": "flat"}
        new = {"val": {"nested": 1}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][1] == ChangeType.modified

    def test_deeply_nested(self):
        old = {"a": {"b": {"c": {"d": {"e": 1}}}}}
        new = {"a": {"b": {"c": {"d": {"e": 2}}}}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][0] == "a.b.c.d.e"
        assert diffs[0][1] == ChangeType.modified


# ---------------------------------------------------------------------------
# Checksum
# ---------------------------------------------------------------------------

class TestChecksum:
    def test_deterministic(self):
        data = {"b": 2, "a": 1}
        c1 = ChangeDetector._compute_checksum(data)
        c2 = ChangeDetector._compute_checksum(data)
        assert c1 == c2

    def test_different_data_different_checksum(self):
        c1 = ChangeDetector._compute_checksum({"a": 1})
        c2 = ChangeDetector._compute_checksum({"a": 2})
        assert c1 != c2

    def test_sha256_length(self):
        c = ChangeDetector._compute_checksum({"test": True})
        assert len(c) == 64  # SHA-256 hex


# ---------------------------------------------------------------------------
# Wrap value
# ---------------------------------------------------------------------------

class TestWrapValue:
    def test_none(self):
        assert ChangeDetector._wrap_value(None) is None

    def test_dict_passthrough(self):
        d = {"key": "val"}
        assert ChangeDetector._wrap_value(d) is d

    def test_scalar_wrapping(self):
        assert ChangeDetector._wrap_value(42) == {"value": 42}
        assert ChangeDetector._wrap_value("hello") == {"value": "hello"}
        assert ChangeDetector._wrap_value(True) == {"value": True}
