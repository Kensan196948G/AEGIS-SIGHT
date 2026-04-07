"""Knowledge base API endpoint tests."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge_base import (
    ArticleCategory,
    ArticleStatus,
    KBArticle,
    KBCategory,
)
from app.models.user import User


async def _create_article(
    db: AsyncSession,
    author_id: uuid.UUID,
    title: str = "Test Article",
    content: str = "Test content body",
    category: ArticleCategory = ArticleCategory.how_to,
    status: ArticleStatus = ArticleStatus.published,
) -> KBArticle:
    """Helper to insert a test KB article."""
    article = KBArticle(
        title=title,
        content=content,
        category=category,
        status=status,
        author_id=author_id,
        tags=["test"],
    )
    db.add(article)
    await db.flush()
    await db.refresh(article)
    return article


async def _create_category(
    db: AsyncSession,
    name: str = "Test Category",
    description: str = "A test category",
) -> KBCategory:
    """Helper to insert a test KB category."""
    cat = KBCategory(
        name=f"{name}-{uuid.uuid4().hex[:6]}",
        description=description,
    )
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


# ---------------------------------------------------------------------------
# Article tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_articles_unauthorized(client: AsyncClient):
    """Listing articles requires authentication."""
    response = await client.get("/api/v1/knowledge/articles")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_articles(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """List articles with authentication."""
    await _create_article(db_session, author_id=test_user.id)
    response = await client.get("/api/v1/knowledge/articles", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_article(client: AsyncClient, auth_headers: dict):
    """Create a new article."""
    payload = {
        "title": f"New KB Article {uuid.uuid4().hex[:6]}",
        "content": "# Hello\n\nThis is a knowledge base article.",
        "category": "how_to",
        "tags": ["onboarding", "setup"],
        "status": "draft",
    }
    response = await client.post(
        "/api/v1/knowledge/articles", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["category"] == "how_to"
    assert data["status"] == "draft"
    assert data["view_count"] == 0
    assert data["helpful_count"] == 0


@pytest.mark.asyncio
async def test_get_article_increments_view(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Getting an article should increment view_count."""
    article = await _create_article(db_session, author_id=test_user.id, title="View Test")
    article_id = str(article.id)

    response = await client.get(
        f"/api/v1/knowledge/articles/{article_id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["view_count"] == 1


@pytest.mark.asyncio
async def test_update_article(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Update an article's title."""
    article = await _create_article(db_session, author_id=test_user.id, title="Old Title")
    article_id = str(article.id)

    response = await client.patch(
        f"/api/v1/knowledge/articles/{article_id}",
        json={"title": "New Title"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_mark_helpful(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Mark an article as helpful should increment count."""
    article = await _create_article(db_session, author_id=test_user.id, title="Helpful Test")
    article_id = str(article.id)

    response = await client.post(
        f"/api/v1/knowledge/articles/{article_id}/helpful", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["helpful_count"] == 1


@pytest.mark.asyncio
async def test_get_article_not_found(client: AsyncClient, auth_headers: dict):
    """Getting a non-existent article should return 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/v1/knowledge/articles/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Category tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_categories(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """List categories."""
    await _create_category(db_session)
    response = await client.get("/api/v1/knowledge/categories", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_create_category(client: AsyncClient, auth_headers: dict):
    """Create a new category."""
    payload = {
        "name": f"Cat-{uuid.uuid4().hex[:6]}",
        "description": "Test category",
        "sort_order": 5,
    }
    response = await client.post(
        "/api/v1/knowledge/categories", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["sort_order"] == 5
    assert data["article_count"] == 0


# ---------------------------------------------------------------------------
# Popular & Search tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_popular_articles(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Popular endpoint should return published articles sorted by views."""
    await _create_article(
        db_session, author_id=test_user.id, title="Popular One", status=ArticleStatus.published
    )
    response = await client.get("/api/v1/knowledge/popular", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_search_articles(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Search endpoint should find articles by title/content."""
    keyword = f"unique{uuid.uuid4().hex[:6]}"
    await _create_article(
        db_session,
        author_id=test_user.id,
        title=f"Article with {keyword}",
        content="Some content",
        status=ArticleStatus.published,
    )
    response = await client.get(
        f"/api/v1/knowledge/search?q={keyword}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_filter_by_category(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Filter articles by category."""
    await _create_article(
        db_session,
        author_id=test_user.id,
        title="FAQ article",
        category=ArticleCategory.faq,
    )
    response = await client.get(
        "/api/v1/knowledge/articles?category=faq", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["category"] == "faq"
