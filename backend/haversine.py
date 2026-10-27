import math
from typing import List, Optional, Tuple, Any
from backend.config import config


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two points on Earth in kilometers
    using the Haversine formula.
    """
    R = 6371.0  # Earth's radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    
    # Clamp to avoid numerical inaccuracies with math.sqrt
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    distance_km = R * c
    return round(distance_km, 3)


def calculate_eta_minutes(distance_km: float, speed_kmh: float = None, overhead_minutes: float = None) -> float:
    """Calculates estimated response time (travel time + dispatch overhead)."""
    if speed_kmh is None:
        speed_kmh = config.RESPONSE_TEAM_SPEED_KMH
    if overhead_minutes is None:
        overhead_minutes = config.DISPATCH_OVERHEAD_MINUTES

    travel_minutes = (distance_km / max(1.0, speed_kmh)) * 60.0
    total_eta = travel_minutes + overhead_minutes
    return round(total_eta, 1)


def find_nearest_team(
    sensor_lat: float,
    sensor_lng: float,
    teams: List[Any]
) -> Tuple[Optional[Any], Optional[float], Optional[float]]:
    """
    Finds the nearest maintenance team by Haversine distance regardless of availability.
    Returns: (nearest_team, distance_km, eta_minutes)
    """
    if not teams:
        return None, None, None

    nearest_team = None
    min_dist = float('inf')

    for team in teams:
        dist = haversine_distance(sensor_lat, sensor_lng, team.lat, team.lng)
        if dist < min_dist:
            min_dist = dist
            nearest_team = team

    if nearest_team is not None:
        eta = calculate_eta_minutes(min_dist)
        return nearest_team, min_dist, eta

    return None, None, None


def find_nearest_available_team(
    sensor_lat: float,
    sensor_lng: float,
    teams: List[Any],
    fallback_to_all: bool = False
) -> Tuple[Optional[Any], Optional[float], Optional[float]]:
    """
    Finds the nearest available maintenance team from a list of teams.
    If no team is currently available and fallback_to_all is True, falls back to the
    nearest team overall so an emergency dispatch is never left without a location.
    Returns: (nearest_team, distance_km, eta_minutes)
    If no team is available, returns (None, None, None).
    """
    available_teams = [t for t in teams if getattr(t, "status", None) == "available"]
    if not available_teams:
        if fallback_to_all and teams:
            return find_nearest_team(sensor_lat, sensor_lng, teams)
        return None, None, None

    return find_nearest_team(sensor_lat, sensor_lng, available_teams)

