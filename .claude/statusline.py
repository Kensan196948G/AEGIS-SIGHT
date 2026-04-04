#!/usr/bin/env python3
"""Claude Code status line script with ANSI colors.

Reads JSON from stdin, outputs formatted multi-line status bar.

Line 1: Model │ Project │ Git branch │ OS
Line 2: Context % │ Lines changed (+/-) │ 🌐 online
Line 3: 5h rate limit bar  pct%  [padding]  Resets HH (Asia/Tokyo)
Line 4: 7d rate limit bar  pct%  全モデル  [padding]  Resets date (Asia/Tokyo)
"""
import json
import os
import platform
import socket
import subprocess
import sys
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))

# ANSI color codes
CYAN = "\x1b[36m"
GREEN = "\x1b[32m"
YELLOW = "\x1b[33m"
MAGENTA = "\x1b[35m"
BLUE = "\x1b[34m"
WHITE = "\x1b[97m"
RED = "\x1b[31m"
BOLD = "\x1b[1m"
R = "\x1b[0m"

SEP = f" {BLUE}\u2502{R} "

# Full-width space for visual padding in the rate limit lines
FW_SPACE = "\u3000"


def get_git_branch() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=2,
        )
        return result.stdout.strip() if result.returncode == 0 else "?"
    except Exception:
        return "?"


def check_online() -> bool:
    """Quick connectivity check via DNS lookup."""
    try:
        socket.setdefaulttimeout(1)
        socket.getaddrinfo("8.8.8.8", 53)
        return True
    except Exception:
        return False


def progress_bar(pct: float, width: int = 10) -> str:
    """Build a ▰▱ progress bar with colour coding."""
    filled = round(pct / 100 * width)
    empty = width - filled
    if pct >= 80:
        color = RED
    elif pct >= 50:
        color = YELLOW
    else:
        color = GREEN
    return color + "\u25b0" * filled + CYAN + "\u25b1" * empty + R


def format_reset_time(epoch: float | int | None) -> str:
    if not epoch:
        return ""
    dt = datetime.fromtimestamp(epoch, tz=JST)
    now = datetime.now(tz=JST)
    if dt.date() == now.date():
        return f"Resets {dt.strftime('%-I%p').lower()} (Asia/Tokyo)"
    return f"Resets {dt.strftime('%b %-d')} at {dt.strftime('%-I%p').lower()} (Asia/Tokyo)"


def main() -> None:
    raw = sys.stdin.read()
    if not raw.strip():
        return

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return

    model = data.get("model", {})
    model_name = model.get("display_name") or model.get("id", "?")

    cwd = data.get("cwd", "")
    project = os.path.basename(cwd) if cwd else "?"

    branch = get_git_branch()
    os_name = platform.system()

    ctx = data.get("context_window", {})
    ctx_pct = ctx.get("used_percentage", 0) or 0

    cost = data.get("cost", {})
    lines_added = cost.get("total_lines_added", 0) or 0
    lines_removed = cost.get("total_lines_removed", 0) or 0

    rate_limits = data.get("rate_limits") or {}
    five_hour = rate_limits.get("five_hour") or {}
    seven_day = rate_limits.get("seven_day") or {}

    # ── Line 1: Model │ Project │ Branch │ OS ──────────────────────────────
    line1_parts = [
        f"{MAGENTA}\U0001f916 {BOLD}{model_name}{R}",
        f"{YELLOW}\U0001f4c1 {project}{R}",
        f"{GREEN}\U0001f33f {branch}{R}",
        f"{CYAN}\U0001f5a5  {os_name}{R}",
    ]
    print(SEP.join(line1_parts))

    # ── Line 2: Context % │ Lines changed │ 🌐 online/offline ───────────────
    online = check_online()
    net_label = f"{GREEN}\U0001f310 online{R}" if online else f"{RED}\U0001f310 offline{R}"
    line2_parts = [
        f"{BLUE}\U0001f4ca {WHITE}{ctx_pct:.0f}%{R}",
        f"{CYAN}\u270f\ufe0f  {GREEN}+{lines_added}{R}/{RED}-{lines_removed}{R}",
        net_label,
    ]
    print(SEP.join(line2_parts))

    # ── Line 3: 5-hour rate limit ──────────────────────────────────────────
    # Format: ⏱  5h  ▰▱▱▱▱▱▱▱▱▱   18%  　　　　　　　 Resets 1pm (Asia/Tokyo)
    five_pct = five_hour.get("used_percentage")
    if five_pct is not None:
        five_bar = progress_bar(five_pct)
        five_reset = format_reset_time(five_hour.get("resets_at"))
        pct_str = f"{five_pct:.0f}%"
        # Pad percentage field to 4 chars for alignment, then full-width spaces
        padding = FW_SPACE * 7
        print(
            f"{BLUE}\u23f1  5h{R}  {five_bar}  "
            f"{WHITE}{pct_str:<4}{R}  "
            f"{padding} {CYAN}{five_reset}{R}"
        )

    # ── Line 4: 7-day rate limit ───────────────────────────────────────────
    # Format: 📅 7d  ▱▱▱▱▱▱▱▱▱▱    9%  全モデル　　　 Resets Apr 10 at 1pm (Asia/Tokyo)
    seven_pct = seven_day.get("used_percentage")
    if seven_pct is not None:
        seven_bar = progress_bar(seven_pct)
        seven_reset = format_reset_time(seven_day.get("resets_at"))
        pct_str = f"{seven_pct:.0f}%"
        padding = FW_SPACE * 3
        print(
            f"{BLUE}\U0001f4c5 7d{R}  {seven_bar}  "
            f"{WHITE}{pct_str:<4}{R}  "
            f"{CYAN}\u5168\u30e2\u30c7\u30eb{R}{padding} {CYAN}{seven_reset}{R}"
        )


if __name__ == "__main__":
    main()
