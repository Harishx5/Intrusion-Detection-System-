from sklearn.ensemble import IsolationForest
import numpy as np

class AIAnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1)
        self.trained = False
        self.training_data = []
        self.min_samples_to_train = 10

    def train(self, data):
        self.model.fit(data)
        self.trained = True

    def collect_and_train(self, features):
        if not self.trained:
            self.training_data.append(features)
            if len(self.training_data) >= self.min_samples_to_train:
                self.train(self.training_data)

    def predict(self, features, source_ip="Multiple/System"):
        # Auto-collect for training if not trained
        if not self.trained:
            self.collect_and_train(features)
            return None

        result = self.model.predict([features])
        
        # Calculate a pseudo-confidence score from isolated forest decision function
        raw_score = self.model.decision_function([features])[0]
        # For anomalies, raw_score is negative. Normalize it to a 50-100% confidence.
        confidence = 0
        if result[0] == -1:
            confidence = int(min(100, max(50, abs(raw_score) * 200 + 50)))

        if result[0] == -1:
            return {
                "alert_type": "AI Anomaly",  # System parser compatibility
                "type": "AI Anomaly",        # Explicit type user requested
                "severity": "high",
                "source_ip": source_ip, 
                "description": "Unknown attack detected by AI anomaly detector",
                "source": "AI",
                "confidence": round(confidence / 100.0, 2), # e.g. 0.92
                "metadata": {
                    "source": "AI",
                    "type": "Unknown Attack",
                    "confidence": confidence
                }
            }
        return None
