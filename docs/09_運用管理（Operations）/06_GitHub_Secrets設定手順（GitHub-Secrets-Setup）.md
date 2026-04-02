# GitHub Secrets 設定手順（Production / Staging）

| 項目 | 内容 |
|------|------|
| 文書ID | AEGIS-OPS-006 |
| バージョン | 1.0 |
| 作成日 | 2026-04-02 |
| ステータス | Draft |
| 対象 | AEGIS-SIGHT 本番・ステージング環境デプロイ |

---

## 1. 概要

本手順書は、AEGIS-SIGHT の GitHub Actions デプロイパイプライン（`.github/workflows/deploy-prod.yml`）が必要とする GitHub Secrets の登録手順を説明する。

---

## 2. 必要な Secrets 一覧

### 2.1 本番環境（Production）

| Secret 名 | 説明 | 例 | 必須 |
|-----------|------|-----|------|
| `PROD_DATABASE_URL` | 本番 PostgreSQL 接続 URL | `postgresql://aegis:pass@db.host:5432/aegis_sight` | ✅ |
| `PROD_SSH_HOST` | 本番サーバーのIPアドレスまたはホスト名 | `10.0.1.100` | ✅ |
| `PROD_SSH_USER` | 本番サーバーの SSH ユーザー | `deploy` | ✅ |
| `PROD_SSH_KEY` | 本番サーバーへの SSH 秘密鍵（PEM 形式） | `-----BEGIN...` | ✅ |
| `PROD_SECRET_KEY` | FastAPI の JWT シークレットキー（64文字以上） | `openssl rand -hex 32` で生成 | ✅ |
| `PROD_GRAFANA_ADMIN_PASSWORD` | Grafana 管理者パスワード | - | 任意 |

### 2.2 ステージング環境（Staging）

| Secret 名 | 説明 | 必須 |
|-----------|------|------|
| `STAGING_DATABASE_URL` | ステージング PostgreSQL 接続 URL | ✅ |
| `STAGING_SSH_HOST` | ステージングサーバーのIPアドレス | ✅ |
| `STAGING_SSH_USER` | SSH ユーザー | ✅ |
| `STAGING_SSH_KEY` | SSH 秘密鍵（PEM 形式） | ✅ |
| `STAGING_SECRET_KEY` | FastAPI の JWT シークレットキー | ✅ |

---

## 3. GitHub Secrets 登録手順

### 3.1 GUI から登録

1. GitHub リポジトリ [AEGIS-SIGHT](https://github.com/Kensan196948G/AEGIS-SIGHT) を開く
2. **Settings** タブを選択
3. 左メニューから **Secrets and variables** → **Actions** を選択
4. **New repository secret** ボタンをクリック
5. Secret 名と値を入力して **Add secret** をクリック

### 3.2 GitHub CLI から登録

```bash
# 事前に gh auth login が必要
REPO="Kensan196948G/AEGIS-SIGHT"

# 本番 DB URL
gh secret set PROD_DATABASE_URL \
  --repo "$REPO" \
  --body "postgresql://aegis:YOUR_PASSWORD@YOUR_DB_HOST:5432/aegis_sight"

# 本番サーバー SSH ホスト
gh secret set PROD_SSH_HOST \
  --repo "$REPO" \
  --body "YOUR_SERVER_IP"

# 本番サーバー SSH ユーザー
gh secret set PROD_SSH_USER \
  --repo "$REPO" \
  --body "deploy"

# 本番サーバー SSH 秘密鍵（ファイルから読み込み）
gh secret set PROD_SSH_KEY \
  --repo "$REPO" \
  < ~/.ssh/aegis_deploy_key

# JWT シークレットキー生成・登録
SECRET_KEY=$(openssl rand -hex 32)
gh secret set PROD_SECRET_KEY \
  --repo "$REPO" \
  --body "$SECRET_KEY"
echo "Generated SECRET_KEY: $SECRET_KEY (save securely)"
```

---

## 4. SSH デプロイキーの生成

### 4.1 キー生成

```bash
# デプロイ用 SSH キーペアを生成
ssh-keygen -t ed25519 -f ~/.ssh/aegis_deploy_key -N "" -C "aegis-sight-deploy"

# 公開鍵を確認
cat ~/.ssh/aegis_deploy_key.pub
```

### 4.2 サーバーへの公開鍵登録

```bash
# 本番サーバーへ公開鍵を追加
ssh-copy-id -i ~/.ssh/aegis_deploy_key.pub deploy@YOUR_SERVER_IP

# または手動で
ssh deploy@YOUR_SERVER_IP
echo "$(cat ~/.ssh/aegis_deploy_key.pub)" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4.3 GitHub Secrets への秘密鍵登録

```bash
# 秘密鍵を GitHub Secrets に登録
gh secret set PROD_SSH_KEY \
  --repo "Kensan196948G/AEGIS-SIGHT" \
  < ~/.ssh/aegis_deploy_key
```

---

## 5. PostgreSQL 本番設定

### 5.1 本番DB設定例

```bash
# PostgreSQL 接続 URL の形式
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# 例（Docker Compose 環境）
PROD_DATABASE_URL="postgresql://aegis_user:StrongPassword123@localhost:5432/aegis_sight_prod"

# 例（外部 RDS）
PROD_DATABASE_URL="postgresql://aegis_user:StrongPassword123@aegis-db.xxxx.rds.amazonaws.com:5432/aegis_sight"
```

### 5.2 本番DBユーザー作成

```sql
-- PostgreSQL 管理者権限で実行
CREATE USER aegis_user WITH PASSWORD 'StrongPassword123';
CREATE DATABASE aegis_sight_prod OWNER aegis_user;
GRANT ALL PRIVILEGES ON DATABASE aegis_sight_prod TO aegis_user;
```

---

## 6. デプロイ設定の確認

### 6.1 deploy-prod.yml の設定確認

```yaml
# .github/workflows/deploy-prod.yml の設定箇所
env:
  PROD_SSH_HOST: ${{ secrets.PROD_SSH_HOST }}
  PROD_SSH_USER: ${{ secrets.PROD_SSH_USER }}
  DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
  SECRET_KEY: ${{ secrets.PROD_SECRET_KEY }}
```

### 6.2 Secrets 登録確認

```bash
# 登録済み Secrets 一覧（値は表示されない）
gh secret list --repo "Kensan196948G/AEGIS-SIGHT"
```

---

## 7. セキュリティ注意事項

| 注意事項 | 詳細 |
|---------|------|
| シークレットの定期ローテーション | 最低6ヶ月に1回変更 |
| SSH キーの適切な権限 | `chmod 600 ~/.ssh/aegis_deploy_key` |
| パスワードの強度 | 最低16文字、大文字・小文字・数字・記号を含む |
| DB パスワードの共有禁止 | 1 Secret = 1 人が原則 |
| ログへの Secret 出力禁止 | `echo $SECRET_KEY` 等の実行禁止 |
| Dependabot Secrets | Dependabot 用に別途 Secrets 設定が必要な場合あり |

---

## 8. トラブルシューティング

### 8.1 よくあるエラー

| エラー | 原因 | 対処 |
|--------|------|------|
| `Host key verification failed` | known_hosts 未登録 | `ssh-keyscan -H $HOST >> ~/.ssh/known_hosts` |
| `Permission denied (publickey)` | 公開鍵未登録またはキー不一致 | 4.2 を再実行 |
| `could not connect to server` | DB URL 誤りまたはファイアウォール | DB URL と接続確認 |
| `invalid secret key` | SECRET_KEY が短い | `openssl rand -hex 32` で再生成（64文字） |

### 8.2 デプロイ前チェック

```bash
# Secrets がすべて登録されているか確認
REQUIRED_SECRETS=(
  "PROD_DATABASE_URL"
  "PROD_SSH_HOST"
  "PROD_SSH_USER"
  "PROD_SSH_KEY"
  "PROD_SECRET_KEY"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list --repo "Kensan196948G/AEGIS-SIGHT" | grep -q "$secret"; then
    echo "✅ $secret"
  else
    echo "❌ $secret (未登録)"
  fi
done
```

---

## 9. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `.github/workflows/deploy-prod.yml` | 本番デプロイワークフロー |
| `docker-compose.yml` | ローカル開発環境 |
| `aegis-sight-api/.env.example` | 環境変数テンプレート |
| `docs/09_運用管理（Operations）/01_運用設計書.md` | 運用設計書 |
