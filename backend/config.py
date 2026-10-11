import os
from pydantic import BaseModel


class AppConfig(BaseModel):
    # City Center: Mumbai, India (BMC Hydraulic Network)
    CITY_NAME: str = os.getenv("CITY_NAME", "Mumbai Metropolitan Water Grid (BMC)")
    CITY_CENTER_LAT: float = float(os.getenv("CITY_CENTER_LAT", "19.0760"))
    CITY_CENTER_LNG: float = float(os.getenv("CITY_CENTER_LNG", "72.8777"))
    
    # ML Detection & Debounce
    CONFIDENCE_ALERT_THRESHOLD: float = float(os.getenv("CONFIDENCE_ALERT_THRESHOLD", "0.85"))
    CONSECUTIVE_LEAKS_THRESHOLD: int = int(os.getenv("CONSECUTIVE_LEAKS_THRESHOLD", "2"))
    
    # Response Speed Estimation (km/h in urban Mumbai traffic with emergency siren)
    RESPONSE_TEAM_SPEED_KMH: float = 30.0
    DISPATCH_OVERHEAD_MINUTES: float = 5.0
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./water_leak.db")


config = AppConfig()
