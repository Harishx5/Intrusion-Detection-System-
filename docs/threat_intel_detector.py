import requests

class ThreatIntelDetector:

    def __init__(self):
        self.malicious_ips = set()

    def load_feed(self):
        url = "https://feodotracker.abuse.ch/downloads/ipblocklist.txt"
        try:
            response = requests.get(url, timeout=10)
            for line in response.text.splitlines():
                if line and not line.startswith("#") and line.strip():
                    self.malicious_ips.add(line.strip())
            print(f"[+] Threat Intel loaded {len(self.malicious_ips)} malicious IPs")
        except Exception as e:
            print(f"[-] Failed to load threat intel feed: {e}")

    def check(self, packets):
        alerts = []

        for pkt in packets:
            dst = pkt.get("destination_ip")

            if dst in self.malicious_ips:
                alerts.append({
                    "alert_type": "Threat Intelligence Match",
                    "severity": "critical",
                    "source_ip": pkt["source_ip"],
                    "description": f"Connection to known malicious IP {dst}"
                })

        return alerts
