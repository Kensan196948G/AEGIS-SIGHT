"""Unit tests for ChangeDetector — pure static methods, no DB required."""

from app.models.change_tracking import ChangeType
from app.services.change_detector import ChangeDetector

# ---------------------------------------------------------------------------
# _recursive_diff
# ---------------------------------------------------------------------------


class TestRecursiveDiffAddedKeys:
    def test_single_added_key(self) -> None:
        diffs = ChangeDetector._recursive_diff({}, {"a": 1}, "")
        assert len(diffs) == 1
        path, ctype, old, new = diffs[0]
        assert path == "a"
        assert ctype == ChangeType.added
        assert old is None
        assert new == 1

    def test_multiple_added_keys(self) -> None:
        diffs = ChangeDetector._recursive_diff({}, {"a": 1, "b": 2}, "")
        assert len(diffs) == 2
        paths = {d[0] for d in diffs}
        assert paths == {"a", "b"}

    def test_added_key_with_prefix(self) -> None:
        diffs = ChangeDetector._recursive_diff({}, {"x": 99}, prefix="top")
        assert diffs[0][0] == "top.x"

    def test_added_nested_dict(self) -> None:
        diffs = ChangeDetector._recursive_diff({}, {"nested": {"k": "v"}}, "")
        assert len(diffs) == 1
        assert diffs[0][1] == ChangeType.added
        assert diffs[0][0] == "nested"


class TestRecursiveDiffRemovedKeys:
    def test_single_removed_key(self) -> None:
        diffs = ChangeDetector._recursive_diff({"a": 1}, {}, "")
        assert len(diffs) == 1
        path, ctype, old, new = diffs[0]
        assert path == "a"
        assert ctype == ChangeType.removed
        assert old == 1
        assert new is None

    def test_removed_key_preserves_old_value(self) -> None:
        diffs = ChangeDetector._recursive_diff({"key": [1, 2, 3]}, {}, "")
        assert diffs[0][2] == [1, 2, 3]

    def test_removed_key_with_prefix(self) -> None:
        diffs = ChangeDetector._recursive_diff({"x": 0}, {}, prefix="root")
        assert diffs[0][0] == "root.x"


class TestRecursiveDiffModifiedKeys:
    def test_scalar_value_changed(self) -> None:
        diffs = ChangeDetector._recursive_diff({"a": 1}, {"a": 2}, "")
        assert len(diffs) == 1
        path, ctype, old, new = diffs[0]
        assert path == "a"
        assert ctype == ChangeType.modified
        assert old == 1
        assert new == 2

    def test_type_change_is_modified(self) -> None:
        diffs = ChangeDetector._recursive_diff({"a": 1}, {"a": "one"}, "")
        assert diffs[0][1] == ChangeType.modified

    def test_bool_value_change(self) -> None:
        diffs = ChangeDetector._recursive_diff({"enabled": True}, {"enabled": False}, "")
        assert diffs[0][1] == ChangeType.modified

    def test_none_to_value(self) -> None:
        diffs = ChangeDetector._recursive_diff({"v": None}, {"v": 42}, "")
        assert diffs[0][1] == ChangeType.modified


class TestRecursiveDiffNested:
    def test_nested_dict_recurses(self) -> None:
        old = {"outer": {"inner": 1}}
        new = {"outer": {"inner": 2}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][0] == "outer.inner"
        assert diffs[0][1] == ChangeType.modified

    def test_deeply_nested_path(self) -> None:
        old = {"a": {"b": {"c": "old"}}}
        new = {"a": {"b": {"c": "new"}}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert diffs[0][0] == "a.b.c"

    def test_nested_add_within_existing(self) -> None:
        old = {"a": {"x": 1}}
        new = {"a": {"x": 1, "y": 2}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][0] == "a.y"
        assert diffs[0][1] == ChangeType.added

    def test_nested_remove_within_existing(self) -> None:
        old = {"a": {"x": 1, "y": 2}}
        new = {"a": {"x": 1}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert len(diffs) == 1
        assert diffs[0][0] == "a.y"
        assert diffs[0][1] == ChangeType.removed

    def test_dict_to_non_dict_is_modified(self) -> None:
        old = {"a": {"nested": True}}
        new = {"a": "flat"}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert diffs[0][1] == ChangeType.modified

    def test_non_dict_to_dict_is_modified(self) -> None:
        old = {"a": "flat"}
        new = {"a": {"nested": True}}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert diffs[0][1] == ChangeType.modified


class TestRecursiveDiffIdentical:
    def test_identical_empty_dicts(self) -> None:
        assert ChangeDetector._recursive_diff({}, {}, "") == []

    def test_identical_flat(self) -> None:
        data = {"a": 1, "b": "two"}
        assert ChangeDetector._recursive_diff(data, data, "") == []

    def test_identical_nested(self) -> None:
        data = {"outer": {"inner": [1, 2, 3]}}
        assert ChangeDetector._recursive_diff(data, data, "") == []

    def test_list_equality(self) -> None:
        old = {"arr": [1, 2, 3]}
        new = {"arr": [1, 2, 3]}
        assert ChangeDetector._recursive_diff(old, new, "") == []

    def test_list_inequality_is_modified(self) -> None:
        old = {"arr": [1, 2]}
        new = {"arr": [1, 2, 3]}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        assert diffs[0][1] == ChangeType.modified

    def test_sorted_key_order(self) -> None:
        old = {"z": 0, "a": 0}
        new = {"z": 1, "a": 1}
        diffs = ChangeDetector._recursive_diff(old, new, "")
        paths = [d[0] for d in diffs]
        assert paths == sorted(paths)


# ---------------------------------------------------------------------------
# _compute_checksum
# ---------------------------------------------------------------------------


class TestComputeChecksum:
    def test_returns_64_char_hex(self) -> None:
        cs = ChangeDetector._compute_checksum({})
        assert len(cs) == 64
        assert all(c in "0123456789abcdef" for c in cs)

    def test_deterministic(self) -> None:
        data = {"a": 1, "b": [2, 3]}
        assert ChangeDetector._compute_checksum(data) == ChangeDetector._compute_checksum(data)

    def test_key_order_invariant(self) -> None:
        d1 = {"a": 1, "b": 2}
        d2 = {"b": 2, "a": 1}
        assert ChangeDetector._compute_checksum(d1) == ChangeDetector._compute_checksum(d2)

    def test_different_data_different_checksum(self) -> None:
        cs1 = ChangeDetector._compute_checksum({"x": 1})
        cs2 = ChangeDetector._compute_checksum({"x": 2})
        assert cs1 != cs2

    def test_empty_dict_stable_checksum(self) -> None:
        cs = ChangeDetector._compute_checksum({})
        assert len(cs) == 64

    def test_nested_dict(self) -> None:
        cs = ChangeDetector._compute_checksum({"nested": {"key": "value"}})
        assert len(cs) == 64


# ---------------------------------------------------------------------------
# _wrap_value
# ---------------------------------------------------------------------------


class TestWrapValue:
    def test_none_returns_none(self) -> None:
        assert ChangeDetector._wrap_value(None) is None

    def test_dict_returned_as_is(self) -> None:
        d = {"key": "val"}
        result = ChangeDetector._wrap_value(d)
        assert result == d
        assert result is d

    def test_int_wrapped(self) -> None:
        assert ChangeDetector._wrap_value(42) == {"value": 42}

    def test_string_wrapped(self) -> None:
        assert ChangeDetector._wrap_value("hello") == {"value": "hello"}

    def test_bool_wrapped(self) -> None:
        assert ChangeDetector._wrap_value(True) == {"value": True}

    def test_list_wrapped(self) -> None:
        assert ChangeDetector._wrap_value([1, 2]) == {"value": [1, 2]}

    def test_zero_wrapped(self) -> None:
        assert ChangeDetector._wrap_value(0) == {"value": 0}
