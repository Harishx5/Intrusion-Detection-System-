import time
from collections import defaultdict

baseline_stats = defaultdict(lambda: {
    "packet_count": 0,
    "start_time": time.time()
})

def update_baseline(ip):
    data = baseline_stats[ip]
    data["packet_count"] += 1

def get_rate(ip):
    data = baseline_stats[ip]
    elapsed = time.time() - data["start_time"]
    
    if elapsed == 0:
        return 0
        
    return data["packet_count"] / elapsed

def reset_baseline():
    for ip in baseline_stats:
        baseline_stats[ip]["packet_count"] = 0
        baseline_stats[ip]["start_time"] = time.time()
