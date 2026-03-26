# テスト戦略（Test Strategy）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| ステータス | Draft |
| カバレッジ目標 | 80%以上（行カバレッジ・分岐カバレッジ） |

---

## 1. テスト方針

AEGIS-SIGHTでは**テストピラミッド**の原則に基づき、下位レイヤーほど多くのテストを配置し、上位レイヤーは重要シナリオに絞る。

### 1.1 テストピラミッド

```
        ┌─────────┐
        │  E2E    │  ← 少数（クリティカルパス）
       ─┼─────────┼─
       │ Integration │  ← 中程度（API・DB連携）
      ─┼─────────────┼─
      │   Unit Test    │  ← 多数（ロジック網羅）
      └────────────────┘
```

| レイヤー | 比率目安 | 実行時間目安 | 担当ツール |
|----------|----------|-------------|-----------|
| 単体テスト | 70% | ~2分 | pytest / Vitest |
| 統合テスト | 20% | ~5分 | pytest + TestClient / Vitest |
| E2Eテスト | 10% | ~10分 | Playwright |

---

## 2. テスト種別一覧

| テスト種別 | 目的 | 対象 | ツール | 実行タイミング |
|-----------|------|------|--------|--------------|
| 単体テスト | 関数・クラス単位の動作検証 | Backend: Python, Frontend: TypeScript | pytest / Vitest | コミット時（pre-commit） |
| 統合テスト | コンポーネント間連携の検証 | API エンドポイント、DB操作 | pytest + httpx / Vitest | PR作成時（CI） |
| E2Eテスト | ユーザーシナリオの検証 | 画面操作フロー | Playwright | マージ前（CI） |
| 回帰テスト | 既存機能の破壊防止 | 変更影響範囲 | pytest / Vitest | PR作成時（CI） |
| パフォーマンステスト | 応答時間・負荷耐性 | API エンドポイント | locust / k6 | リリース前 |
| セキュリティテスト | 脆弱性検出 | 全体 | bandit / npm audit | 週次（CI） |
| IAMS変換テスト | IAMS既存テストのpytest移行 | IAMS移植対象モジュール | pytest | 移行フェーズ |

---

## 3. テストツールチェーン

### 3.1 バックエンド（Python / FastAPI）

| ツール | 用途 | バージョン |
|--------|------|-----------|
| pytest | テストランナー | >=8.0 |
| pytest-cov | カバレッジ計測 | >=5.0 |
| pytest-asyncio | 非同期テスト | >=0.23 |
| httpx | APIクライアント（テスト用） | >=0.27 |
| factory-boy | テストデータファクトリ | >=3.3 |
| faker | ダミーデータ生成 | >=22.0 |
| bandit | セキュリティ静的解析 | >=1.7 |
| mypy | 型チェック | >=1.8 |
| ruff | リンター・フォーマッター | >=0.3 |

### 3.2 フロントエンド（Next.js 14 / TypeScript）

| ツール | 用途 | バージョン |
|--------|------|-----------|
| Vitest | テストランナー | >=1.0 |
| @testing-library/react | コンポーネントテスト | >=14.0 |
| msw | APIモック | >=2.0 |
| Playwright | E2Eテスト | >=1.40 |
| ESLint | リンター | >=8.0 |
| Prettier | フォーマッター | >=3.0 |

### 3.3 インフラ・共通

| ツール | 用途 |
|--------|------|
| Docker Compose | テスト環境構築 |
| PostgreSQL 16 | テストDB |
| GitHub Actions | CI/CDパイプライン |
| SonarQube（予定） | コード品質ダッシュボード |

---

## 4. 品質基準

### 4.1 カバレッジ基準

| メトリクス | 最低基準 | 目標 |
|-----------|---------|------|
| 行カバレッジ（Line Coverage） | 75% | 80%以上 |
| 分岐カバレッジ（Branch Coverage） | 70% | 80%以上 |
| 関数カバレッジ（Function Coverage） | 80% | 90%以上 |
| 新規コードカバレッジ | 80% | 90%以上 |

### 4.2 品質ゲート（CI必須条件）

| 条件 | 閾値 | ブロック対象 |
|------|------|------------|
| 全テストパス | 100% | マージ |
| カバレッジ低下 | -2%以上の低下で失敗 | マージ |
| セキュリティ脆弱性 | Critical/High = 0 | マージ |
| リンターエラー | 0 | マージ |
| 型チェックエラー | 0 | マージ |
| E2Eテスト | クリティカルパス全パス | リリース |

### 4.3 テスト実行時間基準

| テスト種別 | 最大実行時間 | 超過時の対応 |
|-----------|-------------|-------------|
| 単体テスト全体 | 3分 | テスト分割・並列化 |
| 統合テスト全体 | 10分 | テスト選択実行 |
| E2Eテスト全体 | 20分 | 並列実行・シナリオ見直し |
| CI全体 | 30分 | パイプライン最適化 |

---

## 5. テスト環境

| 環境 | 用途 | DB | 構成 |
|------|------|-----|------|
| ローカル | 開発者テスト | SQLite / PostgreSQL（Docker） | docker-compose.test.yml |
| CI | 自動テスト | PostgreSQL 16（コンテナ） | GitHub Actions |
| ステージング | 統合・E2E | PostgreSQL 16 | Docker Compose |
| 本番相当 | リリース前検証 | PostgreSQL 16 | Docker Compose（本番構成） |

---

## 6. テストデータ管理

### 6.1 方針

- テストデータは**factory-boy**および**faker**で動的生成する
- 固定データが必要な場合は`tests/fixtures/`に配置
- テスト間のデータ依存を排除（各テストは独立実行可能）
- DBテストはトランザクションロールバックで隔離

### 6.2 テストデータカテゴリ

| カテゴリ | 管理方法 | 例 |
|---------|---------|-----|
| マスターデータ | fixtures（YAML/JSON） | 権限マスタ、設定マスタ |
| トランザクションデータ | factory-boy | ユーザー、デバイス、ログ |
| 境界値データ | パラメータ化テスト | 文字数上限、日付境界 |
| 異常データ | 明示的定義 | NULL、空文字、SQL injection |

---

## 7. テスト命名規約

### バックエンド（pytest）

```
test_<対象>_<条件>_<期待結果>

例:
test_create_user_with_valid_data_returns_201
test_login_with_invalid_password_returns_401
test_get_devices_without_auth_returns_403
```

### フロントエンド（Vitest）

```
describe('<コンポーネント名>', () => {
  it('should <期待動作> when <条件>', () => { ... })
})

例:
describe('LoginForm', () => {
  it('should show error message when credentials are invalid', () => { ... })
})
```

---

## 8. テスト実行コマンド

```bash
# バックエンド - 単体テスト
pytest tests/unit/ -v --cov=app --cov-report=html

# バックエンド - 統合テスト
pytest tests/integration/ -v --cov=app

# バックエンド - 全テスト
pytest --cov=app --cov-report=term-missing --cov-fail-under=80

# フロントエンド - 単体テスト
npx vitest run --coverage

# フロントエンド - ウォッチモード
npx vitest

# E2Eテスト
npx playwright test

# E2Eテスト（UIモード）
npx playwright test --ui
```

---

## 9. CI/CDパイプラインとの統合

```yaml
# テスト実行フロー（GitHub Actions）
on: [push, pull_request]

jobs:
  backend-test:
    - lint (ruff, mypy)
    - unit-test (pytest tests/unit/)
    - integration-test (pytest tests/integration/)
    - coverage-check (--cov-fail-under=80)

  frontend-test:
    - lint (eslint, prettier)
    - unit-test (vitest)
    - coverage-check

  e2e-test:
    needs: [backend-test, frontend-test]
    - playwright test (critical paths)

  security:
    - bandit (python)
    - npm audit (node)
```

---

## 10. チェックリスト

### テスト戦略レビューチェック

- [ ] テストピラミッドの比率が適切か
- [ ] カバレッジ目標が現実的か（80%）
- [ ] テストツールの選定が技術スタックに合致しているか
- [ ] CI/CDとの統合が設計されているか
- [ ] テストデータ管理方針が明確か
- [ ] IAMS移行テストが計画に含まれているか
- [ ] パフォーマンス・セキュリティテストが計画されているか
- [ ] テスト環境が定義されているか
- [ ] テスト実行時間の基準が設定されているか
- [ ] 品質ゲートの閾値が設定されているか
