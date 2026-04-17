"""
AEGIS-SIGHT API -- Locust load test scenarios.

Simulates realistic user workflows and agent telemetry ingestion against
the API.  Run with:

    locust -f tests/performance/locustfile.py --config tests/performance/locust.conf

Or via ``make load-test``.
"""

import random
import uuid
from datetime import UTC, datetime

from locust import HttpUser, between, tag, task


class AegisSightUser(HttpUser):
    """Simulates an authenticated dashboard user browsing the web UI."""

    wait_time = between(1, 3)
    host = "http://localhost:8000"

    # Credentials -- override via environment or locust.conf
    _email = "admin@aegis-sight.local"
    _password = "admin"

    def on_start(self):
        """Authenticate and store JWT token."""
        response = self.client.post(
            "/api/v1/auth/token",
            data={"username": self._email, "password": self._password},
            name="/api/v1/auth/token [login]",
        )
        if response.status_code == 200:
            token = response.json().get("access_token", "")
            self.client.headers.update({"Authorization": f"Bearer {token}"})
        else:
            # If login fails, subsequent requests will return 401 -- that is
            # intentional so the load test surfaces auth issues.
            pass

    # ------------------------------------------------------------------
    # Dashboard flow
    # ------------------------------------------------------------------
    @tag("dashboard")
    @task(10)
    def get_dashboard_stats(self):
        """Fetch dashboard overview KPIs."""
        self.client.get("/api/v1/dashboard/stats", name="/api/v1/dashboard/stats")

    # ------------------------------------------------------------------
    # Asset management
    # ------------------------------------------------------------------
    @tag("assets")
    @task(8)
    def list_assets(self):
        """Paginated asset list (default page)."""
        self.client.get(
            "/api/v1/assets?offset=0&limit=50", name="/api/v1/assets [page]"
        )

    @tag("assets")
    @task(3)
    def list_assets_filtered(self):
        """Asset list filtered by status."""
        status = random.choice(["active", "inactive", "maintenance"])
        self.client.get(
            f"/api/v1/assets?status={status}&limit=50",
            name="/api/v1/assets [filtered]",
        )

    # ------------------------------------------------------------------
    # License / SAM
    # ------------------------------------------------------------------
    @tag("sam")
    @task(6)
    def list_licenses(self):
        """Paginated license list."""
        self.client.get(
            "/api/v1/sam/licenses?offset=0&limit=50",
            name="/api/v1/sam/licenses [page]",
        )

    @tag("sam")
    @task(2)
    def check_compliance(self):
        """Run compliance check."""
        self.client.get(
            "/api/v1/sam/compliance", name="/api/v1/sam/compliance"
        )

    # ------------------------------------------------------------------
    # Log search
    # ------------------------------------------------------------------
    @tag("logs")
    @task(5)
    def search_logon_events(self):
        """Search logon events."""
        self.client.get(
            "/api/v1/logs/logon?offset=0&limit=50",
            name="/api/v1/logs/logon [search]",
        )

    @tag("logs")
    @task(3)
    def search_usb_events(self):
        """Search USB events."""
        self.client.get(
            "/api/v1/logs/usb?offset=0&limit=50",
            name="/api/v1/logs/usb [search]",
        )

    # ------------------------------------------------------------------
    # Security
    # ------------------------------------------------------------------
    @tag("security")
    @task(4)
    def get_security_overview(self):
        """Security dashboard overview."""
        self.client.get(
            "/api/v1/security/overview", name="/api/v1/security/overview"
        )

    # ------------------------------------------------------------------
    # Alerts
    # ------------------------------------------------------------------
    @tag("alerts")
    @task(4)
    def list_alerts(self):
        """List active alerts."""
        self.client.get(
            "/api/v1/alerts?offset=0&limit=50", name="/api/v1/alerts [page]"
        )

    # ------------------------------------------------------------------
    # Version / health (lightweight)
    # ------------------------------------------------------------------
    @tag("health")
    @task(2)
    def get_version(self):
        """Version endpoint (health canary)."""
        self.client.get("/api/v1/version", name="/api/v1/version")


class AgentTelemetryUser(HttpUser):
    """Simulates AEGIS-SIGHT endpoint agents sending telemetry payloads."""

    wait_time = between(5, 15)
    host = "http://localhost:8000"
    weight = 3  # fewer agent users than dashboard users

    def _build_telemetry_payload(self) -> dict:
        """Generate a realistic telemetry payload."""
        hostname = f"AEGIS-WS-{random.randint(1000, 9999)}"
        return {
            "device": {
                "hostname": hostname,
                "os_version": random.choice([
                    "Windows 11 Pro 23H2",
                    "Windows 10 Enterprise 22H2",
                    "Windows 11 Enterprise 24H2",
                ]),
                "ip_address": f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                "mac_address": ":".join(
                    f"{random.randint(0, 255):02x}" for _ in range(6)
                ),
                "domain": "aegis.local",
            },
            "hardware": {
                "cpu_model": random.choice([
                    "Intel Core i7-13700",
                    "Intel Core i5-12400",
                    "AMD Ryzen 7 7700X",
                ]),
                "memory_gb": random.choice([8.0, 16.0, 32.0]),
                "disk_total_gb": random.choice([256.0, 512.0, 1024.0]),
                "disk_free_gb": round(random.uniform(20.0, 400.0), 1),
                "serial_number": str(uuid.uuid4())[:13].upper(),
            },
            "security": {
                "defender_on": random.random() > 0.05,
                "bitlocker_on": random.random() > 0.1,
                "pattern_date": datetime.now(UTC).strftime("%Y-%m-%d"),
                "pending_patches": random.randint(0, 15),
            },
            "software": [
                {
                    "name": name,
                    "version": f"{random.randint(1,25)}.{random.randint(0,9)}.{random.randint(0,999)}",
                    "publisher": publisher,
                }
                for name, publisher in random.sample(
                    [
                        ("Microsoft Office", "Microsoft"),
                        ("Google Chrome", "Google"),
                        ("Mozilla Firefox", "Mozilla"),
                        ("Slack", "Salesforce"),
                        ("Zoom", "Zoom Video"),
                        ("Visual Studio Code", "Microsoft"),
                        ("Adobe Acrobat", "Adobe"),
                        ("7-Zip", "Igor Pavlov"),
                        ("Notepad++", "Don Ho"),
                        ("WinRAR", "RARLAB"),
                    ],
                    k=random.randint(3, 8),
                )
            ],
        }

    @tag("telemetry")
    @task
    def send_telemetry(self):
        """Send a telemetry payload (agent heartbeat)."""
        payload = self._build_telemetry_payload()
        self.client.post(
            "/api/v1/telemetry",
            json=payload,
            name="/api/v1/telemetry [ingest]",
        )
