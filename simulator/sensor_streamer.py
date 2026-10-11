import os
import glob
import time
import random
import requests
import threading

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")


class SensorSimulator:
    """
    Simulates continuous acoustic data streaming from all active pipeline sensors.
    Sensors periodically send acoustic clips (98% NO_LEAK, 2% spontaneous leak) to POST /api/sensors/{id}/reading.
    """
    def __init__(self, api_url: str = API_BASE_URL, interval_seconds: float = 6.0):
        self.api_url = api_url
        self.interval = interval_seconds
        self.running = False
        self.thread = None

        # Gather dataset samples
        self.no_leak_files = glob.glob(os.path.join("data", "no leak acoustic data", "**", "*.wav"), recursive=True)
        self.leak_files = glob.glob(os.path.join("data", "leak acoustic data", "**", "*.wav"), recursive=True)

        print(f"[Simulator] Initialized with {len(self.no_leak_files)} normal clips and {len(self.leak_files)} leak clips.")

    def _stream_loop(self):
        print(f"[Simulator] Started background streaming cycle every ~{self.interval}s.")
        while self.running:
            try:
                # 1. Fetch current sensors from API
                resp = requests.get(f"{self.api_url}/sensors", timeout=5)
                if resp.status_code == 200:
                    sensors = resp.json()
                    # Pick 2-3 random sensors to report in each cycle (staggered)
                    reporting_sensors = random.sample(sensors, min(len(sensors), random.randint(2, 4)))
                    for sensor in reporting_sensors:
                        # Skip if sensor already has a leak alert to avoid spamming
                        if sensor.get("status") == "leak":
                            continue

                        # Mostly normal acoustic environment
                        is_leak_sample = random.random() < 0.03  # 3% chance of natural anomaly
                        chosen_pool = self.leak_files if (is_leak_sample and self.leak_files) else self.no_leak_files
                        if not chosen_pool:
                            continue

                        sample_file = random.choice(chosen_pool)
                        with open(sample_file, "rb") as f:
                            files = {"file": (os.path.basename(sample_file), f, "audio/wav")}
                            sensor_id = sensor["id"]
                            try:
                                r = requests.post(f"{self.api_url}/sensors/{sensor_id}/reading", files=files, timeout=5)
                                # print(f"[Simulator] {sensor_id} reported: {r.status_code}")
                            except Exception as e:
                                print(f"[Simulator] Failed to send reading for {sensor_id}: {e}")

            except Exception as ex:
                print(f"[Simulator] Cycle error: {ex}")

            time.sleep(self.interval)

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._stream_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False


# Standalone runner
if __name__ == "__main__":
    print("Starting Standalone Sensor Simulator...")
    sim = SensorSimulator()
    sim.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping simulator.")
        sim.stop()
