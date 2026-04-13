import subprocess, time, urllib.request, json
p = subprocess.Popen(['python', '-m', 'uvicorn', 'backend.main:app', '--port', '8080'])
time.sleep(3)
req = urllib.request.Request('http://localhost:8080/auth/register', data=json.dumps({'full_name': 'Test', 'email': 'localtest@test.com', 'password': 'password123', 'confirm_password': 'password123', 'role': 'patient'}).encode(), headers={'Content-Type': 'application/json'})
try:
    print("Response:", urllib.request.urlopen(req).read().decode())
except Exception as e:
    print('Error:', getattr(e, 'code', e), getattr(e, 'read', lambda: b'')().decode())
finally:
    p.terminate()
