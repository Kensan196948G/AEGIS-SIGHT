# 02 コーディング規約（Coding Standards）

## 1. 概要

AEGIS-SIGHT プロジェクトにおけるコーディング規約を定義する。
コードの一貫性・可読性・保守性を確保し、レビュー効率を向上させることを目的とする。

---

## 2. Python（Backend）

### 2.1 基本方針

- **PEP 8** 準拠
- **ruff** による自動 Lint / Format を必須とする
- 型ヒント（Type Hints）を全ての関数・メソッドに付与する

### 2.2 ruff 設定

`pyproject.toml` に以下の設定を適用する:

```toml
[tool.ruff]
target-version = "py312"
line-length = 120

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "N",    # pep8-naming
    "UP",   # pyupgrade
    "B",    # flake8-bugbear
    "S",    # flake8-bandit (security)
    "A",    # flake8-builtins
    "C4",   # flake8-comprehensions
    "T20",  # flake8-print
    "SIM",  # flake8-simplify
    "RUF",  # ruff-specific rules
]

[tool.ruff.lint.isort]
known-first-party = ["app"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### 2.3 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| モジュール | snake_case | `user_service.py` |
| クラス | PascalCase | `UserService` |
| 関数・メソッド | snake_case | `get_user_by_id()` |
| 変数 | snake_case | `user_count` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| プライベート | 先頭アンダースコア | `_internal_method()` |

### 2.4 型ヒント

```python
# 良い例
def get_user_by_id(user_id: int) -> User | None:
    ...

async def list_users(
    skip: int = 0,
    limit: int = 100,
) -> list[User]:
    ...

# 悪い例（型ヒントなし）
def get_user_by_id(user_id):
    ...
```

### 2.5 FastAPI 固有の規約

```python
# ルーター定義
router = APIRouter(prefix="/users", tags=["users"])

# エンドポイント: レスポンスモデルを必ず指定
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """ユーザー情報を取得する。"""
    ...
```

### 2.6 SQLAlchemy モデル規約

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
```

### 2.7 テストコード規約（pytest）

```python
# ファイル名: test_<対象モジュール>.py
# クラス名: Test<対象クラス>
# メソッド名: test_<テスト内容>

class TestUserService:
    async def test_get_user_by_id_returns_user(self, db_session):
        """存在するユーザーIDを指定した場合、ユーザーオブジェクトを返す。"""
        user = await user_service.get_user_by_id(db_session, user_id=1)
        assert user is not None
        assert user.id == 1

    async def test_get_user_by_id_returns_none_for_nonexistent(self, db_session):
        """存在しないユーザーIDを指定した場合、Noneを返す。"""
        user = await user_service.get_user_by_id(db_session, user_id=9999)
        assert user is None
```

### 2.8 docstring 規約

Google スタイルの docstring を採用する:

```python
def calculate_risk_score(
    asset_id: int,
    vulnerability_data: list[VulnerabilityData],
) -> float:
    """資産のリスクスコアを算出する。

    CVSS スコアと資産の重要度を考慮してリスクスコアを計算する。

    Args:
        asset_id: 対象資産のID。
        vulnerability_data: 脆弱性データのリスト。

    Returns:
        0.0 - 10.0 の範囲のリスクスコア。

    Raises:
        AssetNotFoundError: 指定された資産が存在しない場合。
    """
    ...
```

---

## 3. TypeScript（Frontend）

### 3.1 基本方針

- **ESLint** + **Prettier** による自動 Lint / Format を必須とする
- **strict モード** を有効にする
- `any` 型の使用を原則禁止する

### 3.2 ESLint 設定

```json
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript",
    "plugin:@typescript-eslint/strict-type-checked",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ]
  }
}
```

### 3.3 Prettier 設定

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

### 3.4 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル（コンポーネント） | PascalCase | `UserProfile.tsx` |
| ファイル（ユーティリティ） | camelCase | `formatDate.ts` |
| コンポーネント | PascalCase | `UserProfile` |
| 関数 | camelCase | `getUserById()` |
| 変数 | camelCase | `userName` |
| 定数 | UPPER_SNAKE_CASE | `API_BASE_URL` |
| 型・インターフェース | PascalCase | `UserResponse` |
| enum | PascalCase（メンバーも） | `UserRole.Admin` |

### 3.5 コンポーネント規約

```tsx
// Props は type で定義（interface も可）
type UserCardProps = {
  user: User;
  onEdit: (userId: number) => void;
};

// 関数コンポーネント（export default 禁止、named export を使用）
export function UserCard({ user, onEdit }: UserCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-bold">{user.name}</h3>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
}
```

### 3.6 Tailwind CSS 規約

- ユーティリティクラスの順序は Tailwind CSS の推奨順に従う（`prettier-plugin-tailwindcss` で自動整列）
- 共通スタイルは `@apply` でコンポーネントクラスに抽出する
- マジックナンバーの使用を避け、`tailwind.config.ts` の `theme.extend` でカスタム値を定義する

```tsx
// 良い例: Tailwind のクラスを使用
<div className="flex items-center gap-4 rounded-lg bg-white p-6 shadow-md">

// 悪い例: インラインスタイル
<div style={{ display: "flex", padding: "24px" }}>
```

### 3.7 テストコード規約（Vitest）

```typescript
// ファイル名: <対象>.test.ts / <対象>.test.tsx
describe("UserCard", () => {
  it("ユーザー名を表示する", () => {
    render(<UserCard user={mockUser} onEdit={vi.fn()} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("編集ボタンクリック時にonEditが呼ばれる", async () => {
    const onEdit = vi.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    await userEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(mockUser.id);
  });
});
```

### 3.8 E2E テスト規約（Playwright）

```typescript
// ファイル名: <機能>.spec.ts
test.describe("ユーザー管理", () => {
  test("ユーザー一覧が表示される", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "ユーザー一覧" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
```

---

## 4. PowerShell（Agent）

### 4.1 基本方針

- **PSScriptAnalyzer** による静的解析を適用する
- **Pester** によるテストを必須とする
- `Set-StrictMode -Version Latest` を全スクリプト先頭に記述する

### 4.2 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| 関数 | Verb-Noun（承認済み動詞） | `Get-AssetInventory` |
| パラメータ | PascalCase | `$ComputerName` |
| ローカル変数 | camelCase | `$assetList` |
| 定数 | UPPER_SNAKE_CASE | `$MAX_RETRY` |
| ファイル | PascalCase | `Get-AssetInventory.ps1` |
| モジュール | PascalCase | `AegisSight.Agent.psm1` |

### 4.3 関数テンプレート

```powershell
function Get-AssetInventory {
    <#
    .SYNOPSIS
        資産インベントリ情報を取得する。

    .DESCRIPTION
        指定されたコンピュータから資産インベントリ情報を収集し、
        構造化データとして返却する。

    .PARAMETER ComputerName
        対象コンピュータのホスト名またはIPアドレス。

    .PARAMETER Credential
        リモート接続用の資格情報。

    .EXAMPLE
        Get-AssetInventory -ComputerName "server01"

    .OUTPUTS
        PSCustomObject - 資産情報オブジェクト
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ComputerName,

        [Parameter()]
        [PSCredential]$Credential
    )

    Set-StrictMode -Version Latest
    $ErrorActionPreference = "Stop"

    try {
        # 処理ロジック
    }
    catch {
        Write-Error "資産情報の取得に失敗しました: $_"
        throw
    }
}
```

### 4.4 エラーハンドリング

```powershell
# try/catch/finally パターンを必ず使用
try {
    $result = Invoke-RestMethod -Uri $apiUrl -Method Get
}
catch [System.Net.WebException] {
    Write-Error "API接続に失敗しました: $($_.Exception.Message)"
    throw
}
catch {
    Write-Error "予期しないエラーが発生しました: $_"
    throw
}
finally {
    # クリーンアップ処理
}
```

### 4.5 Pester テスト規約

```powershell
Describe "Get-AssetInventory" {
    BeforeAll {
        . $PSScriptRoot/../src/Get-AssetInventory.ps1
    }

    Context "正常系" {
        It "資産情報オブジェクトを返す" {
            $result = Get-AssetInventory -ComputerName "localhost"
            $result | Should -Not -BeNullOrEmpty
            $result.ComputerName | Should -Be "localhost"
        }
    }

    Context "異常系" {
        It "接続不可のホストでエラーを返す" {
            { Get-AssetInventory -ComputerName "unreachable" } |
                Should -Throw
        }
    }
}
```

---

## 5. 共通規約

### 5.1 コメント

- コメントは「なぜ」を説明する。「何を」はコード自体が語るべき
- TODO コメントには Issue 番号を付与する: `# TODO(#123): キャッシュ戦略を実装`
- 不要なコメントアウトコードは残さない

### 5.2 ログ出力

| レベル | 用途 |
|--------|------|
| DEBUG | 開発・デバッグ用詳細情報 |
| INFO | 正常処理の要所（起動、完了など） |
| WARNING | 処理は継続できるが注意が必要な状況 |
| ERROR | 処理が失敗した場合（リカバリ可能） |
| CRITICAL | システム停止レベルの重大エラー |

### 5.3 セキュリティ

- シークレット情報をコードにハードコードしない
- 環境変数または Secret Manager を利用する
- SQL インジェクション対策としてパラメータバインディングを必ず使用する
- ユーザー入力は必ずバリデーションする

### 5.4 ファイル構成

```
backend/
  app/
    api/           # APIエンドポイント（ルーター）
    core/          # 設定、セキュリティ、依存性注入
    models/        # SQLAlchemy モデル
    schemas/       # Pydantic スキーマ
    services/      # ビジネスロジック
    tasks/         # Celery タスク
  tests/
  alembic/

frontend/
  src/
    app/           # Next.js App Router ページ
    components/    # 共通コンポーネント
    features/      # 機能別モジュール
    hooks/         # カスタムフック
    lib/           # ユーティリティ、API クライアント
    types/         # 型定義
  tests/
    e2e/           # Playwright E2E テスト

agent/
  src/             # PowerShell スクリプト
  tests/           # Pester テスト
```
