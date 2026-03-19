from collections import defaultdict
from typing import Dict, Any

def _default_behavior() -> Dict[str, Any]:
    return {
        "connections": 0,
        "unique_ips": set(),
        "unique_ports": set()
    }

behavior: Dict[str, Dict[str, Any]] = defaultdict(_default_behavior)

def track(ip, dst_ip):
    behavior[ip]["connections"] += 1
    behavior[ip]["unique_ips"].add(dst_ip)

def get_behavior(ip):
    return behavior[ip]
