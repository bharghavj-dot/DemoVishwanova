import urllib.request
import json
import uuid

base_url = "https://trilens-backend-gfgu.onrender.com"

rand_suffix = uuid.uuid4().hex[:4]
guardian_email = f"guard_{rand_suffix}@test.com"
child_email = f"child_{rand_suffix}@test.com"

# 1. Register Guardian
req_g = urllib.request.Request(f"{base_url}/auth/register", data=json.dumps({
    "full_name": "Test Guardian", "email": guardian_email, "password": "password", "confirm_password": "password", "role": "guardian"
}).encode(), headers={'Content-Type': 'application/json'})
g_token = json.loads(urllib.request.urlopen(req_g).read().decode())["access_token"]

# 2. Add Family Member (child)
req_add = urllib.request.Request(f"{base_url}/family/members", data=json.dumps({
    "name": "My Child", "relationship": "Child", "email": child_email
}).encode(), headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {g_token}'})
member = json.loads(urllib.request.urlopen(req_add).read().decode())
member_id = member["id"]

# 3. Register Child
req_c = urllib.request.Request(f"{base_url}/auth/register", data=json.dumps({
    "full_name": "My Child", "email": child_email, "password": "password", "confirm_password": "password", "role": "patient"
}).encode(), headers={'Content-Type': 'application/json'})
c_res = json.loads(urllib.request.urlopen(req_c).read().decode())
c_token = c_res["access_token"]
c_uid = c_res["user"]["id"]

# 4. Generate Report for Child
# We need to create a diagnostic session, then a report.
# There may not be an explicit API to just "create a report" but we can mock it or check if it exists?
# The LLM pipeline creates reports. For testing, we can just look up linked_user_id.
# Wait, let's just re-fetch family members for Guardian to see if the child's has_new_report or reports is initialized?
# Without a report, we can't test see reports.

# Let's test if the DB link actually occurred by registering Child BEFORE Guardian adds them! Wait, the problem child was added AFTER registration!
# Let's try what the user did:
# Add ANOTHER Child with an email that is ALREADY registered.
child2_email = f"child2_{rand_suffix}@test.com"
# Register child2 first
req_c2 = urllib.request.Request(f"{base_url}/auth/register", data=json.dumps({
    "full_name": "Child Two", "email": child2_email, "password": "password", "confirm_password": "password", "role": "patient"
}).encode(), headers={'Content-Type': 'application/json'})
json.loads(urllib.request.urlopen(req_c2).read().decode())

# Now Guardian adds child2
req_add2 = urllib.request.Request(f"{base_url}/family/members", data=json.dumps({
    "name": "Child Two Linked", "relationship": "Child", "email": child2_email
}).encode(), headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {g_token}'})
member2 = json.loads(urllib.request.urlopen(req_add2).read().decode())

print("Added pre-registered child. Response has reports field type:", type(member2.get("reports")))

# Fetch members list to see if backend thinks they're linked
req_mem = urllib.request.Request(f"{base_url}/family/members", headers={'Authorization': f'Bearer {g_token}'})
members_res = json.loads(urllib.request.urlopen(req_mem).read().decode())
for m in members_res["members"]:
    print(f"Member: {m['name']}, Reports: {m.get('reports')}")
