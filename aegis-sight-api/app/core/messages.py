"""Localized error and domain message constants for AEGIS-SIGHT API."""

from __future__ import annotations


class ErrorMessages:
    """HTTP error messages (Japanese)."""

    NOT_FOUND = "リソースが見つかりません"
    FORBIDDEN = "アクセスが拒否されました"
    UNAUTHORIZED = "認証が必要です"
    CONFLICT = "リソースが競合しています"
    VALIDATION_ERROR = "入力値が不正です"
    RATE_LIMITED = "リクエスト制限を超過しました"
    SERVER_ERROR = "内部サーバーエラーが発生しました"
    BAD_REQUEST = "不正なリクエストです"
    SERVICE_UNAVAILABLE = "サービスが一時的に利用できません"
    TIMEOUT = "リクエストがタイムアウトしました"


class LicenseMessages:
    """SAM / License domain messages."""

    LICENSE_OVER = "ライセンス数を超過しています: {software}"
    LICENSE_EXPIRING = "ライセンスの有効期限が近づいています: {software}"
    LICENSE_EXPIRED = "ライセンスの有効期限が切れています: {software}"
    LICENSE_COMPLIANT = "ライセンスは適正に管理されています: {software}"
    LICENSE_NOT_FOUND = "ライセンスが見つかりません: {software}"


class ProcurementMessages:
    """Procurement workflow messages."""

    PROCUREMENT_INVALID_TRANSITION = (
        "調達申請のステータス遷移が不正です: {from_status} → {to_status}"
    )
    PROCUREMENT_CREATED = "調達申請が作成されました: {title}"
    PROCUREMENT_APPROVED = "調達申請が承認されました: {title}"
    PROCUREMENT_REJECTED = "調達申請が却下されました: {title}"
    PROCUREMENT_COMPLETED = "調達申請が完了しました: {title}"
    PROCUREMENT_BUDGET_EXCEEDED = "予算を超過しています: {amount}"


class DeviceMessages:
    """Device / asset domain messages."""

    DEVICE_OFFLINE = "デバイスがオフラインです: {hostname}"
    DEVICE_NOT_FOUND = "デバイスが見つかりません: {hostname}"
    DEVICE_REGISTERED = "デバイスが登録されました: {hostname}"
    DEVICE_RETIRED = "デバイスが廃棄されました: {hostname}"
    DEVICE_MAINTENANCE = "デバイスがメンテナンス中です: {hostname}"
    DEVICE_DUPLICATE_MAC = "MACアドレスが重複しています: {mac_address}"


class SecurityMessages:
    """Security domain messages."""

    DEFENDER_DISABLED = "Windows Defenderが無効です: {hostname}"
    BITLOCKER_DISABLED = "BitLockerが無効です: {hostname}"
    PATCH_OVERDUE = "パッチ適用が遅延しています: {hostname}"
    SECURITY_ALERT = "セキュリティアラートが検出されました: {hostname}"
    UNAUTHORIZED_SOFTWARE = "未許可ソフトウェアが検出されました: {software}"


class AuditMessages:
    """Audit trail messages."""

    AUDIT_LOGIN = "ログインしました: {user}"
    AUDIT_LOGOUT = "ログアウトしました: {user}"
    AUDIT_PERMISSION_CHANGED = "権限が変更されました: {user} ({role})"
    AUDIT_DATA_EXPORTED = "データがエクスポートされました: {resource}"
    AUDIT_CONFIG_CHANGED = "設定が変更されました: {key}"


class NotificationMessages:
    """Notification messages."""

    NOTIFICATION_SENT = "通知を送信しました: {subject}"
    NOTIFICATION_FAILED = "通知の送信に失敗しました: {subject}"
    NOTIFICATION_THRESHOLD = "しきい値を超過しました: {metric} ({value})"
