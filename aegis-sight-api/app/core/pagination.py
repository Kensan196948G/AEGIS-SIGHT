"""Pagination utilities for list endpoints."""

from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams:
    """Dependency for extracting pagination parameters from query string."""

    def __init__(
        self,
        offset: int = Query(0, ge=0, description="Number of records to skip"),
        limit: int = Query(
            50, ge=1, le=200, description="Maximum number of records to return"
        ),
    ):
        self.offset = offset
        self.limit = limit


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    items: list[T]
    total: int
    offset: int
    limit: int
    has_more: bool

    model_config = {"from_attributes": True}


def create_paginated_response(
    items: list,
    total: int,
    offset: int,
    limit: int,
) -> dict:
    """Build a paginated response dict.

    Use this helper when you need to return a PaginatedResponse
    from an endpoint without constructing the model manually.
    """
    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": (offset + limit) < total,
    }
