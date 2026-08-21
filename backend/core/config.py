from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGIN: str = "http://localhost:5173"

    DATABASE_URL: Optional[str] = None

    USE_MOCK_DATA: bool = True

    LSTM_MODEL_PATH: str = "ml/models/lstm_autoencoder.pt"
    TGAT_MODEL_PATH: str = "ml/models/tgat_final.pt"
    XGB_MODEL_PATH:  str = "ml/models/xgb_classifier.pkl"
    SHAP_EXPLAINER_PATH: str = "ml/models/shap_explainer.pkl"

    ARDUINO_PORT: str = "/dev/ttyUSB0"
    ARDUINO_BAUD: int = 9600
    ARDUINO_MOCK: bool = True

    ANOMALY_THRESHOLD:   float = 3.5
    FAULT_PROB_WARNING:  float = 0.40
    FAULT_PROB_CRITICAL: float = 0.70

    class Config:
        env_file = "backend/.env"
        extra = "ignore"


settings = Settings()
