import urllib.request
import json

url = "https://trilens-backend-gfgu.onrender.com/auth/register"
data = json.dumps({
    "full_name": "tanisha",
    "email": "tanz@gmail.com",
    "password": "demo123",
    "confirm_password": "demo123",
    "role": "patient"
}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print("Response payload:", e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", e)
