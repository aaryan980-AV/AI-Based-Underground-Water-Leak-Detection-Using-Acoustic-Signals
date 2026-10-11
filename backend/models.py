from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base


class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(String(20), default="normal")  # normal, leak, offline
    last_reading_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    alerts = relationship("Alert", back_populates="sensor", cascade="all, delete-orphan")


class MaintenanceTeam(Base):
    __tablename__ = "teams"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    phone = Column(String(30), nullable=False)
    status = Column(String(20), default="available")  # available, busy

    # Relationships
    alerts = relationship("Alert", back_populates="assigned_team")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    sensor_id = Column(String(50), ForeignKey("sensors.id"), nullable=False)
    confidence = Column(Float, nullable=False)
    # Valid workflow statuses: notified -> on_work -> work_done -> cleared
    status = Column(String(30), default="notified", index=True)
    assigned_team_id = Column(String(50), ForeignKey("teams.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    notified_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)     # when set to 'on_work'
    completed_at = Column(DateTime, nullable=True)   # when set to 'work_done'
    cleared_at = Column(DateTime, nullable=True)     # when set to 'cleared'

    # Relationships
    sensor = relationship("Sensor", back_populates="alerts")
    assigned_team = relationship("MaintenanceTeam", back_populates="alerts")
    events = relationship("AlertEvent", back_populates="alert", cascade="all, delete-orphan", order_by="AlertEvent.timestamp.asc()")


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    note = Column(Text, nullable=True)

    # Relationship
    alert = relationship("Alert", back_populates="events")
