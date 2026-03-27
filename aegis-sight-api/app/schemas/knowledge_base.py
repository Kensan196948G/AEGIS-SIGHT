import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.knowledge_base import ArticleCategory, ArticleStatus


# ---------------------------------------------------------------------------
# Article schemas
# ---------------------------------------------------------------------------
class KBArticleCreate(BaseModel):
    title: str
    content: str
    category: ArticleCategory
    tags: list[str] | None = None
    status: ArticleStatus = ArticleStatus.draft


class KBArticleUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: ArticleCategory | None = None
    tags: list[str] | None = None
    status: ArticleStatus | None = None


class KBArticleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    category: ArticleCategory
    tags: list[str] | None
    author_id: uuid.UUID
    status: ArticleStatus
    view_count: int
    helpful_count: int
    created_at: datetime
    updated_at: datetime


class KBArticleBrief(BaseModel):
    """Lighter response for list / popular endpoints."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    category: ArticleCategory
    status: ArticleStatus
    view_count: int
    helpful_count: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Category schemas
# ---------------------------------------------------------------------------
class KBCategoryCreate(BaseModel):
    name: str
    description: str
    icon: str | None = None
    sort_order: int = 0
    parent_id: uuid.UUID | None = None


class KBCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    icon: str | None
    sort_order: int
    parent_id: uuid.UUID | None
    article_count: int


# ---------------------------------------------------------------------------
# Helpful response
# ---------------------------------------------------------------------------
class HelpfulResponse(BaseModel):
    helpful_count: int
