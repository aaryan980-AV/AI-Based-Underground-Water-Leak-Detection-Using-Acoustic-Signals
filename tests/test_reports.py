import unittest
from datetime import datetime, timedelta
from backend.reports import compute_response_time, compute_repair_time


class TestReportCalculations(unittest.TestCase):

    def test_response_time_calculation(self):
        detected = datetime(2026, 10, 16, 10, 0, 0)
        # Notified 5 minutes after detection
        notified = detected + timedelta(minutes=5)
        response_time = compute_response_time(detected, notified)
        self.assertEqual(response_time, 5.0)

    def test_response_time_fractional_minutes(self):
        detected = datetime(2026, 10, 16, 10, 0, 0)
        # Notified 90 seconds (1.5 min) after detection
        notified = detected + timedelta(seconds=90)
        response_time = compute_response_time(detected, notified)
        self.assertEqual(response_time, 1.5)

    def test_response_time_zero_or_negative(self):
        t = datetime(2026, 10, 16, 10, 0, 0)
        # Same timestamp
        self.assertEqual(compute_response_time(t, t), 0.0)
        # Inverted timestamps
        self.assertEqual(compute_response_time(t, t - timedelta(minutes=2)), 0.0)

    def test_response_time_none_values(self):
        t = datetime(2026, 10, 16, 10, 0, 0)
        self.assertEqual(compute_response_time(None, t), 0.0)
        self.assertEqual(compute_response_time(t, None), 0.0)
        self.assertEqual(compute_response_time(None, None), 0.0)

    def test_repair_time_calculation(self):
        on_work = datetime(2026, 10, 16, 11, 0, 0)
        # Work done 42 minutes after on_work
        work_done = on_work + timedelta(minutes=42)
        repair_time = compute_repair_time(on_work, work_done)
        self.assertEqual(repair_time, 42.0)

    def test_repair_time_fractional_and_seconds(self):
        on_work = datetime(2026, 10, 16, 11, 0, 0)
        # Work done 15 minutes and 30 seconds (15.5 min)
        work_done = on_work + timedelta(minutes=15, seconds=30)
        repair_time = compute_repair_time(on_work, work_done)
        self.assertEqual(repair_time, 15.5)

    def test_repair_time_none_and_invalid(self):
        t = datetime(2026, 10, 16, 11, 0, 0)
        self.assertEqual(compute_repair_time(None, t), 0.0)
        self.assertEqual(compute_repair_time(t, None), 0.0)
        self.assertEqual(compute_repair_time(t, t - timedelta(minutes=10)), 0.0)


if __name__ == "__main__":
    unittest.main()
