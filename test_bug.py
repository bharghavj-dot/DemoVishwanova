import urllib.request
import json
import uuid

base_url = "https://trilens-backend-gfgu.onrender.com"
email = f"pending{uuid.uuid4().hex[:4]}@trilens.med"

# Demo Guardian test token or just use the system's demo-login
demo_data = json.dumps({"role": "guardian"}).encode()
req1 = urllib.request.Request(f"{base_url}/auth/demo-login", data=demo_data, headers={'Content-Type': 'application/json'})
resp1 = json.loads(urllib.request.urlopen(req1).read().decode())
token = resp1["access_token"]

# Add family member with pending email
fam_data = json.dumps({
    "name": "Test Child",
    "relationship": "Child",
    "email": email
}).encode()
req2 = urllib.request.Request(f"{base_url}/family/members", data=fam_data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
try:
    resp2 = urllib.request.urlopen(req2)
    print("Added family member with pending email:", email)
except Exception as e:
    print("Failed to add family member:", e.read().decode())

# Register the pending email
reg_data = json.dumps({
    "full_name": "Test Child",
    "email": email,
    "password": "password123",
    "confirm_password": "password123",
    "role": "patient"
}).encode()
req3 = urllib.request.Request(f"{base_url}/auth/register", data=reg_data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req3)
    print("Success! Registered successfully:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print("Response payload:", e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", e)
