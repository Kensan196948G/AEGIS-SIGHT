<div align="center">

<!-- ===== プロジェクトロゴ代替：テキストバナー ===== -->

```
 █████╗ ███████╗ ██████╗ ██╗███████╗      ███████╗██╗ ██████╗ ██╗  ██╗████████╗
██╔══██╗██╔════╝██╔════╝ ██║██╔════╝      ██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝
███████║█████╗  ██║  ███╗██║███████╗█████╗███████╗██║██║  ███╗███████║   ██║   
██╔══██║██╔══╝  ██║   ██║██║╚════██║╚════╝╚════██║██║██║   ██║██╔══██║   ██║   
██║  ██║███████╗╚██████╔╝██║███████║      ███████║██║╚██████╔╝██║  ██║   ██║   
╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝      ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝  
```

### 🛡️ Autonomous Endpoint Governance & Integrated Sight

**エンタープライズ向け 自律型エンドポイント統合管理システム**

> SKYSEA Client View 同等の機能を ClaudeCode により内製化した  
> IT 資産管理・操作ログ収集・セキュリティ監視・統合ダッシュボード

<br/>

<!-- ===== バッジ行 1：技術スタック ===== -->
![Version](https://img.shields.io/badge/version-1.0.0-1A3A5C?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell-7.4-5391FE?style=for-the-badge&logo=powershell&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-27-2496ED?style=for-the-badge&logo=docker&logoColor=white)

<!-- ===== バッジ行 2：品質・コンプライアンス ===== -->
![Coverage](https://img.shields.io/badge/Coverage-80%25%2B-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)
![ISO 27001](https://img.shields.io/badge/ISO%2027001-Compliant-1A7A4A?style=for-the-badge)
![J-SOX](https://img.shields.io/badge/J--SOX-Compliant-1A7A4A?style=for-the-badge)
![NIST CSF](https://img.shields.io/badge/NIST%20CSF%202.0-Aligned-003087?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-AA0000?style=for-the-badge)

<!-- ===== バッジ行 3：CI/CD ステータス（your-org を実際の組織名に変更） ===== -->
[![CI API](https://img.shields.io/github/actions/workflow/status/your-org/aegis-sight-api/ci-api.yml?label=CI%3AAPI&logo=github&style=flat-square)](https://github.com/your-org/aegis-sight-api/actions)
[![CI Web](https://img.shields.io/github/actions/workflow/status/your-org/aegis-sight-web/ci-web.yml?label=CI%3AWeb&logo=github&style=flat-square)](https://github.com/your-org/aegis-sight-web/actions)
[![CI Agent](https://img.shields.io/github/actions/workflow/status/your-org/aegis-sight-agent/ci-agent.yml?label=CI%3AAgent&logo=powershell&style=flat-square)](https://github.com/your-org/aegis-sight-agent/actions)
[![Security](https://img.shields.io/github/actions/workflow/status/your-org/aegis-sight-api/security-scan.yml?label=Security&logo=github&style=flat-square)](https://github.com/your-org/aegis-sight-api/actions)

</div>

---

## 📋 目次

- [🎯 プロジェクト概要](#-プロジェクト概要-1)
- [✨ 主要機能](#-主要機能)
- [🏗️ システムアーキテクチャ](#️-システムアーキテクチャ)
- [📡 通信フロー](#-通信フロー)
- [🗄️ データベース設計](#️-データベース設計)
- [🔐 セキュリティ設計](#-セキュリティ設計)
- [📁 リポジトリ構成](#-リポジトリ構成)
- [🚀 クイックスタート](#-クイックスタート)
- [⚙️ 開発環境セットアップ](#️-開発環境セットアップ)
- [🤖 ClaudeCode 自律開発構成](#-claudecode-自律開発構成)
- [🔄 CI/CD パイプライン](#-cicd-パイプライン)
- [📊 収集データ仕様](#-収集データ仕様)
- [📜 コンプライアンス対応](#-コンプライアンス対応)
- [🗺️ 開発フェーズ計画](#️-開発フェーズ計画)
- [📚 ドキュメント](#-ドキュメント)

---

## 🎯 プロジェクト概要

| 項目 | 内容 |
|:---|:---|
| 🏷️ **プロジェクト名** | AEGIS-SIGHT |
| 📝 **フルネーム** | Autonomous Endpoint Governance & Integrated Sight |
| 🏢 **対象組織規模** | 約 550 名（エンタープライズ）|
| 🖥️ **管理対象端末** | Windows 11 / 10 クライアント PC 約 500 台 + サーバ群 |
| 🌐 **環境** | 本社・支社・建設現場（拠点外）・テレワーク |
| 🛠️ **開発方式** | ClaudeCode 自律型コーディング（AI-Augmented Development）|
| 📅 **開発期間** | 20 週（5 フェーズ）|

### 💡 なぜ AEGIS-SIGHT を作るのか

```
商用製品（SKYSEA 等）の課題                AEGIS-SIGHT で解決
─────────────────────                ──────────────────────
💰 ライセンスコスト継続発生         →  内製化で 70%以上コスト削減
🔒 組織固有要件への対応困難         →  完全カスタマイズ可能
🔗 Microsoft 365 との統合不足       →  Graph API でネイティブ統合
📋 J-SOX 監査証跡の不完全さ         →  3年以上の証跡保全を保証
👷 IT 部門 5 名での運用限界         →  AI 自動化で工数 40%削減
```

---

## ✨ 主要機能

<table>
<tr>
<td width="50%">

### 🖥️ IT 資産管理
- **HW 情報自動収集** — CPU・メモリ・ディスク・シリアル番号
- **SW インベントリ** — インストール済みアプリ・バージョン管理
- **ライセンス管理** — SAM（ソフトウェア資産管理）対応
- **ネットワーク機器** — IP/MAC・SNMP 対応機器管理
- **収集精度** ◎ — WMI / Get-CimInstance で完全取得

</td>
<td width="50%">

### 📋 ログ管理
- **ログオン/ログオフ** — EventID 4624/4634 完全追跡
- **USB デバイス** — 接続・切断履歴（SetupAPI）
- **ファイル操作** — 重要フォルダ限定監査（EventID 4663）
- **プロセス監視** — 実行中アプリの定期スナップショット
- **保存期間** — 最低 3 年（J-SOX 対応）

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ セキュリティ監視
- **Defender 状態** — ON/OFF・パターン日付リアルタイム確認
- **BitLocker 状態** — 暗号化適用状況の一元管理
- **パッチ管理** — Windows Update 適用状況・未適用端末検出
- **未許可端末検知** — ネットワーク内の不正端末を自動検出
- **アラート通知** — メール / Webhook で即時通知

</td>
<td width="50%">

### 📊 統合ダッシュボード
- **リアルタイム可視化** — 500 台の状態をひと目で把握
- **柔軟なレポート** — PDF / Excel 出力対応
- **Entra ID SSO** — OIDC でシームレスな認証
- **RBAC** — 管理者・オペレータ・監査者・閲覧者の 4 ロール
- **監査ログ** — 全管理操作の証跡を永続保存

</td>
</tr>
</table>

---

## 🏗️ システムアーキテクチャ

```mermaid
graph TB
    subgraph CLIENT["🖥️ クライアント層（Windows エンドポイント）"]
        PC1["💻 社内 PC\nPowerShell Agent"]
        PC2["🏗️ 現場 PC（拠点外）\nOffline Buffer付き"]
        SV1["🖥️ Windows Server\nWMI / Event Log"]
    end

    subgraph TRANSPORT["🔐 通信層"]
        HTTPS["🔒 HTTPS (443)\nJWT 認証 / TLS 1.2+\nアウトバウンド型（VPN不要）"]
    end

    subgraph BACKEND["⚙️ バックエンド層（Docker Compose）"]
        API["🐍 FastAPI\n受信API / ビジネスロジック"]
        ALERT["🔔 アラートエンジン\nメール / Webhook"]
        REPORT["📊 レポートエンジン\nPDF / Excel生成"]
    end

    subgraph DATA["🗄️ データ層（Docker）"]
        PG[("🐘 PostgreSQL 16\nSupabase互換\nCMDB + ログDB")]
        REDIS[("⚡ Redis\nキャッシュ / セッション")]
    end

    subgraph FRONTEND["🌐 フロントエンド層（Docker）"]
        WEB["⚛️ Next.js 14\n管理ダッシュボード\nTypeScript + Tailwind"]
    end

    subgraph DOCKER["🐳 Docker Compose\n本番: docker-compose.prod.yml\n開発: docker-compose.dev.yml"]
        BACKEND
        DATA
        FRONTEND
    end

    subgraph MS365["☁️ Microsoft 365 統合"]
        ENTRA["🔷 Entra ID\nSSO / 条件付きアクセス"]
        INTUNE["📱 Intune\nデバイスコンプライアンス"]
        DEFENDER["🛡️ Defender for Endpoint\nEDR / 脅威インテリジェンス"]
    end

    subgraph CICD["🔄 CI/CD（GitHub Actions）"]
        GHA["🐙 GitHub Actions\nBuild / Test / Deploy"]
    end

    PC1 -->|"JSON ペイロード\n5〜30分間隔"| HTTPS
    PC2 -->|"オフライン蓄積後\n自動リトライ"| HTTPS
    SV1 --> HTTPS
    HTTPS --> API
    API --> PG
    API --> REDIS
    API --> ALERT
    API --> REPORT
    WEB --> API
    WEB --> ENTRA
    API --> ENTRA
    API --> INTUNE
    API --> DEFENDER
    GHA -->|"イメージビルド\n& デプロイ"| DOCKER

    style CLIENT fill:#E8F4FD,stroke:#2E6DA4
    style TRANSPORT fill:#FFF3E0,stroke:#FFA000
    style BACKEND fill:#E8F5E9,stroke:#2E7D32
    style DATA fill:#F3E5F5,stroke:#7B1FA2
    style FRONTEND fill:#FCE4EC,stroke:#C62828
    style DOCKER fill:#E1F5FE,stroke:#2496ED,stroke-width:3px
    style MS365 fill:#E3F2FD,stroke:#1565C0
    style CICD fill:#F1F8E9,stroke:#558B2F
```

---

## 📡 通信フロー

```mermaid
sequenceDiagram
    participant PC as 💻 クライアント PC<br/>(PowerShell Agent)
    participant BUF as 📦 ローカルバッファ<br/>(SQLite)
    participant API as ⚙️ FastAPI<br/>(受信サーバ)
    participant DB as 🐘 PostgreSQL
    participant ALERT as 🔔 アラートエンジン
    participant WEB as 🌐 管理ダッシュボード

    Note over PC: タスクスケジューラ起動（5分間隔）

    PC->>PC: WMI / EventLog 収集
    PC->>PC: JSON ペイロード生成

    alt 🟢 オンライン時
        PC->>API: POST /api/v1/telemetry<br/>JWT Bearer Token
        API->>API: JWT検証 + Pydanticスキーマ検証
        API->>DB: UPSERT（資産）+ INSERT（ログ）
        API->>ALERT: アラート判定呼び出し
        API-->>PC: 202 Accepted
        ALERT-->>WEB: リアルタイム通知
    else 🔴 オフライン時（建設現場等）
        PC->>BUF: JSON をローカル SQLite に保存
        Note over BUF: 最大7日・100MB保持
        BUF->>API: 復旧後 自動リトライ<br/>（指数バックオフ 30s/60s/120s）
    end

    WEB->>API: GET /api/v1/assets
    API->>DB: クエリ実行
    DB-->>API: 結果セット
    API-->>WEB: JSON レスポンス
```

---

## 🗄️ データベース設計

```mermaid
erDiagram
    devices {
        uuid device_id PK
        varchar hostname
        varchar os_version
        varchar ip_address
        varchar mac_address
        varchar domain
        varchar status
        timestamptz last_seen
        timestamptz created_at
    }

    hardware_snapshots {
        bigserial id PK
        uuid device_id FK
        varchar cpu_model
        int memory_gb
        int disk_total_gb
        int disk_free_gb
        varchar serial_number
        timestamptz snapped_at
    }

    logon_events {
        bigserial id PK
        uuid device_id FK
        varchar user_name
        int event_id
        smallint logon_type
        timestamptz occurred_at
    }

    usb_events {
        bigserial id PK
        uuid device_id FK
        varchar device_name
        varchar vendor_id
        varchar action
        timestamptz occurred_at
    }

    security_status {
        bigserial id PK
        uuid device_id FK
        boolean defender_on
        boolean bitlocker_on
        varchar pattern_date
        int pending_patches
        timestamptz checked_at
    }

    alerts {
        uuid alert_id PK
        uuid device_id FK
        varchar severity
        varchar message
        timestamptz fired_at
        timestamptz acked_at
    }

    devices ||--o{ hardware_snapshots : "has"
    devices ||--o{ logon_events : "records"
    devices ||--o{ usb_events : "records"
    devices ||--o{ security_status : "has"
    devices ||--o{ alerts : "triggers"
```

> 📌 `logon_events`・`usb_events`・`file_events` は月次パーティションで DB 肥大化を防止（3年保存対応）

---

## 🔐 セキュリティ設計

```mermaid
flowchart LR
    subgraph AGENT["💻 エージェント"]
        A1["デバイス証明書\n(Entra ID 登録)"]
    end

    subgraph GATEWAY["🔒 認証ゲートウェイ"]
        G1["JWT 発行\n(RS256 / 1時間)"]
        G2["mTLS 検証"]
        G3["OIDC\n(Entra ID)"]
    end

    subgraph RBAC["👥 RBAC"]
        R1["🔴 admin\n全機能"]
        R2["🟡 operator\n運用操作"]
        R3["🔵 auditor\nログ閲覧"]
        R4["⚪ readonly\n閲覧のみ"]
    end

    subgraph AUDIT["📋 監査証跡"]
        AU1["追記専用 DB\n改ざん不可"]
        AU2["ハッシュチェーン\n整合性保証"]
        AU3["3年以上保存\nJ-SOX 対応"]
    end

    A1 -->|"デバイス登録"| G1
    G1 -->|"API アクセス"| G2
    G3 -->|"管理者ログイン"| RBAC
    RBAC --> AUDIT

    style AGENT fill:#E3F2FD
    style GATEWAY fill:#FFF3E0
    style RBAC fill:#E8F5E9
    style AUDIT fill:#FCE4EC
```

| 対象 | 認証方式 | 詳細 |
|:---|:---|:---|
| 🤖 エージェント → API | JWT (RS256) | デバイス固有鍵ペアで署名・有効期間 1 時間 |
| 👤 管理者 → Web UI | OIDC (Entra ID) | MSAL.js / Authorization Code + PKCE |
| ⚙️ API 内部通信 | mTLS | 相互証明書認証 |
| 🔒 全通信 | TLS 1.2 以上 | HTTPS 強制（HTTP リダイレクト） |

---

## 📁 リポジトリ構成

```
📦 AEGIS-SIGHT（GitHub Organization）
├── 🤖 aegis-sight-agent        # Windows PowerShell エージェント
│   ├── src/
│   │   ├── Collect-Hardware.ps1
│   │   ├── Collect-Logs.ps1
│   │   ├── Collect-Security.ps1
│   │   ├── Send-Telemetry.ps1
│   │   └── AegisSightAgent.ps1  # エントリポイント
│   ├── tests/                   # Pester テスト
│   ├── install/                 # GPO 配布スクリプト
│   └── .github/workflows/
│
├── ⚙️ aegis-sight-api           # Python FastAPI バックエンド
│   ├── app/
│   │   ├── api/                 # エンドポイント (v1/)
│   │   ├── models/              # SQLAlchemy モデル
│   │   ├── schemas/             # Pydantic スキーマ
│   │   ├── services/            # ビジネスロジック
│   │   └── core/                # 設定・認証・DB
│   ├── tests/                   # pytest
│   ├── alembic/                 # DB マイグレーション
│   ├── Dockerfile               # 🐳 本番イメージ
│   ├── Dockerfile.dev           # 🐳 開発イメージ（ホットリロード）
│   └── .github/workflows/
│
├── 🌐 aegis-sight-web           # Next.js 管理ダッシュボード
│   ├── app/                     # App Router
│   │   ├── (dashboard)/
│   │   ├── assets/
│   │   ├── logs/
│   │   ├── security/
│   │   └── reports/
│   ├── components/              # shadcn/ui コンポーネント
│   ├── Dockerfile               # 🐳 本番イメージ（standalone）
│   ├── Dockerfile.dev           # 🐳 開発イメージ
│   └── .github/workflows/
│
├── 🏗️ aegis-sight-infra         # インフラ設定
│   ├── docker-compose.dev.yml   # 🐳 開発環境（全サービス）
│   ├── docker-compose.prod.yml  # 🐳 本番環境
│   ├── .env.example             # 環境変数テンプレート
│   ├── github-actions/          # 共通ワークフロー
│   ├── postgres/                # DB 初期化・マイグレーション
│   └── nginx/                   # リバースプロキシ設定
│
└── 📚 aegis-sight-docs          # 設計文書
    ├── AEGIS-SIGHT_要件定義書_v1.0.docx
    ├── AEGIS-SIGHT_詳細仕様書_v1.0.docx
    └── compliance/
```

---

## 🚀 クイックスタート

### 前提条件

| 項目 | 必須バージョン | 用途 |
|:---|:---|:---|
| 🐧 OS（開発） | Ubuntu 24.04 LTS | 開発・本番共通 |
| 🐳 Docker | 27 以上 | 全サービスのコンテナ管理 |
| 🐙 Docker Compose | v2.20 以上 | マルチコンテナ起動 |
| 🔵 PowerShell | 7.4 LTS 以上 | エージェント開発 |
| 🐙 Git | 2.40 以上 | バージョン管理 |

> 🐍 Python・📦 Node.js・🐘 PostgreSQL は **Docker コンテナ内で管理**するためホストへの個別インストール不要

---

### 🐳 Docker Compose で全サービス起動（推奨）

```bash
# 1️⃣ リポジトリのクローン
git clone https://github.com/your-org/aegis-sight-infra.git
cd aegis-sight-infra

# 2️⃣ 環境変数設定
cp .env.example .env
# .env を編集: POSTGRES_PASSWORD, JWT_SECRET_KEY, ENTRA_CLIENT_ID 等

# 3️⃣ 開発環境を一発起動 🚀
docker compose -f docker-compose.dev.yml up -d

# 4️⃣ DB マイグレーション
docker compose exec api alembic upgrade head
```

```
起動後のアクセス先:
  🌐 ダッシュボード  : http://localhost:3000
  📖 API Docs        : http://localhost:8000/api/docs
  🐘 PostgreSQL      : localhost:5432
  ⚡ Redis            : localhost:6379
```

---

### 📋 Docker Compose ファイル構成

```yaml
# docker-compose.dev.yml（開発用・ホットリロード有効）
services:
  api:                          # 🐍 FastAPI
    build: ./aegis-sight-api
    volumes:
      - ./aegis-sight-api:/app  # ホットリロード
    ports: ["8000:8000"]
    depends_on: [postgres, redis]
    environment:
      - DATABASE_URL=postgresql://aegis:${POSTGRES_PASSWORD}@postgres/aegisdb
      - REDIS_URL=redis://redis:6379

  web:                          # 🌐 Next.js
    build: ./aegis-sight-web
    volumes:
      - ./aegis-sight-web:/app  # ホットリロード
    ports: ["3000:3000"]
    depends_on: [api]

  postgres:                     # 🐘 PostgreSQL 16
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: aegisdb
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  redis:                        # ⚡ Redis
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

```yaml
# docker-compose.prod.yml（本番用・ヘルスチェック・再起動ポリシー付き）
services:
  api:
    image: ghcr.io/your-org/aegis-sight-api:${TAG}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      retries: 3

  web:
    image: ghcr.io/your-org/aegis-sight-web:${TAG}
    restart: unless-stopped

  nginx:                        # 🔀 リバースプロキシ
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./nginx/conf.d:/etc/nginx/conf.d:ro]
    depends_on: [api, web]

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
```

---

## ⚙️ 開発環境セットアップ

### 🐳 Docker インストール（Ubuntu 24.04 LTS）

```bash
# Docker Engine + Docker Compose v2 インストール
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # sudo なしで docker コマンドを使えるように
newgrp docker                    # グループ変更を即時反映

# バージョン確認
docker --version                 # Docker version 27.x.x
docker compose version           # Docker Compose version v2.x.x
```

```bash
# PowerShell 7 for Linux（エージェント開発用）
wget https://github.com/PowerShell/PowerShell/releases/download/v7.4.2/powershell_7.4.2-1.deb_amd64.deb
sudo dpkg -i powershell_7.4.2-1.deb_amd64.deb && rm *.deb

# ClaudeCode インストール
npm install -g @anthropic-ai/claude-code
```

### 🪟 Windows VM（エージェント動作確認用）

PowerShell エージェントは **WMI / Windows イベントログ** に依存するため、
以下の環境でのみ完全動作確認が可能です。

```
VM 構成:
  OS    : Windows 11 Pro 23H2
  PS    : PowerShell 7.4 LTS
  Test  : Pester フレームワーク
  接続  : ホストオンリー + NAT（開発 API サーバへ HTTPS 通信）

ポリシー:
  開発は Linux で実施 → WMI テストのみ Windows VM で実施
```

---

## 🤖 ClaudeCode 自律開発構成 — Agent Teams × Skills

AEGIS-SIGHT は **ClaudeCode Agent Teams + Skills** を最大活用した自律型開発を行います。  
tmux は使用せず、**ClaudeCode ネイティブの Agent Teams** が並列協調します。

---

### 🧠 全体アーキテクチャ

```mermaid
graph TD
    USER["👤 開発者\n1つの ClaudeCode セッション"] -->|"自然言語で指示"| LEAD

    subgraph AGENTTEAMS["🤝 Agent Teams（CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1）"]
        LEAD["🎯 Team Lead\n全体調整・タスク分解\n品質ゲート管理"]

        LEAD <-->|"直接メッセージ"| BE["⚙️ backend-agent\nFastAPI / DB設計"]
        LEAD <-->|"直接メッセージ"| FE["🌐 frontend-agent\nNext.js / UI"]
        LEAD <-->|"直接メッセージ"| PS["🤖 agent-dev\nPowerShell / WMI"]
        LEAD <-->|"直接メッセージ"| QA["🧪 qa-agent\npytest / Pester"]

        BE <-->|"型定義を共有"| FE
        BE <-->|"API仕様を共有"| QA
        PS <-->|"スキーマを共有"| BE
    end

    subgraph SKILLS["📚 Skills（自動ロード）"]
        S1["🐍 fastapi-patterns\nAPI設計ベストプラクティス"]
        S2["🔷 ps-agent-skill\nWMI収集・送信テンプレート"]
        S3["🛡️ security-review\nISO27001・J-SOX チェック"]
        S4["🧪 test-generator\npytest / Pester 自動生成"]
        S5["🗄️ db-migration\nAlembic マイグレーション"]
        S6["📋 compliance-check\nコンプライアンス自動検証"]
    end

    BE -.->|"自動ロード"| S1
    BE -.->|"自動ロード"| S5
    PS -.->|"自動ロード"| S2
    QA -.->|"自動ロード"| S4
    LEAD -.->|"自動ロード"| S3
    LEAD -.->|"自動ロード"| S6

    style AGENTTEAMS fill:#E8F5E9,stroke:#2E7D32
    style SKILLS fill:#E3F2FD,stroke:#1565C0
    style USER fill:#FFF3E0,stroke:#FFA000
```

---

### ⚙️ Agent Teams 有効化

```jsonc
// settings.json（プロジェクトルート直下 .claude/settings.json）
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> Agent Teams は ClaudeCode v2.1.32 以上が必要。`claude --version` で確認。

---

### 👥 エージェント定義（`.claude/agents/`）

各エージェントは `.claude/agents/` に Markdown ファイルとして定義。YAML frontmatter で名前・役割・使用ツールを宣言する。

```
.claude/
├── agents/
│   ├── backend-agent.md      # FastAPI / DB / ビジネスロジック専門
│   ├── frontend-agent.md     # Next.js / React / Tailwind 専門
│   ├── agent-dev.md          # PowerShell / WMI / エージェント開発専門
│   └── qa-agent.md           # pytest / Pester / セキュリティ監査専門
├── skills/                   # ↓ Skills 定義（次セクション）
└── CLAUDE.md                 # プロジェクト共通コンテキスト
```

**`backend-agent.md` の例：**

```markdown
---
name: backend-agent
description: >
  AEGIS-SIGHT の FastAPI バックエンド専門エージェント。
  API エンドポイント実装・DB 設計・Alembic マイグレーションを担当。
  frontend-agent から型定義の確認依頼が来たら即座に応答する。
tools: Read, Write, Edit, Bash, Grep, Glob
---

あなたは AEGIS-SIGHT の Python / FastAPI バックエンド専門家です。

## 担当ディレクトリ
- `aegis-sight-api/app/` 以下すべて

## 原則
- Pydantic v2 でスキーマを厳密に定義し、frontend-agent と共有する
- DB 変更は必ず Alembic マイグレーションを生成する
- 全エンドポイントに pytest テストを作成し qa-agent に通知する
- セキュリティ変更は /security-review スキルを必ず実行する
```

---

### 📚 Skills 定義（`.claude/skills/`）

Skills はディレクトリ + `SKILL.md` で構成。Claude がタスク内容から**自動ロード**し、スラッシュコマンドでも手動呼び出し可能。

```
.claude/
└── skills/
    ├── fastapi-patterns/
    │   └── SKILL.md          # FastAPI 設計・セキュリティパターン集
    ├── ps-agent-skill/
    │   ├── SKILL.md          # PowerShell エージェント開発ガイド
    │   └── templates/
    │       ├── Collect-Base.ps1     # 収集スクリプトテンプレート
    │       └── Send-Telemetry.ps1   # 送信スクリプトテンプレート
    ├── security-review/
    │   ├── SKILL.md          # ISO27001 / J-SOX チェックリスト
    │   └── checklist.md      # 監査チェック項目一覧
    ├── test-generator/
    │   ├── SKILL.md          # pytest / Pester テスト自動生成
    │   └── templates/
    │       ├── test_api.py          # pytest テンプレート
    │       └── Agent.Tests.ps1     # Pester テンプレート
    ├── db-migration/
    │   └── SKILL.md          # Alembic マイグレーション手順
    └── compliance-check/
        ├── SKILL.md          # コンプライアンス自動検証
        └── nist-csf-map.md   # NIST CSF 2.0 対応マッピング表
```

**`ps-agent-skill/SKILL.md` の例：**

```markdown
---
name: ps-agent-skill
description: >
  PowerShell エージェント開発スキル。WMI によるデータ収集・
  EventID ログ取得・HTTPS 送信スクリプトの実装を支援する。
  agent-dev が PowerShell を書くときは常にこのスキルを使用すること。
---

## PowerShell エージェント開発ガイド

### 収集データ種別と取得コマンド
| データ種別 | コマンド | EventID |
|---|---|---|
| HW 資産情報 | `Get-CimInstance Win32_ComputerSystem` | — |
| ログオン履歴 | Windows Event Log | 4624 / 4634 |
| Defender 状態 | `Get-MpComputerStatus` | — |
| USB 接続履歴 | Windows Event Log | 2003 / 2100 |

### 必須: エラーハンドリング
templates/Collect-Base.ps1 のパターンを必ず踏襲すること。

### 必須: 送信前スキーマ検証
schema_version・device_id・collected_at の存在を確認してから送信する。
```

---

### 🚀 Agent Teams 起動プロンプト例

ClaudeCode 上で自然言語で指示するだけ。設定ファイルは不要。

```
# Phase 1 を Agent Team で一括開発する例
Create an agent team called "aegis-phase1" to implement AEGIS-SIGHT Phase 1:

- backend-agent: POST /api/v1/telemetry endpoint + devices table Alembic migration
- frontend-agent: asset list page /assets with search, filter, and CSV export
- agent-dev: PowerShell agent collecting HW/SW/security data and posting JSON
- qa-agent: pytest for the API + Pester unit tests for the agent

Require plan approval before any teammate writes files.
All agents must load their designated Skills automatically.
```

```
# セキュリティレビューを Agent Team で実施する例
Create a security review team for AEGIS-SIGHT:

- security-sentinel: audit all API endpoints for JWT validation and input sanitization
- compliance-checker: verify ISO27001 and J-SOX requirements using /compliance-check skill

Share findings between teammates and produce a unified remediation report.
```

---

### 🔀 Subagents vs Agent Teams — 使い分け

```mermaid
flowchart LR
    TASK["📋 タスク"] --> Q{"Agents 間で\n通信が必要?"}

    Q -->|"No — 独立した並列作業"| SUB["⚡ Subagents\n軽量・低コスト\nLead に報告のみ"]
    Q -->|"Yes — 相互レビュー・依存あり"| TEAM["🤝 Agent Teams\n直接メッセージ\n共有タスクリスト"]

    SUB --> EX1["例: 各ファイルの\nLint チェック"]
    SUB --> EX2["例: 独立モジュールの\nユニットテスト"]
    TEAM --> EX3["例: API型定義を\nFE・BE・QA で共有"]
    TEAM --> EX4["例: セキュリティ×\nパフォーマンスの\n相互レビュー"]

    style SUB fill:#E8F5E9,stroke:#2E7D32
    style TEAM fill:#E3F2FD,stroke:#1565C0
```

| | ⚡ Subagents | 🤝 Agent Teams |
|:---|:---:|:---:|
| エージェント間の直接通信 | ✗ | ✅ |
| 共有タスクリスト | ✗ | ✅ |
| トークンコスト | 低 | 高（× チーム人数）|
| 有効化 | デフォルト有効 | 環境変数が必要 |
| 最適な場面 | 独立した並列作業 | 相互依存・協調作業 |

---

## 🔄 CI/CD パイプライン

> ✅ **GitHub Actions + Docker** を組み合わせた完全自動化パイプライン

```mermaid
flowchart LR
    DEV["👨‍💻 開発者\n(ClaudeCode)"] -->|"git push"| PR["📋 Pull Request"]

    PR --> CI

    subgraph CI["🔍 CI（自動実行）"]
        LINT["🔎 Lint\nruff / ESLint\nPSScriptAnalyzer"]
        TYPE["📐 型チェック\nmypy / tsc"]
        TEST["🧪 テスト\npytest / Vitest\nPester"]
        SEC["🛡️ Trivy\nコンテナ脆弱性スキャン"]
        LINT --> TYPE --> TEST --> SEC
    end

    subgraph GATE["✅ 品質ゲート"]
        G1["カバレッジ\n80%以上"]
        G2["エラー\n0件"]
        G3["脆弱性\nHIGH: 0件"]
        G4["レビュー\n1名以上承認"]
    end

    CI --> GATE
    GATE -->|"PASS"| MERGE["🔀 main マージ"]

    MERGE --> BUILD["🐳 Docker Build\nghcr.io イメージ"]
    BUILD --> STAGING["🔧 Staging\ndocker compose up"]
    STAGING --> SMOKE["💨 スモークテスト"]
    SMOKE -->|"PASS"| TAG["🏷️ リリースタグ"]
    TAG -->|"手動承認"| PROD["🚀 本番デプロイ\ndocker compose prod"]

    style CI fill:#E8F5E9
    style GATE fill:#E3F2FD
    style BUILD fill:#E1F5FE,stroke:#2496ED
    style PROD fill:#FCE4EC
```

| ワークフロー | トリガー | 内容 | 目標時間 |
|:---|:---|:---|:---:|
| `ci-api.yml` | PR → main（API変更） | ruff・mypy・pytest・Trivy イメージスキャン | ≤ 6 分 |
| `ci-web.yml` | PR → main（Web変更） | ESLint・TypeCheck・Vitest・Playwright | ≤ 8 分 |
| `ci-agent.yml` | PR → main（Agent変更） | PSScriptAnalyzer・Pester | ≤ 3 分 |
| `cd-staging.yml` | main マージ後 | 🐳 Docker Build → ghcr.io push → Staging compose up → スモーク | ≤ 12 分 |
| `cd-production.yml` | リリースタグ付与 | 🐳 Docker image tag → 本番 compose up（手動承認） | ≤ 15 分 |
| `security-scan.yml` | 毎日 02:00 JST | Trivy コンテナスキャン・dependabot チェック | ≤ 5 分 |

---

## 📊 収集データ仕様

### 📦 JSON ペイロード構造

```jsonc
{
  "schema_version": "1.0",
  "collected_at": "2026-03-22T09:00:00+09:00",

  // 🖥️ デバイス基本情報
  "device": {
    "hostname": "PC-SALES-001",
    "device_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",  // UUID v4（固定）
    "user": "tanaka.ken",
    "os": "Windows 11 23H2",
    "ip": "192.168.1.10",
    "mac": "AA:BB:CC:DD:EE:FF",
    "domain": "corp.example.com"
  },

  // ⚙️ ハードウェア情報（◎ 確実取得）
  "hardware": {
    "cpu": "Intel Core i7-1355U",
    "memory_gb": 16,
    "disk_total_gb": 512,
    "disk_free_gb": 218,
    "serial_number": "SN1234567890"
  },

  // 🛡️ セキュリティ状態（◎ 確実取得）
  "security": {
    "defender_status": "ON",
    "pattern_date": "2026-03-21",
    "bitlocker": "ENABLED",
    "pending_updates": 2
  },

  // 📊 アクティビティ（○ 実用レベル）
  "activity": {
    "processes": ["chrome.exe", "teams.exe", "excel.exe"],
    "last_logon": "2026-03-22T08:45:00+09:00",
    "cpu_pct": 12,
    "mem_pct": 58
  },

  // 🔌 USB イベント（○ 実用レベル）
  "usb_events": [
    {
      "device_id": "USB\\VID_0930&PID_6545",
      "name": "TOSHIBA USB Drive",
      "action": "connect",
      "at": "2026-03-22T09:10:00+09:00"
    }
  ],

  // 👤 ログオンイベント（◎ 確実取得）
  "logon_events": [
    {
      "event_id": 4624,
      "user": "tanaka.ken",
      "type": "interactive",
      "at": "2026-03-22T08:45:00+09:00"
    }
  ]
}
```

### 📏 収集精度サマリ

| カテゴリ | 収集精度 | 取得方法 | 収集間隔 |
|:---|:---:|:---|:---:|
| 🖥️ HW 資産情報 | ◎ 確実 | WMI / Get-CimInstance | 30 分 |
| 👤 ログオン履歴 | ◎ 確実 | EventID 4624 / 4634 | 5 分 |
| 🛡️ セキュリティ状態 | ◎ 確実 | Get-MpComputerStatus | 15 分 |
| 📦 SW インベントリ | ◎ 確実 | Registry HKLM Uninstall | 30 分 |
| 🔌 USB 接続履歴 | ○ 実用 | EventID / SetupAPI | 即時 |
| ⚙️ プロセス一覧 | ○ 実用 | Get-Process | 5 分 |
| 📈 パフォーマンス | ○ 実用 | Get-Counter / WMI | 5 分 |
| 📂 ファイル操作 | △ 工夫要 | EventID 4663（重要フォルダ限定） | 即時 |

---

## 📜 コンプライアンス対応

```mermaid
mindmap
  root((🛡️ AEGIS-SIGHT\nコンプライアンス))
    ISO 27001
      資産管理 CMDB
      アクセス制御 RBAC
      ログ管理 追記専用
      脆弱性管理 Trivy
    ISO 20000
      ITSM プロセス統合
      変更管理 GitHub PR
      構成管理 CMDB
      インシデント管理 アラート
    J-SOX
      内部統制証跡 3年保存
      操作ログ 全記録
      改ざん防止 ハッシュチェーン
      監査エクスポート PDF/CSV
    NIST CSF 2.0
      識別 資産台帳
      保護 Defender/BitLocker
      検知 アラートエンジン
      対応 通知/チケット
      回復 バックアップ
    GDPR
      データ最小化
      アクセス制御
      保存期間管理
```

---

## 🗺️ 開発フェーズ計画

```mermaid
gantt
    title AEGIS-SIGHT 開発ロードマップ
    dateFormat  YYYY-MM-DD
    section Phase 1 基盤構築
    エージェント基本版          :p1a, 2026-04-01, 2w
    FastAPI 受信API             :p1b, 2026-04-01, 2w
    PostgreSQL CMDB設計         :p1c, 2026-04-08, 1w
    基本 Web UI                  :p1d, 2026-04-08, 2w
    500台エージェント配布        :milestone, p1m, 2026-04-28, 0d

    section Phase 2 セキュリティ強化
    GPO デバイス制御連携         :p2a, 2026-04-29, 2w
    Defender API 統合            :p2b, 2026-04-29, 2w
    アラートエンジン実装         :p2c, 2026-05-06, 2w
    セキュリティ監視稼働         :milestone, p2m, 2026-05-26, 0d

    section Phase 3 ログ高度化
    USB履歴・ファイル監査        :p3a, 2026-05-27, 3w
    詳細ログビューア             :p3b, 2026-05-27, 3w
    3年保全開始                  :milestone, p3m, 2026-06-16, 0d

    section Phase 4 Microsoft統合
    Entra ID SSO実装             :p4a, 2026-06-17, 2w
    Intune/Defender API連携      :p4b, 2026-06-17, 3w
    MS365完全統合                :milestone, p4m, 2026-07-07, 0d

    section Phase 5 運用自動化
    自動レポート・運用手順書     :p5a, 2026-07-08, 3w
    CI/CD完全自動化              :p5b, 2026-07-08, 2w
    本番リリース                 :milestone, p5m, 2026-07-28, 0d
```

---

## 📚 ドキュメント

| 📄 文書 | 概要 | 文書番号 |
|:---|:---|:---|
| 📋 [要件定義書](docs/AEGIS-SIGHT_要件定義書_v1.0.docx) | プロジェクト目標・機能要件・KPI | AEGIS-SIGHT-REQ-001 |
| 📐 [詳細仕様書](docs/AEGIS-SIGHT_詳細仕様書_v1.0.docx) | API仕様・DB設計・エージェント仕様 | AEGIS-SIGHT-DDS-001 |
| 🔐 [セキュリティ設計](docs/security.md) | 認証・認可・監査ログ設計 | AEGIS-SIGHT-SEC-001 |
| 🚀 [運用手順書](docs/operations.md) | 監視・バックアップ・インシデント対応 | AEGIS-SIGHT-OPS-001 |
| 📜 [コンプライアンス対応表](docs/compliance/) | ISO 27001 / J-SOX / NIST CSF 対応一覧 | AEGIS-SIGHT-CMP-001 |

---

## 🤝 コントリビューション

本プロジェクトは **社内限定** です。外部コントリビューションは受け付けていません。

社内メンバーは以下のブランチ戦略に従ってください：

```
main          ← 本番リリースブランチ（直接 push 禁止）
  └── develop ← 統合ブランチ
        └── feature/FR-xxx-機能名    ← 機能開発
        └── fix/バグ内容             ← バグ修正
        └── docs/ドキュメント更新    ← 文書更新
```

---

<div align="center">

**🛡️ AEGIS-SIGHT** — Built with ❤️ by IT System Operations Team

`ISO 27001` `ISO 20000` `J-SOX` `NIST CSF 2.0` `GDPR`

*Powered by [ClaudeCode](https://claude.ai/code) — Autonomous AI Development*

</div>
