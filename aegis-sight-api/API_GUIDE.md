# AEGIS-SIGHT API Guide

## Overview

AEGIS-SIGHT is a comprehensive IT asset management and software license compliance platform. This guide covers authentication, endpoint usage, error handling, and real-time notifications.

**Base URL:** `http://localhost:8000/api/v1`
**Interactive docs:** `http://localhost:8000/docs` (Swagger UI) / `http://localhost:8000/redoc` (ReDoc)

---

## Authentication

AEGIS-SIGHT uses JWT (JSON Web Tokens) for authentication. All endpoints except `/auth/token`, `/auth/register`, `/telemetry`, and `/health` require a valid token.

### 1. Register a new user

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "full_name": "Taro Yamada",
  "role": "readonly"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "Taro Yamada",
  "role": "readonly",
  "is_active": true,
  "created_at": "2026-03-27T10:00:00Z"
}
```

### 2. Obtain a JWT token

```http
POST /api/v1/auth/token
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=SecurePassword123
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "bearer"
}
```

### 3. Use the token

Include the token in the `Authorization` header for all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 4. Get current user profile

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

---

## Role-Based Access Control (RBAC)

| Role       | Description                                          |
|------------|------------------------------------------------------|
| `admin`    | Full access to all endpoints                         |
| `operator` | Operational endpoints (assets, alerts, procurement)  |
| `auditor`  | Audit logs, reports, and read-only access            |
| `readonly` | Read-only access to assets, dashboard, alerts, logs  |

### Role requirements by endpoint group

| Endpoint Group     | admin | operator | auditor | readonly |
|--------------------|-------|----------|---------|----------|
| User management    | RW    | --       | --      | --       |
| Asset management   | RW    | RW       | R       | R        |
| Alert management   | RW    | RW       | R       | R        |
| SAM / Licenses     | RW    | RW       | R       | R        |
| Procurement        | RW    | RW       | R       | R        |
| Dashboard          | R     | R        | R       | R        |
| Security overview  | R     | R        | R       | R        |
| Log events         | R     | R        | R       | R        |
| Audit logs         | RW    | --       | R       | --       |
| Reports            | R     | --       | R       | --       |
| System config      | RW    | R        | R       | R        |
| Scheduler tasks    | RW    | R        | R       | R        |
| Batch import       | RW    | RW       | --      | --       |

---

## Endpoint Reference

### Auth (`/api/v1/auth`)

| Method | Path              | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| POST   | `/auth/token`     | Login and get JWT token      | No            |
| GET    | `/auth/me`        | Get current user profile     | Yes           |
| POST   | `/auth/register`  | Register a new user          | No            |

### Assets (`/api/v1/assets`)

| Method | Path                   | Description              | Role        |
|--------|------------------------|--------------------------|-------------|
| GET    | `/assets`              | List device assets       | Any         |
| GET    | `/assets/count`        | Count device assets      | Any         |
| GET    | `/assets/{asset_id}`   | Get device by ID         | Any         |
| POST   | `/assets`              | Create device asset      | Any         |
| PATCH  | `/assets/{asset_id}`   | Update device asset      | Any         |

### Telemetry (`/api/v1/telemetry`)

| Method | Path          | Description              | Auth Required |
|--------|---------------|--------------------------|---------------|
| POST   | `/telemetry`  | Receive agent telemetry  | No            |

**Request example:**
```json
{
  "device_info": {
    "hostname": "WORKSTATION-001",
    "os_version": "Windows 11 Pro 23H2",
    "ip_address": "10.0.1.100",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "domain": "corp.local"
  },
  "hardware": {
    "cpu_model": "Intel Core i7-13700",
    "memory_gb": 32.0,
    "disk_total_gb": 512.0,
    "disk_free_gb": 256.0,
    "serial_number": "SN12345"
  },
  "security": {
    "defender_on": true,
    "bitlocker_on": true,
    "pattern_date": "2026-03-25",
    "pending_patches": 0
  },
  "software_inventory": [
    {
      "name": "Microsoft Office 365",
      "version": "16.0.17328",
      "publisher": "Microsoft",
      "install_date": "2026-01-15"
    }
  ],
  "collected_at": "2026-03-27T10:00:00Z"
}
```

### Dashboard (`/api/v1/dashboard`)

| Method | Path                | Description              | Role |
|--------|---------------------|--------------------------|------|
| GET    | `/dashboard/stats`  | Dashboard statistics     | Any  |
| GET    | `/dashboard/alerts` | Recent security alerts   | Any  |

**Stats response example:**
```json
{
  "total_devices": 150,
  "online_devices": 120,
  "total_licenses": 45,
  "compliance_rate": 97.8,
  "pending_procurements": 3,
  "active_alerts": 5
}
```

### Alerts (`/api/v1/alerts`)

| Method | Path                             | Description         | Role |
|--------|----------------------------------|---------------------|------|
| GET    | `/alerts`                        | List alerts         | Any  |
| GET    | `/alerts/stats`                  | Alert statistics    | Any  |
| GET    | `/alerts/{alert_id}`             | Get alert by ID     | Any  |
| POST   | `/alerts`                        | Create alert        | Any  |
| PATCH  | `/alerts/{alert_id}/acknowledge` | Acknowledge alert   | Any  |
| PATCH  | `/alerts/{alert_id}/resolve`     | Resolve alert       | Any  |

### SAM / Licenses (`/api/v1/sam`)

| Method | Path                            | Description              | Role |
|--------|---------------------------------|--------------------------|------|
| GET    | `/sam/licenses`                 | List licenses            | Any  |
| GET    | `/sam/licenses/{license_id}`    | Get license by ID        | Any  |
| POST   | `/sam/licenses`                 | Create license           | Any  |
| PATCH  | `/sam/licenses/{license_id}`    | Update license           | Any  |
| GET    | `/sam/compliance`               | Get compliance status    | Any  |
| POST   | `/sam/compliance/check`         | Run compliance check     | Any  |

### Procurement (`/api/v1/procurement`)

| Method | Path                                    | Description          | Role |
|--------|-----------------------------------------|----------------------|------|
| GET    | `/procurement`                          | List requests        | Any  |
| GET    | `/procurement/{request_id}`             | Get request by ID    | Any  |
| POST   | `/procurement`                          | Create request       | Any  |
| PATCH  | `/procurement/{request_id}`             | Update request       | Any  |
| POST   | `/procurement/{request_id}/submit`      | Submit for approval  | Any  |
| POST   | `/procurement/{request_id}/approve`     | Approve request      | Any  |
| POST   | `/procurement/{request_id}/reject`      | Reject request       | Any  |
| POST   | `/procurement/{request_id}/order`       | Mark as ordered      | Any  |
| POST   | `/procurement/{request_id}/receive`     | Mark as received     | Any  |
| POST   | `/procurement/{request_id}/dispose`     | Dispose asset        | Any  |

### Security (`/api/v1/security`)

| Method | Path                             | Description              | Role |
|--------|----------------------------------|--------------------------|------|
| GET    | `/security/overview`             | Security overview        | Any  |
| GET    | `/security/devices/{device_id}`  | Device security detail   | Any  |

### Logs (`/api/v1/logs`)

| Method | Path            | Description          | Role |
|--------|-----------------|----------------------|------|
| GET    | `/logs/logon`   | List logon events    | Any  |
| GET    | `/logs/usb`     | List USB events      | Any  |
| GET    | `/logs/files`   | List file events     | Any  |
| GET    | `/logs/summary` | Log statistics       | Any  |

### Audit (`/api/v1/audit`)

| Method | Path                  | Description          | Role          |
|--------|-----------------------|----------------------|---------------|
| GET    | `/audit/logs`         | List audit logs      | auditor/admin |
| GET    | `/audit/logs/export`  | Export audit logs    | auditor/admin |

### Reports (`/api/v1/reports`)

| Method | Path                | Description            | Role          |
|--------|---------------------|------------------------|---------------|
| GET    | `/reports/sam`      | SAM compliance report  | auditor/admin |
| GET    | `/reports/assets`   | Asset inventory report | auditor/admin |
| GET    | `/reports/security` | Security status report | auditor/admin |

### Users (`/api/v1/users`)

| Method | Path                  | Description            | Role  |
|--------|-----------------------|------------------------|-------|
| GET    | `/users`              | List users             | admin |
| GET    | `/users/me/settings`  | Get personal settings  | Any   |
| PATCH  | `/users/me/settings`  | Update personal settings | Any |
| GET    | `/users/{user_id}`    | Get user by ID         | Any   |
| PATCH  | `/users/{user_id}`    | Update user            | admin |
| DELETE | `/users/{user_id}`    | Deactivate user        | admin |

### Config (`/api/v1/config`)

| Method | Path                | Description             | Role  |
|--------|---------------------|-------------------------|-------|
| GET    | `/config`           | List all configs        | Any   |
| GET    | `/config/{key}`     | Get config by key       | Any   |
| PUT    | `/config/{key}`     | Update config value     | admin |
| POST   | `/config/reset/{key}` | Reset to default      | admin |

### Scheduler (`/api/v1/scheduler`)

| Method | Path                          | Description          | Role  |
|--------|-------------------------------|----------------------|-------|
| GET    | `/scheduler/tasks`            | List tasks           | Any   |
| PATCH  | `/scheduler/tasks/{task_id}`  | Update task          | admin |
| POST   | `/scheduler/tasks/{task_id}/run` | Run immediately   | admin |
| GET    | `/scheduler/history`          | Task execution history | Any |

### Departments (`/api/v1/departments`)

| Method | Path                           | Description           |
|--------|--------------------------------|-----------------------|
| GET    | `/departments`                 | List departments      |
| POST   | `/departments`                 | Create department     |
| GET    | `/departments/{department_id}` | Get department        |
| PATCH  | `/departments/{department_id}` | Update department     |

### Batch (`/api/v1/batch`)

| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| POST   | `/batch/devices/import`    | Bulk import devices      |
| GET    | `/batch/devices/export`    | Export devices as CSV    |
| POST   | `/batch/licenses/import`   | Bulk import licenses     |
| GET    | `/batch/licenses/export`   | Export licenses as CSV   |

### Network (`/api/v1/network`)

| Method | Path                       | Description                  |
|--------|----------------------------|------------------------------|
| GET    | `/network/discovered`      | List discovered devices      |
| POST   | `/network/discovered`      | Add discovered device        |
| POST   | `/network/link`            | Link to managed asset        |

### M365 (`/api/v1/m365`)

| Method | Path                | Description                |
|--------|---------------------|----------------------------|
| GET    | `/m365/licenses`    | List M365 licenses         |
| GET    | `/m365/users`       | List M365 users            |
| POST   | `/m365/sync`        | Trigger Graph API sync     |

### Metrics (`/api/v1/metrics`)

| Method | Path       | Description              |
|--------|------------|--------------------------|
| GET    | `/metrics` | Prometheus metrics       |

---

## Error Codes

| HTTP Status | Error Type                   | Description                                |
|-------------|------------------------------|--------------------------------------------|
| 400         | Bad Request                  | Invalid request body or parameters         |
| 401         | Unauthorized                 | Missing or invalid JWT token               |
| 403         | Forbidden                    | Insufficient role permissions              |
| 404         | Not Found                    | Resource does not exist                    |
| 409         | Conflict                     | Resource already exists (e.g., duplicate)  |
| 422         | Unprocessable Entity         | Request validation failed                  |
| 500         | Internal Server Error        | Unexpected server-side error               |
| 503         | Service Unavailable          | External service temporarily unavailable   |

**Error response format:**
```json
{
  "detail": "Human-readable error message"
}
```

**Validation error format (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Pagination

All list endpoints support pagination via query parameters:

| Parameter | Type | Default | Range   | Description                |
|-----------|------|---------|---------|----------------------------|
| `offset`  | int  | 0       | >= 0    | Number of records to skip  |
| `limit`   | int  | 50      | 1--200  | Maximum records to return  |

Some endpoints use `skip` as an alias for `offset` (e.g., `/sam/licenses`).

**Paginated response format:**
```json
{
  "items": [ ... ],
  "total": 150,
  "offset": 0,
  "limit": 50,
  "has_more": true
}
```

**Example: fetching page 2 (items 50--99):**
```http
GET /api/v1/assets?offset=50&limit=50
Authorization: Bearer <token>
```

---

## WebSocket Connection

Real-time notifications are delivered via WebSocket.

### Connection

```
ws://localhost:8000/api/v1/ws/notifications?token=<JWT>
```

### Authentication

Pass the JWT token as a query parameter. The server verifies the token before accepting the connection. Invalid or missing tokens result in connection closure with error codes:
- `4001` -- Missing authentication token
- `4003` -- Invalid or expired token

### Message types

**Server -> Client:**

```json
{
  "type": "alert",
  "data": {
    "id": "...",
    "severity": "critical",
    "title": "Windows Defender disabled",
    "message": "..."
  }
}
```

```json
{
  "type": "device_status_change",
  "data": {
    "device_id": "...",
    "status": "inactive",
    "details": {}
  }
}
```

**Client -> Server (keepalive):**

```json
{"type": "ping"}
```

**Server -> Client (keepalive response):**

```json
{"type": "pong"}
```

---

## Rate Limiting

Currently no rate limiting is enforced at the application level. If deployed behind a reverse proxy (Nginx, Envoy), configure rate limits there.

---

## CORS

Allowed origins are configured via the `CORS_ORIGINS` environment variable. Default development origins:
- `http://localhost:3000`
- `http://localhost:5173`
