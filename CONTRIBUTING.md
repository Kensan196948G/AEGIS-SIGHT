# Contributing to AEGIS-SIGHT

Thank you for your interest in contributing to AEGIS-SIGHT. This document describes the development workflow, coding standards, and review requirements.

---

## Development Environment Setup

### Prerequisites

- Python 3.12+
- Node.js 20+ (for the web frontend)
- Docker and Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### 1. Clone the repository

```bash
git clone <repository-url>
cd AEGIS-SIGHT
```

### 2. Start infrastructure services

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts PostgreSQL, Redis, and any other required services.

### 3. Set up the API backend

```bash
cd aegis-sight-api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # test/lint dependencies

# Copy environment template
cp .env.example .env

# Run database migrations
alembic upgrade head

# Seed initial data (optional)
python -m scripts.seed_data
```

### 4. Set up the web frontend

```bash
cd aegis-sight-web
npm install
cp .env.example .env.local
```

### 5. Run the development servers

```bash
# API (from aegis-sight-api/)
uvicorn app.main:app --reload --port 8000

# Web (from aegis-sight-web/)
npm run dev
```

### 6. Run tests

```bash
# API tests
cd aegis-sight-api
pytest                           # all tests
pytest -m unit                   # unit tests only
pytest -m integration            # integration tests only
pytest -m rbac                   # RBAC tests only
pytest --tb=short -q             # concise output
```

---

## Branch Strategy

We use a trunk-based development model with short-lived feature branches.

```
main (protected)
  |
  +-- feat/XXX-description     # New features
  +-- fix/XXX-description      # Bug fixes
  +-- refactor/XXX-description # Refactoring
  +-- docs/XXX-description     # Documentation
  +-- test/XXX-description     # Test additions
  +-- chore/XXX-description    # Maintenance tasks
```

### Branch naming

- Prefix with the type: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`
- Include the issue number if one exists: `feat/42-add-m365-sync`
- Use kebab-case for descriptions

### Rules

- **Never push directly to `main`.** All changes go through pull requests.
- Keep branches short-lived (ideally < 3 days).
- Rebase on `main` before creating a PR to minimize merge conflicts.
- Delete branches after merging.

---

## Pull Request Rules

### Before creating a PR

1. All tests pass locally: `pytest`
2. Linting passes: `ruff check .`
3. Type checking passes: `mypy app/`
4. No new security issues
5. New endpoints have OpenAPI metadata (summary, description, responses)

### PR requirements

- **Title:** Concise, imperative mood (e.g., "Add M365 license sync endpoint")
- **Description:** Include:
  - Summary of changes (1--3 bullet points)
  - Related issue number (e.g., `Closes #42`)
  - Test plan (how to verify)
  - Screenshots for UI changes
- **Size:** Keep PRs small and focused. If a change touches > 400 lines, consider splitting it.
- **Reviewers:** At least one approval required before merging.

### CI checks (must pass)

- Unit and integration tests
- Lint (ruff)
- Type checking (mypy)
- Security scan
- Build verification

---

## Test Requirements

### Coverage expectations

- New endpoints: must have corresponding test cases
- Bug fixes: must include a regression test
- Business logic: aim for > 80% coverage

### Test organization

```
tests/
  conftest.py           # Shared fixtures
  factories.py          # Test data factories
  test_<module>.py      # Unit tests per module
  test_integration.py   # Cross-module integration tests
  test_rbac.py          # Role-based access control tests
```

### Test markers

Use pytest markers to categorize tests:

```python
@pytest.mark.unit          # Fast, isolated unit tests
@pytest.mark.integration   # Cross-module workflow tests
@pytest.mark.rbac          # Role-based access control tests
@pytest.mark.slow          # Tests taking > 5 seconds
```

### Writing tests

- Use the existing fixtures in `conftest.py` (e.g., `client`, `admin_headers`, `db_session`).
- Use factories from `factories.py` for test data creation.
- Each test should be independent -- do not rely on test execution order.
- Async tests are auto-detected when `asyncio_mode = auto` is set in `pytest.ini`.

---

## Coding Standards

### Python (API backend)

- **Formatter:** ruff format (line length 100)
- **Linter:** ruff check with default rules
- **Type hints:** Required for all function signatures
- **Docstrings:** Required for all public functions, classes, and modules
- **Naming:**
  - `snake_case` for functions, variables, modules
  - `PascalCase` for classes
  - `UPPER_SNAKE_CASE` for constants
- **Imports:** Sorted by ruff (isort-compatible)
- **Async:** All database operations must use `async/await`
- **Error handling:** Use custom exceptions from `app.core.exceptions`
- **Pagination:** All list endpoints must return `PaginatedResponse`

### TypeScript (web frontend)

- **Formatter:** Prettier
- **Linter:** ESLint with the project config
- **Components:** Functional components with hooks
- **Naming:**
  - `camelCase` for variables and functions
  - `PascalCase` for components and types
  - `kebab-case` for file names

### SQL / Migrations

- Use Alembic for all schema changes
- Never modify existing migration files -- create a new one
- Migration files must be numbered sequentially (e.g., `008_add_xxx.py`)
- Include both `upgrade()` and `downgrade()` functions

### Git commits

- Use conventional commit format: `type: description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`
- Keep the first line under 72 characters
- Reference issue numbers in the body when applicable

---

## Project Structure

```
AEGIS-SIGHT/
  aegis-sight-api/        # FastAPI backend
    app/
      api/v1/             # API route handlers
      core/               # Config, database, security, middleware
      models/             # SQLAlchemy ORM models
      schemas/            # Pydantic request/response schemas
      services/           # Business logic layer
    alembic/              # Database migrations
    tests/                # Test suite
    scripts/              # Utility scripts
  aegis-sight-web/        # React/Next.js frontend
  aegis-sight-agent/      # Endpoint telemetry agent
  aegis-sight-infra/      # Infrastructure as Code
  docs/                   # Architecture and design docs
  scripts/                # Project-level scripts
```

---

## Getting Help

- Check existing issues and PRs before creating new ones
- For questions, open a Discussion on GitHub
- For bugs, create an Issue with reproduction steps
