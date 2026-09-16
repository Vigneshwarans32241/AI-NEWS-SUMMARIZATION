import requests
import json

url = "http://localhost:8003/api/auth/register"
data = {"username":"test_user_8003", "email":"test8003@test.com", "password":"password"}

try:
    response = requests.post(url, json=data)
    print("Status:", response.status_code)
except Exception as e:
    pass
