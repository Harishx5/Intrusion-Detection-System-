WHITELIST = [
    "192.168.1.0/24",
    "172.64.0.0/16"
]

def is_whitelisted(ip):
    return ip.startswith("192.168.") or ip.startswith("172.64.")
