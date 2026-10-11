import unittest
from backend.haversine import haversine_distance, calculate_eta_minutes, find_nearest_available_team
from backend.workflow import can_transition, get_next_valid_steps, ALLOWED_NEXT_TRANSITIONS


class MockTeam:
    def __init__(self, id, name, lat, lng, status="available"):
        self.id = id
        self.name = name
        self.lat = lat
        self.lng = lng
        self.status = status


class TestWaterLeakCore(unittest.TestCase):

    def test_haversine_distance_known_coordinates(self):
        # Austin downtown (30.2672, -97.7431) to Austin Airport (30.1975, -97.6664)
        dist = haversine_distance(30.2672, -97.7431, 30.1975, -97.6664)
        self.assertTrue(10.0 <= dist <= 11.0, f"Distance {dist} should be around 10.5 km")

    def test_haversine_distance_zero(self):
        dist = haversine_distance(30.2672, -97.7431, 30.2672, -97.7431)
        self.assertEqual(dist, 0.0)

    def test_find_nearest_available_team(self):
        sensor_lat, sensor_lng = 30.2672, -97.7431
        # Team A: available, ~1km
        team_a = MockTeam("T1", "Team Alpha", 30.2762, -97.7431, "available")
        # Team B: busy, ~0.1km
        team_b = MockTeam("T2", "Team Beta", 30.2682, -97.7431, "busy")
        # Team C: available, ~5km
        team_c = MockTeam("T3", "Team Gamma", 30.3100, -97.7431, "available")

        nearest, dist, eta = find_nearest_available_team(sensor_lat, sensor_lng, [team_a, team_b, team_c])

        # Skips busy Team B and dispatches available Team A
        self.assertIsNotNone(nearest)
        self.assertEqual(nearest.id, "T1")
        self.assertLess(dist, 2.0)
        self.assertGreater(eta, 0.0)

    def test_find_nearest_team_all_busy(self):
        sensor_lat, sensor_lng = 30.2672, -97.7431
        team_busy = MockTeam("T1", "Team Alpha", 30.2762, -97.7431, "busy")

        nearest, dist, eta = find_nearest_available_team(sensor_lat, sensor_lng, [team_busy])
        self.assertIsNone(nearest)
        self.assertIsNone(dist)
        self.assertIsNone(eta)

    def test_state_machine_valid_transitions(self):
        self.assertTrue(can_transition("notified", "on_work"))
        self.assertTrue(can_transition("on_work", "work_done"))
        self.assertTrue(can_transition("work_done", "cleared"))

    def test_state_machine_invalid_skips_and_reversals(self):
        # Cannot skip
        self.assertFalse(can_transition("notified", "cleared"))
        self.assertFalse(can_transition("notified", "work_done"))
        # Cannot reverse
        self.assertFalse(can_transition("work_done", "notified"))
        self.assertFalse(can_transition("work_done", "on_work"))
        # Cleared is terminal
        self.assertFalse(can_transition("cleared", "on_work"))
        self.assertFalse(can_transition("cleared", "notified"))

    def test_state_machine_allowed_next_steps(self):
        self.assertEqual(get_next_valid_steps("notified"), ["on_work"])
        self.assertEqual(get_next_valid_steps("on_work"), ["work_done"])
        self.assertEqual(get_next_valid_steps("work_done"), ["cleared"])
        self.assertEqual(get_next_valid_steps("cleared"), [])


if __name__ == "__main__":
    unittest.main()
