"""Unit tests for app/services/audit_service.py."""

from __future__ import annotations

import inspect

from app.models.audit_log import AuditAction, AuditLog
from app.services.audit_service import AuditService


class TestAuditServiceStructure:
    def test_is_class(self) -> None:
        assert isinstance(AuditService, type)

    def test_init_accepts_db_param(self) -> None:
        sig = inspect.signature(AuditService.__init__)
        assert "db" in sig.parameters

    def test_log_action_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(AuditService.log_action)

    def test_query_logs_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(AuditService.query_logs)

    def test_log_action_requires_keyword_only_args(self) -> None:
        # All parameters after * are keyword-only
        sig = inspect.signature(AuditService.log_action)
        kw_only = [
            name
            for name, p in sig.parameters.items()
            if p.kind == inspect.Parameter.KEYWORD_ONLY
        ]
        assert "action" in kw_only
        assert "resource_type" in kw_only


class TestAuditActionEnum:
    def test_create_value(self) -> None:
        assert AuditAction.create == "create"

    def test_update_value(self) -> None:
        assert AuditAction.update == "update"

    def test_delete_value(self) -> None:
        assert AuditAction.delete == "delete"

    def test_login_value(self) -> None:
        assert AuditAction.login == "login"

    def test_logout_value(self) -> None:
        assert AuditAction.logout == "logout"

    def test_export_value(self) -> None:
        assert AuditAction.export == "export"

    def test_approve_value(self) -> None:
        assert AuditAction.approve == "approve"

    def test_reject_value(self) -> None:
        assert AuditAction.reject == "reject"

    def test_total_action_count(self) -> None:
        assert len(AuditAction) == 8

    def test_is_str_enum(self) -> None:
        assert issubclass(AuditAction, str)

    def test_all_values_are_lowercase(self) -> None:
        for action in AuditAction:
            assert action.value == action.value.lower(), f"{action!r} value is not lowercase"


class TestAuditLogAppendOnly:
    """
    AuditLog is intentionally write-once (append-only) for tamper-evident logging.
    Verify that no bulk update/delete class methods exist on the ORM model.
    """

    def test_audit_log_has_no_bulk_delete_method(self) -> None:
        assert not hasattr(AuditLog, "bulk_delete")

    def test_audit_log_has_no_update_method(self) -> None:
        assert not hasattr(AuditLog, "update_record")

    def test_audit_log_table_name_is_audit_logs(self) -> None:
        assert AuditLog.__tablename__ == "audit_logs"

    def test_audit_log_is_orm_model(self) -> None:
        # Mapped models expose __table__ attribute via SQLAlchemy
        assert hasattr(AuditLog, "__table__")

    def test_audit_log_docstring_mentions_append_only(self) -> None:
        doc = AuditLog.__doc__ or ""
        assert "append" in doc.lower() or "write" in doc.lower()
