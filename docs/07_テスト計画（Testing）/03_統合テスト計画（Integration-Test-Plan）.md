# 統合テスト計画（Integration Test Plan）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| ステータス | Draft |
| テスト比率 | 全テストの約20% |

---

## 1. 概要

統合テストは複数コンポーネント間の連携動作を検証する。AEGIS-SIGHTでは主にAPI統合テスト（FastAPIエンドポイント）とDB統合テスト（PostgreSQL）を対象とし、コンポーネント単体では検出できない不具合を早期に発見する。

---

## 2. 統合テスト対象

### 2.1 テスト対象マトリクス

| テスト対象 | 検証内容 | 優先度 | 依存コンポーネント |
|-----------|---------|--------|------------------|
| API エンドポイント | リクエスト→レスポンス完全フロー | 最高 | FastAPI + DB |
| DB操作 | CRUD操作、トランザクション | 最高 | SQLAlchemy + PostgreSQL |
| 認証・認可フロー | JWT発行→検証→アクセス制御 | 最高 | Auth + API + DB |
| ファイルアップロード | アップロード→保存→取得 | 高 | API + Storage |
| バッチ処理 | データ収集→加工→保存 | 高 | Scheduler + DB |
| 外部API連携 | IAMS移植APIとの連携 | 中 | API + External |
| WebSocket通知 | リアルタイム通知配信 | 中 | WebSocket + Event |

---

## 3. API統合テスト

### 3.1 テスト構成

```
tests/
├── integration/
│   ├── api/
│   │   ├── test_auth_api.py          # 認証API
│   │   ├── test_user_api.py          # ユーザー管理API
│   │   ├── test_device_api.py        # デバイス管理API
│   │   ├── test_asset_api.py         # 資産管理API
│   │   ├── test_log_api.py           # ログ管理API
│   │   └── test_report_api.py        # レポートAPI
│   ├── db/
│   │   ├── test_user_repository.py   # ユーザーDB操作
│   │   ├── test_device_repository.py # デバイスDB操作
│   │   └── test_migration.py         # マイグレーション
│   └── conftest.py                   # 統合テスト共通fixture
```

### 3.2 API統合テストパターン

#### 認証API

| テストケース | メソッド | パス | 期待結果 |
|------------|---------|------|---------|
| 正常ログイン | POST | /api/v1/auth/login | 200 + JWT |
| 無効パスワード | POST | /api/v1/auth/login | 401 |
| 存在しないユーザー | POST | /api/v1/auth/login | 401 |
| トークンリフレッシュ | POST | /api/v1/auth/refresh | 200 + 新JWT |
| 期限切れトークン | POST | /api/v1/auth/refresh | 401 |
| ログアウト | POST | /api/v1/auth/logout | 204 |

#### ユーザー管理API

| テストケース | メソッド | パス | 期待結果 |
|------------|---------|------|---------|
| ユーザー一覧取得 | GET | /api/v1/users | 200 + ページネーション |
| ユーザー詳細取得 | GET | /api/v1/users/{id} | 200 |
| 存在しないユーザー | GET | /api/v1/users/{id} | 404 |
| ユーザー作成 | POST | /api/v1/users | 201 |
| 重複メール作成 | POST | /api/v1/users | 409 |
| ユーザー更新 | PUT | /api/v1/users/{id} | 200 |
| ユーザー削除 | DELETE | /api/v1/users/{id} | 204 |
| 権限不足での削除 | DELETE | /api/v1/users/{id} | 403 |
| 検索（名前） | GET | /api/v1/users?name=xxx | 200 + フィルター結果 |
| ソート | GET | /api/v1/users?sort=name | 200 + ソート結果 |

#### デバイス管理API

| テストケース | メソッド | パス | 期待結果 |
|------------|---------|------|---------|
| デバイス一覧取得 | GET | /api/v1/devices | 200 + ページネーション |
| デバイス登録 | POST | /api/v1/devices | 201 |
| 重複IP登録 | POST | /api/v1/devices | 409 |
| デバイス更新 | PUT | /api/v1/devices/{id} | 200 |
| デバイスステータス変更 | PATCH | /api/v1/devices/{id}/status | 200 |
| デバイス削除 | DELETE | /api/v1/devices/{id} | 204 |
| OS種別フィルター | GET | /api/v1/devices?os=Windows | 200 |
| 未認証アクセス | GET | /api/v1/devices | 401 |

### 3.3 テスト実装例

```python
# tests/integration/api/test_user_api.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client(db_session):
    """テスト用HTTPクライアント"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(client):
    """認証済みヘッダー"""
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": "test_password"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestUserAPI:
    """ユーザー管理API統合テスト"""

    async def test_create_user_returns_201(self, client, auth_headers):
        """有効なデータでユーザーが作成されること"""
        response = await client.post(
            "/api/v1/users",
            json={
                "name": "新規ユーザー",
                "email": "newuser@example.com",
                "department": "情報システム部",
                "role": "viewer",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "新規ユーザー"
        assert data["email"] == "newuser@example.com"
        assert "id" in data

    async def test_create_user_with_duplicate_email_returns_409(
        self, client, auth_headers
    ):
        """重複メールアドレスで409が返ること"""
        user_data = {
            "name": "重複テスト",
            "email": "duplicate@example.com",
            "department": "総務部",
            "role": "viewer",
        }
        # 1回目: 成功
        await client.post("/api/v1/users", json=user_data, headers=auth_headers)
        # 2回目: 重複エラー
        response = await client.post(
            "/api/v1/users", json=user_data, headers=auth_headers
        )
        assert response.status_code == 409

    async def test_get_users_returns_paginated_list(self, client, auth_headers):
        """ユーザー一覧がページネーション付きで返ること"""
        response = await client.get(
            "/api/v1/users?page=1&per_page=10",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data

    async def test_get_users_without_auth_returns_401(self, client):
        """未認証でのアクセスが401を返すこと"""
        response = await client.get("/api/v1/users")
        assert response.status_code == 401
```

---

## 4. DB統合テスト

### 4.1 テスト対象

| テスト対象 | 検証内容 |
|-----------|---------|
| CRUD操作 | 各テーブルの作成・読取・更新・削除 |
| トランザクション | コミット・ロールバックの動作 |
| 制約チェック | UNIQUE、NOT NULL、FK制約 |
| インデックス | クエリパフォーマンス |
| マイグレーション | 全マイグレーションの適用・ロールバック |
| 同時実行 | デッドロック、楽観的ロック |

### 4.2 テスト環境

```yaml
# docker-compose.test.yml
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: aegis_sight_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # メモリ上で高速実行
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d aegis_sight_test"]
      interval: 2s
      timeout: 5s
      retries: 10
```

### 4.3 DB統合テストfixture

```python
# tests/integration/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_DATABASE_URL = "postgresql+asyncpg://test_user:test_password@localhost:5433/aegis_sight_test"

@pytest.fixture(scope="session")
async def engine():
    """テスト用DBエンジン（セッション全体で共有）"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    """テスト用DBセッション（各テストでロールバック）"""
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        async with session.begin():
            yield session
            await session.rollback()  # テスト後にロールバック
```

### 4.4 DB統合テスト例

```python
# tests/integration/db/test_user_repository.py
class TestUserRepository:
    """ユーザーリポジトリDB統合テスト"""

    async def test_create_and_find_user(self, db_session):
        """ユーザー作成後に検索できること"""
        repo = UserRepository(db_session)
        user = User(name="DB太郎", email="db_taro@example.com", department="開発部")

        created = await repo.create(user)
        found = await repo.find_by_id(created.id)

        assert found is not None
        assert found.name == "DB太郎"
        assert found.email == "db_taro@example.com"

    async def test_unique_email_constraint(self, db_session):
        """重複メールアドレスが制約違反になること"""
        repo = UserRepository(db_session)
        user1 = User(name="ユーザー1", email="same@example.com", department="部署A")
        user2 = User(name="ユーザー2", email="same@example.com", department="部署B")

        await repo.create(user1)
        with pytest.raises(IntegrityError):
            await repo.create(user2)

    async def test_soft_delete(self, db_session):
        """論理削除後に通常検索で取得できないこと"""
        repo = UserRepository(db_session)
        user = User(name="削除テスト", email="delete@example.com", department="部署C")
        created = await repo.create(user)

        await repo.soft_delete(created.id)
        found = await repo.find_by_id(created.id)

        assert found is None  # 論理削除されたため取得できない

    async def test_pagination(self, db_session):
        """ページネーションが正しく動作すること"""
        repo = UserRepository(db_session)
        for i in range(25):
            await repo.create(User(
                name=f"ユーザー{i}",
                email=f"user{i}@example.com",
                department="部署X"
            ))

        page1 = await repo.find_all(page=1, per_page=10)
        page2 = await repo.find_all(page=2, per_page=10)
        page3 = await repo.find_all(page=3, per_page=10)

        assert len(page1.items) == 10
        assert len(page2.items) == 10
        assert len(page3.items) == 5
        assert page1.total == 25
```

---

## 5. 認証・認可統合テスト

| テストケース | 入力 | 期待結果 |
|------------|------|---------|
| 管理者 → 全リソースアクセス | admin ロール + 任意エンドポイント | 200 |
| 一般ユーザー → 自分のデータ | viewer ロール + 自身のID | 200 |
| 一般ユーザー → 他人のデータ | viewer ロール + 他者のID | 403 |
| 期限切れトークン | expired JWT + 任意エンドポイント | 401 |
| 改竄トークン | invalid JWT + 任意エンドポイント | 401 |
| トークンなし | ヘッダーなし + 保護エンドポイント | 401 |
| CSRF検証 | 不正Origin + POST | 403 |

---

## 6. テスト実行手順

### 6.1 前提条件

```bash
# テスト用DBコンテナ起動
docker compose -f docker-compose.test.yml up -d test-db

# DBの準備完了を待機
docker compose -f docker-compose.test.yml exec test-db pg_isready -U test_user

# マイグレーション適用
alembic -c alembic.test.ini upgrade head
```

### 6.2 テスト実行

```bash
# 統合テスト全体
pytest tests/integration/ -v --cov=app --cov-report=html

# API統合テストのみ
pytest tests/integration/api/ -v

# DB統合テストのみ
pytest tests/integration/db/ -v

# 特定のテストクラス
pytest tests/integration/api/test_user_api.py::TestUserAPI -v

# 並列実行（高速化）
pytest tests/integration/ -v -n auto
```

### 6.3 後片付け

```bash
# テスト用DBコンテナ停止
docker compose -f docker-compose.test.yml down -v
```

---

## 7. CI統合設定

```yaml
# .github/workflows/integration-test.yml（概要）
name: Integration Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: aegis_sight_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements-test.txt
      - run: alembic upgrade head
        env:
          DATABASE_URL: postgresql+asyncpg://test_user:test_password@localhost:5433/aegis_sight_test
      - run: pytest tests/integration/ -v --cov=app --cov-report=xml --junitxml=reports/integration-results.xml
        env:
          DATABASE_URL: postgresql+asyncpg://test_user:test_password@localhost:5433/aegis_sight_test
      - uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: reports/
```

---

## 8. チェックリスト

### 統合テスト作成チェック

- [ ] テスト用DBが正しく構成されているか
- [ ] 各テストがトランザクションロールバックで隔離されているか
- [ ] APIの全HTTPメソッド（GET/POST/PUT/PATCH/DELETE）がテストされているか
- [ ] 認証・認可の全パターンがカバーされているか
- [ ] ページネーション・ソート・フィルターが検証されているか
- [ ] エラーレスポンス（400/401/403/404/409/500）が検証されているか
- [ ] DB制約（UNIQUE/NOT NULL/FK）の違反テストがあるか
- [ ] マイグレーションの往復テスト（up/down）があるか
- [ ] テスト実行時間が10分以内か
- [ ] CI環境での実行が確認されているか
