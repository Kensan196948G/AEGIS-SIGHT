import uuid
from datetime import datetime, UTC

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CustomView(Base):
    __tablename__ = "custom_views"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True
    )
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    columns: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    filters: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    sort_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sort_order: Mapped[str] = mapped_column(
        String(4), nullable=False, default="asc"
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_shared: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    owner = relationship("User", lazy="selectin")
