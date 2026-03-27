import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.knowledge_base import (
    ArticleCategory,
    ArticleStatus,
    KBArticle,
    KBCategory,
)
from app.models.user import User
from app.schemas.knowledge_base import (
    HelpfulResponse,
    KBArticleBrief,
    KBArticleCreate,
    KBArticleResponse,
    KBArticleUpdate,
    KBCategoryCreate,
    KBCategoryResponse,
)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


# ---------------------------------------------------------------------------
# Article CRUD
# ---------------------------------------------------------------------------
@router.get(
    "/articles",
    response_model=PaginatedResponse[KBArticleBrief],
    summary="List knowledge base articles",
    description="Retrieve a paginated list of articles with optional filters.",
)
async def list_articles(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    category: ArticleCategory | None = Query(None, description="Filter by category"),
    status: ArticleStatus | None = Query(None, description="Filter by status"),
    search: str | None = Query(None, description="Search in title"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List articles with pagination and optional filters."""
    base_query = select(KBArticle)
    count_query = select(func.count(KBArticle.id))

    if category is not None:
        base_query = base_query.where(KBArticle.category == category)
        count_query = count_query.where(KBArticle.category == category)

    if status is not None:
        base_query = base_query.where(KBArticle.status == status)
        count_query = count_query.where(KBArticle.status == status)

    if search:
        like_pattern = f"%{search}%"
        base_query = base_query.where(KBArticle.title.ilike(like_pattern))
        count_query = count_query.where(KBArticle.title.ilike(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(KBArticle.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/articles",
    response_model=KBArticleResponse,
    status_code=201,
    summary="Create article",
    description="Create a new knowledge base article.",
)
async def create_article(
    data: KBArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new knowledge base article."""
    article = KBArticle(
        title=data.title,
        content=data.content,
        category=data.category,
        tags=data.tags,
        status=data.status,
        author_id=current_user.id,
    )
    db.add(article)
    await db.flush()
    await db.refresh(article)
    return article


@router.get(
    "/articles/{article_id}",
    response_model=KBArticleResponse,
    summary="Get article",
    description="Retrieve a specific article (increments view count).",
    responses={404: {"description": "Article not found"}},
)
async def get_article(
    article_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific article by ID and increment the view count."""
    result = await db.execute(select(KBArticle).where(KBArticle.id == article_id))
    article = result.scalar_one_or_none()
    if article is None:
        raise NotFoundError("Article", str(article_id))

    article.view_count += 1
    await db.flush()
    await db.refresh(article)
    return article


@router.patch(
    "/articles/{article_id}",
    response_model=KBArticleResponse,
    summary="Update article",
    description="Update article fields.",
    responses={404: {"description": "Article not found"}},
)
async def update_article(
    article_id: uuid.UUID,
    data: KBArticleUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update an existing article."""
    result = await db.execute(select(KBArticle).where(KBArticle.id == article_id))
    article = result.scalar_one_or_none()
    if article is None:
        raise NotFoundError("Article", str(article_id))

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(article, field, value)

    await db.flush()
    await db.refresh(article)
    return article


@router.post(
    "/articles/{article_id}/helpful",
    response_model=HelpfulResponse,
    summary="Mark article helpful",
    description="Increment the helpful count for an article.",
    responses={404: {"description": "Article not found"}},
)
async def mark_helpful(
    article_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Increment the helpful count for an article."""
    result = await db.execute(select(KBArticle).where(KBArticle.id == article_id))
    article = result.scalar_one_or_none()
    if article is None:
        raise NotFoundError("Article", str(article_id))

    article.helpful_count += 1
    await db.flush()
    await db.refresh(article)
    return HelpfulResponse(helpful_count=article.helpful_count)


# ---------------------------------------------------------------------------
# Category CRUD
# ---------------------------------------------------------------------------
@router.get(
    "/categories",
    response_model=list[KBCategoryResponse],
    summary="List categories",
    description="Retrieve all knowledge base categories ordered by sort_order.",
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all knowledge base categories."""
    result = await db.execute(select(KBCategory).order_by(KBCategory.sort_order))
    return result.scalars().all()


@router.post(
    "/categories",
    response_model=KBCategoryResponse,
    status_code=201,
    summary="Create category",
    description="Create a new knowledge base category.",
)
async def create_category(
    data: KBCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new knowledge base category."""
    category = KBCategory(
        name=data.name,
        description=data.description,
        icon=data.icon,
        sort_order=data.sort_order,
        parent_id=data.parent_id,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


# ---------------------------------------------------------------------------
# Popular & Search
# ---------------------------------------------------------------------------
@router.get(
    "/popular",
    response_model=list[KBArticleBrief],
    summary="Popular articles",
    description="Retrieve the top 10 most viewed published articles.",
)
async def popular_articles(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return top 10 published articles by view count."""
    result = await db.execute(
        select(KBArticle)
        .where(KBArticle.status == ArticleStatus.published)
        .order_by(KBArticle.view_count.desc())
        .limit(10)
    )
    return result.scalars().all()


@router.get(
    "/search",
    response_model=PaginatedResponse[KBArticleBrief],
    summary="Full-text search",
    description="Search articles by title and content.",
)
async def search_articles(
    q: str = Query(..., min_length=1, description="Search query"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Full-text search across published articles (title + content)."""
    like_pattern = f"%{q}%"
    condition = or_(
        KBArticle.title.ilike(like_pattern),
        KBArticle.content.ilike(like_pattern),
    )
    base_query = (
        select(KBArticle)
        .where(KBArticle.status == ArticleStatus.published)
        .where(condition)
    )
    count_query = (
        select(func.count(KBArticle.id))
        .where(KBArticle.status == ArticleStatus.published)
        .where(condition)
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(KBArticle.view_count.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)
