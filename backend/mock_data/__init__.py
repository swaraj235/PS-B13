import json
import os

MOCK_DIR = os.path.join(os.path.dirname(__file__))


def load_mock(filename: str) -> dict:
    """Load a mock JSON file from the mock_data directory."""
    path = os.path.join(MOCK_DIR, filename)
    with open(path, "r") as f:
        return json.load(f)
