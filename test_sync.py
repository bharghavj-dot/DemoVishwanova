import urllib.request
import time

for _ in range(30):
    try:
        req = urllib.request.Request("https://trilens-backend-gfgu.onrender.com/sync-family")
        res = urllib.request.urlopen(req).read().decode()
        print("API Response:", res)
        if "Successfully synced" in res or "error" in res:
            break
    except urllib.error.HTTPError as e:
        print("Waiting for deployment...", e.code)
    except Exception as e:
        print("Waiting...", e)
    time.sleep(15)
