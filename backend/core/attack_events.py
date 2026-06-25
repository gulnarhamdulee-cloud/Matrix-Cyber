"""
Live Attack Map Events - Redis pub/sub bridge for real-time agent event streaming.

Agents call `publish_attack_event()` to broadcast events.
The SSE endpoint subscribes and streams them to the browser.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

CHANNEL_PREFIX = "matrix:attack_events:"


def get_channel(scan_id: int) -> str:
    return f"{CHANNEL_PREFIX}{scan_id}"


def publish_attack_event(
    scan_id: int,
    event_type: str,
    agent_name: str,
    payload: Optional[dict] = None,
) -> None:
    """
    Publish an attack event to Redis for a specific scan.
    
    This is a synchronous function safe to call from worker threads.
    
    Args:
        scan_id: The scan ID this event belongs to.
        event_type: One of: agent_start, agent_complete, agent_error,
                    vulnerability_found, scan_progress, scan_complete.
        agent_name: Human-readable agent name (e.g. "SQL Injection Agent").
        payload: Optional extra data dict.
    """
    try:
        from redis import Redis
        from config import get_settings
        settings = get_settings()
        redis_url = getattr(settings, "redis_url", "redis://localhost:6379")
        r = Redis.from_url(redis_url, decode_responses=True)
        
        message = json.dumps({
            "type": event_type,
            "agent": agent_name,
            "scan_id": scan_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **(payload or {}),
        })
        
        channel = get_channel(scan_id)
        r.publish(channel, message)
        r.close()
    except Exception as e:
        # Don't let event publishing crash the scanner
        logger.debug(f"[AttackEvents] Failed to publish event: {e}")
