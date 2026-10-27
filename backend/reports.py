"""
Utility calculations for operational incident reporting.
Calculates:
- response_time: notified - detected (in minutes)
- repair_time: work_done - on_work (in minutes)
"""
from datetime import datetime
from typing import Optional


def compute_response_time(detected_time: Optional[datetime], notified_time: Optional[datetime]) -> float:
    """
    Calculates response time in minutes: notified - detected.
    Returns 0.0 if either timestamp is missing or negative.
    """
    if not detected_time or not notified_time:
        return 0.0
    diff_seconds = (notified_time - detected_time).total_seconds()
    if diff_seconds < 0:
        return 0.0
    return round(diff_seconds / 60.0, 1)


def compute_repair_time(on_work_time: Optional[datetime], work_done_time: Optional[datetime]) -> float:
    """
    Calculates repair time in minutes: work_done - on_work.
    Returns 0.0 if either timestamp is missing or negative.
    """
    if not on_work_time or not work_done_time:
        return 0.0
    diff_seconds = (work_done_time - on_work_time).total_seconds()
    if diff_seconds < 0:
        return 0.0
    return round(diff_seconds / 60.0, 1)
