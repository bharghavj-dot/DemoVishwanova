import urllib.request
import json

base_url = "https://trilens-backend-gfgu.onrender.com"

# Login
log_req = urllib.request.Request(f"{base_url}/auth/login", data=json.dumps({"email": "tanz@gmail.com", "password": "demo123", "role": "patient"}).encode(), headers={'Content-Type': 'application/json'})
try:
    resp = json.loads(urllib.request.urlopen(log_req).read().decode())
    token = resp["access_token"]
except Exception as e:
    print("Login Failed:", getattr(e, 'code', e))
    exit(1)

headers = {"Authorization": f"Bearer {token}"}
endpoints = ["/auth/me", "/profile", "/profile/records", "/reports/history", "/family/members"]

for ep in endpoints:
    url = f"{base_url}{ep}"
    req = urllib.request.Request(url, headers=headers)
    try:
        r = urllib.request.urlopen(req)
        print(f"[{ep}] Success: HTTP {r.getcode()} Output: {r.read().decode()[:100]}")
    except Exception as e:
        print(f"[{ep}] ERROR:", getattr(e, 'code', e), getattr(e, 'read', lambda: b'')().decode())
