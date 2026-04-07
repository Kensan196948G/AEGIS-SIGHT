import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SearchResultItem(BaseModel):
    """A single search result."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str  # device / license / procurement / alert
    title: str
    subtitle: str | None = None
    matched_field: str
    matched_value: str
    created_at: datetime | None = None


class SearchResultGroup(BaseModel):
    """Search results grouped by entity type."""

    type: str
    count: int
    items: list[SearchResultItem]


class SearchResponse(BaseModel):
    """Top-level search response."""

    query: str
    total: int
    groups: list[SearchResultGroup]
    offset: int
    limit: int
    has_more: bool
