"""Quick smoke-test for the Trilens API."""
import urllib.request, json, sys

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0

def post(path, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=json.dumps(data).encode(), headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

def get(path, token):
    req = urllib.request.Request(BASE + path, headers={"Authorization": f"Bearer {token}"})
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

def check(name, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}")

# 1. Health
print("=== Health Check ===")
h = json.loads(urllib.request.urlopen(BASE + "/health").read())
check("status is ok", h["status"] == "ok")
check("version is 1.0.0", h["version"] == "1.0.0")

# 2. Demo Login (Patient)
print("\n=== Demo Login (Patient) ===")
res = post("/auth/demo-login", {"role": "patient"})
token = res["access_token"]
check("got access_token", len(token) > 0)
check("user role is patient", res["user"]["role"] == "patient")
check("user name is Alex Morgan", res["user"]["full_name"] == "Alex Morgan")

# 3. Demo Login (Doctor)
print("\n=== Demo Login (Doctor) ===")
doc_res = post("/auth/demo-login", {"role": "doctor"})
doc_token = doc_res["access_token"]
check("got doctor token", len(doc_token) > 0)
check("doctor role", doc_res["user"]["role"] == "doctor")

# 4. Demo Login (Guardian)
print("\n=== Demo Login (Guardian) ===")
guard_res = post("/auth/demo-login", {"role": "guardian"})
guard_token = guard_res["access_token"]
check("got guardian token", len(guard_token) > 0)

# 5. Register
print("\n=== Register ===")
reg = post("/auth/register", {
    "full_name": "Test User",
    "email": "test@trilens.med",
    "password": "test123",
    "confirm_password": "test123",
    "role": "patient"
})
check("registered successfully", "access_token" in reg)
check("has patient_id", reg["user"].get("patient_id") is not None)

# 6. Login
print("\n=== Login ===")
login = post("/auth/login", {"email": "test@trilens.med", "password": "test123", "role": "patient"})
check("login successful", "access_token" in login)

# 7. Get Me
print("\n=== Get Me ===")
me = get("/auth/me", token)
check("got user info", me["full_name"] == "Alex Morgan")

# 8. Doctors
print("\n=== Doctors ===")
docs = get("/doctors?category=All", token)
check("got doctors list", len(docs["doctors"]) > 0)
check("has categories", len(docs["categories"]) == 4)
print(f"     Found {len(docs['doctors'])} doctors")

# 9. Profile
print("\n=== Profile ===")
prof = get("/profile", token)
check("got profile", prof["full_name"] == "Alex Morgan")
check("has patient_id", prof["patient_id"] is not None)

# 10. Family (Guardian)
print("\n=== Family Dashboard ===")
fam = get("/family/members", guard_token)
check("got family members", len(fam["members"]) == 3)
check("Sarah is Spouse", fam["members"][0]["relationship"] == "Spouse")
check("Leo has new report", fam["members"][1]["has_new_report"] == True)

# 11. Doctor Dashboard
print("\n=== Doctor Dashboard ===")
dd = get("/doctor/dashboard", doc_token)
check("got stats", dd["stats"]["total_patients"] >= 0)
check("has bookings list", isinstance(dd["bookings"], list))

# 12. Report History (empty for fresh user)
print("\n=== Report History ===")
hist = get("/reports/history", token)
check("got history", isinstance(hist["reports"], list))

# Summary
print(f"\n{'='*50}")
print(f"  Results: {PASS} passed, {FAIL} failed out of {PASS+FAIL}")
print(f"{'='*50}")
sys.exit(1 if FAIL > 0 else 0)
