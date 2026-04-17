"""WebSocket real-time notification endpoint."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self) -> None:
        # Mapping of user_id -> list of active connections
        self._active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        if user_id not in self._active_connections:
            self._active_connections[user_id] = []
        self._active_connections[user_id].append(websocket)
        logger.info("WebSocket connected: user=%s, total=%d", user_id, self.connection_count)

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        """Remove a WebSocket connection."""
        if user_id in self._active_connections:
            self._active_connections[user_id] = [
                ws for ws in self._active_connections[user_id] if ws is not websocket
            ]
            if not self._active_connections[user_id]:
                del self._active_connections[user_id]
        logger.info("WebSocket disconnected: user=%s, total=%d", user_id, self.connection_count)

    @property
    def connection_count(self) -> int:
        return sum(len(conns) for conns in self._active_connections.values())

    async def send_to_user(self, user_id: str, message: dict[str, Any]) -> None:
        """Send a message to all connections of a specific user."""
        if user_id in self._active_connections:
            payload = json.dumps(message)
            dead: list[WebSocket] = []
            for ws in self._active_connections[user_id]:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self._active_connections[user_id].remove(ws)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a message to all connected clients."""
        payload = json.dumps(message)
        for _user_id, connections in list(self._active_connections.items()):
            dead: list[WebSocket] = []
            for ws in connections:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                connections.remove(ws)

    async def send_alert(self, alert_data: dict[str, Any]) -> None:
        """Broadcast an alert notification to all connected clients."""
        await self.broadcast({
            "type": "alert",
            "data": alert_data,
        })

    async def send_device_status_change(
        self, device_id: str, status: str, details: dict[str, Any] | None = None
    ) -> None:
        """Broadcast a device status change notification."""
        await self.broadcast({
            "type": "device_status_change",
            "data": {
                "device_id": device_id,
                "status": status,
                "details": details or {},
            },
        })


# Singleton connection manager
manager = ConnectionManager()


def _verify_ws_token(token: str) -> str | None:
    """Verify a JWT token and return the user_id (sub claim), or None."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        return user_id
    except JWTError:
        return None


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications.

    Connection flow:
    1. Client connects to /api/v1/ws/notifications?token=<JWT>
    2. Server verifies JWT
    3. On success, connection is accepted and kept alive
    4. Server pushes notifications (alerts, device status changes)
    5. Client can send ping messages to keep alive
    """
    # Extract token from query parameter
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    # Verify JWT
    user_id = _verify_ws_token(token)
    if user_id is None:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return

    # Connect
    await manager.connect(websocket, user_id)

    try:
        while True:
            # Keep connection alive; handle client messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)
