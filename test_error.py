import requests
import json

url = "http://localhost:8001/api/auth/register"
data = {"username":"test_user_new99", "email":"testnew99@test.com", "password":"password"}

try:
    response = requests.post(url, json=data)
    print("Status:", response.status_code)
    with open("error_trace.txt", "w") as f:
        f.write(response.json().get("traceback", response.text))
except Exception as e:
    print("Error:", e)
