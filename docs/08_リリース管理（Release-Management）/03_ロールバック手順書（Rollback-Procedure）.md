# ロールバック手順書（Rollback Procedure）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| ステータス | Draft |
| 目標復旧時間 | 30分以内 |

---

## 1. ロールバック方針

デプロイ後に重大な問題が発生した場合、迅速にシステムを前バージョンに戻す。ロールバックは**30分以内**に完了することを目標とする。

### 1.1 ロールバック判断基準

| レベル | 状況 | 判断 | 判断者 |
|--------|------|------|--------|
| Critical | サービス停止、データ損失の恐れ | 即座にロールバック | インフラ担当（事後報告） |
| High | 主要機能が利用不可 | 30分以内に判断 | テックリード |
| Medium | 一部機能の不具合 | ホットフィックスを優先検討 | テックリード |
| Low | 軽微なUI不具合等 | ホットフィックスで対応 | 開発リーダー |

---

## 2. ロールバック種別

| 種別 | 説明 | 所要時間 | リスク |
|------|------|---------|--------|
| アプリケーションロールバック | Dockerイメージを前バージョンに戻す | 5-10分 | 低 |
| DBマイグレーションロールバック | DBスキーマを前バージョンに戻す | 10-20分 | 中 |
| 完全ロールバック | アプリ + DB + データ復旧 | 20-30分 | 高 |

---

## 3. アプリケーションロールバック手順

DBスキーマ変更がない場合、または後方互換性のあるスキーマ変更の場合に使用する。

### 手順

```bash
# ステップ1: デプロイサーバーに接続
ssh deploy@aegis-sight.internal
cd /opt/aegis-sight

# ステップ2: 現在のバージョンを記録
echo "ロールバック開始: $(date)" >> /var/log/aegis-sight/rollback.log
echo "現在バージョン: $(git describe --tags)" >> /var/log/aegis-sight/rollback.log

# ステップ3: 前バージョンのタグに切り替え
git checkout v{前バージョン}
# 例: git checkout v1.0.0（v1.1.0からのロールバック）

# ステップ4: 前バージョンのイメージでサービス再起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# ステップ5: ヘルスチェック
curl -s http://localhost:8000/api/v1/health | jq .
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# ステップ6: 全コンテナ状態確認
docker compose ps

# ステップ7: ログ確認（エラーがないこと）
docker compose logs --tail=50 backend | grep -i error
docker compose logs --tail=50 frontend | grep -i error

# ステップ8: ロールバック完了記録
echo "ロールバック完了: $(date) → $(git describe --tags)" >> /var/log/aegis-sight/rollback.log
```

---

## 4. DBマイグレーションロールバック手順

DBスキーマ変更を含むリリースのロールバックに使用する。

### 手順

```bash
# ステップ1: デプロイサーバーに接続
ssh deploy@aegis-sight.internal
cd /opt/aegis-sight

# ステップ2: 現在のマイグレーション状態を確認
docker compose exec backend alembic current
docker compose exec backend alembic history --verbose | head -20

# ステップ3: ロールバック先のリビジョンを特定
# リリース前のリビジョンIDを確認
docker compose exec backend alembic history | grep "前バージョンのリビジョン"

# ステップ4: アプリケーションを停止（DB操作中の安全確保）
docker compose stop backend frontend

# ステップ5: データベースバックアップ（ロールバック前の状態を保存）
docker compose exec db pg_dump -U aegis_user aegis_sight_db \
  | gzip > /opt/backups/pre_rollback_$(date +%Y%m%d_%H%M%S).sql.gz

# ステップ6: マイグレーションダウングレード
docker compose exec backend alembic downgrade <target_revision>
# 例: docker compose exec backend alembic downgrade abc123def456

# ステップ7: マイグレーション状態確認
docker compose exec backend alembic current
# 期待: ロールバック先のリビジョンが表示される

# ステップ8: 前バージョンのコードに切り替え
git checkout v{前バージョン}

# ステップ9: アプリケーション再起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# ステップ10: ヘルスチェック
curl -s http://localhost:8000/api/v1/health/ready | jq .
```

---

## 5. 完全ロールバック手順（データ復旧含む）

データ破損が発生した場合の最終手段。バックアップからのデータ復旧を含む。

### 手順

```bash
# ステップ1: 全サービスを停止
docker compose down

# ステップ2: 前バージョンのコードに切り替え
git checkout v{前バージョン}

# ステップ3: 現在のDBデータを退避
docker volume create aegis_sight_db_backup
docker run --rm \
  -v aegis-sight_postgres_data:/source \
  -v aegis_sight_db_backup:/backup \
  alpine cp -a /source/. /backup/

# ステップ4: DBデータボリュームを削除
docker volume rm aegis-sight_postgres_data

# ステップ5: サービスを起動（空のDB）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d db
# DBの起動を待機
sleep 10
docker compose exec db pg_isready -U aegis_user

# ステップ6: バックアップからデータ復旧
BACKUP_FILE=$(ls -t /opt/backups/aegis_sight_*.sql.gz | head -1)
echo "復旧ファイル: ${BACKUP_FILE}"
gunzip -c ${BACKUP_FILE} | docker compose exec -T db psql -U aegis_user aegis_sight_db

# ステップ7: データ復旧確認
docker compose exec db psql -U aegis_user aegis_sight_db \
  -c "SELECT count(*) FROM users;"

# ステップ8: 全サービス起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# ステップ9: 全ヘルスチェック
curl -s http://localhost:8000/api/v1/health/ready | jq .
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# ステップ10: データ整合性確認
docker compose exec db psql -U aegis_user aegis_sight_db -c "
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;"
```

---

## 6. ロールバック後の作業

### 6.1 即時対応

| # | 作業 | 担当 | 期限 |
|---|------|------|------|
| 1 | 関係者への通知（ロールバック完了） | インフラ担当 | ロールバック直後 |
| 2 | インシデントチケット作成 | テックリード | 1時間以内 |
| 3 | 監視強化（アラート閾値下げ） | インフラ担当 | ロールバック直後 |
| 4 | 原因調査開始 | 開発チーム | ロールバック直後 |

### 6.2 事後対応

| # | 作業 | 担当 | 期限 |
|---|------|------|------|
| 1 | 根本原因分析（RCA） | テックリード | 3営業日以内 |
| 2 | 再発防止策の策定 | 開発チーム | 5営業日以内 |
| 3 | テスト追加（検出漏れ防止） | QA | 次リリース前 |
| 4 | ポストモーテム実施 | 全チーム | 1週間以内 |
| 5 | 手順書の更新（必要時） | テックリード | 2週間以内 |

---

## 7. ロールバックテスト

### 7.1 定期テスト計画

| テスト | 頻度 | 内容 |
|--------|------|------|
| アプリロールバック訓練 | 四半期ごと | ステージング環境でロールバック手順を実行 |
| DBロールバック訓練 | 半期ごと | ステージング環境でマイグレーションダウングレード |
| 完全復旧訓練 | 年1回 | バックアップからの完全復旧手順を実行 |

### 7.2 ロールバックテスト手順（ステージング）

```bash
# 1. ステージング環境で最新バージョンをデプロイ
# 2. テストデータを投入
# 3. ロールバック手順を実行
# 4. データ整合性を確認
# 5. 所要時間を計測・記録
# 6. 問題点があれば手順を改善
```

---

## 8. マイグレーションバージョン管理

### 8.1 バージョンとマイグレーションの対応表

| アプリバージョン | マイグレーションリビジョン | 変更内容 |
|----------------|------------------------|---------|
| v0.1.0 | abc123def456 | 初期スキーマ作成 |
| v0.2.0 | bcd234efg567 | デバイステーブル追加 |
| v0.3.0 | cde345fgh678 | IAMS資産テーブル追加 |
| ... | ... | ... |

この表はリリースごとに更新する。ロールバック時にターゲットリビジョンを迅速に特定するため。

---

## 9. チェックリスト

### ロールバック実行前チェック

- [ ] ロールバック判断が適切か（判断者が承認済みか）
- [ ] ロールバック先バージョンが特定されているか
- [ ] 現在のDBバックアップが取得済みか
- [ ] ロールバック種別が決定されているか（アプリ/DB/完全）
- [ ] 関係者に通知済みか
- [ ] ロールバック手順を確認したか

### ロールバック実行後チェック

- [ ] 全サービスが正常起動しているか
- [ ] ヘルスチェックが全てパスしているか
- [ ] 前バージョンの動作が正常か
- [ ] データ整合性に問題がないか
- [ ] エラーログが出力されていないか
- [ ] ロールバック完了を関係者に通知したか
- [ ] インシデントチケットを作成したか
- [ ] 監視を強化したか
