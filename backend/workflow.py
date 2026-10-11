from typing import Dict, List, Optional
from datetime import datetime

VALID_STATUSES = ["notified", "on_work", "work_done", "cleared"]

# Strict sequential state machine mapping
ALLOWED_NEXT_TRANSITIONS: Dict[str, List[str]] = {
    "notified": ["on_work"],
    "on_work": ["work_done"],
    "work_done": ["cleared"],
    "cleared": []  # Terminal state
}

STATUS_LABELS: Dict[str, str] = {
    "notified": "Team Notified",
    "on_work": "On Work",
    "work_done": "Work Done",
    "cleared": "Cleared"
}


def can_transition(current_status: str, target_status: str) -> bool:
    """Check if state transition is legally permissible."""
    allowed = ALLOWED_NEXT_TRANSITIONS.get(current_status, [])
    return target_status in allowed


def get_next_valid_steps(current_status: str) -> List[str]:
    """Return array of valid next status keys."""
    return ALLOWED_NEXT_TRANSITIONS.get(current_status, [])
