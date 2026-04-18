"""Unit tests for app/services/retention_service.py — BATCH_SIZE constant."""


from app.services.retention_service import BATCH_SIZE


class TestBatchSizeConstant:
    def test_batch_size_is_positive(self) -> None:
        assert BATCH_SIZE > 0

    def test_batch_size_value(self) -> None:
        assert BATCH_SIZE == 1000

    def test_batch_size_is_int(self) -> None:
        assert isinstance(BATCH_SIZE, int)

    def test_batch_size_is_reasonable(self) -> None:
        # Too small hurts performance; too large risks lock contention
        assert 100 <= BATCH_SIZE <= 10_000
