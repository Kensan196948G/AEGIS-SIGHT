/**
 * AEGIS-SIGHT API -- k6 performance test suite.
 *
 * Scenarios:
 *   smoke   - 1 VU, 1 minute   (quick sanity check)
 *   load    - 50 VUs, 5 minutes (normal operating load)
 *   stress  - 100 VUs, 10 minutes (peak / stress conditions)
 *
 * Run:
 *   k6 run tests/performance/k6-load-test.js
 *   k6 run --env SCENARIO=smoke tests/performance/k6-load-test.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate = new Rate("error_rate");
const loginDuration = new Trend("login_duration", true);
const dashboardDuration = new Trend("dashboard_duration", true);
const assetsDuration = new Trend("assets_duration", true);
const licensesDuration = new Trend("licenses_duration", true);
const logsDuration = new Trend("logs_duration", true);
const telemetryDuration = new Trend("telemetry_duration", true);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const EMAIL = __ENV.EMAIL || "admin@aegis-sight.local";
const PASSWORD = __ENV.PASSWORD || "admin";

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "1m",
      tags: { scenario: "smoke" },
      exec: "apiWorkflow",
    },
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "4m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      startTime: "1m10s",
      tags: { scenario: "load" },
      exec: "apiWorkflow",
    },
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 100 },
        { duration: "8m", target: 100 },
        { duration: "1m", target: 0 },
      ],
      startTime: "6m40s",
      tags: { scenario: "stress" },
      exec: "apiWorkflow",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],             // < 5% errors
    http_req_duration: ["p(95)<500"],           // p95 < 500ms
    error_rate: ["rate<0.05"],
    login_duration: ["p(95)<1000"],
    dashboard_duration: ["p(95)<500"],
    assets_duration: ["p(95)<500"],
    licenses_duration: ["p(95)<500"],
    logs_duration: ["p(95)<500"],
    telemetry_duration: ["p(95)<500"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function authenticate() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/token`,
    { username: EMAIL, password: PASSWORD },
    { tags: { endpoint: "auth_token" } }
  );
  loginDuration.add(res.timings.duration);
  const ok = check(res, { "login status 200": (r) => r.status === 200 });
  errorRate.add(!ok);
  if (res.status === 200) {
    return res.json("access_token");
  }
  return null;
}

function authHeaders(token) {
  return {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  };
}

// ---------------------------------------------------------------------------
// Main workflow
// ---------------------------------------------------------------------------
export function apiWorkflow() {
  // Step 1: Login
  const token = authenticate();
  if (!token) {
    sleep(1);
    return;
  }
  const params = authHeaders(token);

  // Step 2: Dashboard stats
  group("Dashboard", () => {
    const res = http.get(`${BASE_URL}/api/v1/dashboard/stats`, params);
    dashboardDuration.add(res.timings.duration);
    const ok = check(res, { "dashboard 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // Step 3: Asset list
  group("Assets", () => {
    const res = http.get(`${BASE_URL}/api/v1/assets?offset=0&limit=50`, params);
    assetsDuration.add(res.timings.duration);
    const ok = check(res, { "assets 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // Step 4: License list
  group("Licenses", () => {
    const res = http.get(`${BASE_URL}/api/v1/sam/licenses?offset=0&limit=50`, params);
    licensesDuration.add(res.timings.duration);
    const ok = check(res, { "licenses 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // Step 5: Log search
  group("Logs", () => {
    const res = http.get(`${BASE_URL}/api/v1/logs/logon?offset=0&limit=50`, params);
    logsDuration.add(res.timings.duration);
    const ok = check(res, { "logs 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // Step 6: Telemetry ingestion (agent simulation)
  group("Telemetry", () => {
    const payload = JSON.stringify({
      device: {
        hostname: `K6-WS-${__VU}-${__ITER}`,
        os_version: "Windows 11 Pro 23H2",
        ip_address: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
        mac_address: Array.from({ length: 6 }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
        ).join(":"),
        domain: "aegis.local",
      },
      hardware: {
        cpu_model: "Intel Core i7-13700",
        memory_gb: 16.0,
        disk_total_gb: 512.0,
        disk_free_gb: 200.0,
        serial_number: `K6-${__VU}-${Date.now()}`,
      },
      security: {
        defender_on: true,
        bitlocker_on: true,
        pattern_date: new Date().toISOString().slice(0, 10),
        pending_patches: 0,
      },
      software: [
        { name: "Google Chrome", version: "120.0.0", publisher: "Google" },
      ],
    });

    const res = http.post(`${BASE_URL}/api/v1/telemetry`, payload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "telemetry" },
    });
    telemetryDuration.add(res.timings.duration);
    const ok = check(res, { "telemetry 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(1);
}
