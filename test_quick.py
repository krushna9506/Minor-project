import requests
import json
import time

print("Testing endpoint without authentication first")
print("=" * 80)

# Try to get courses without auth
try:
    response = requests.get('http://localhost:8000/api/v1/courses/', timeout=5)
    print(f'Courses endpoint status: {response.status_code}')
    print(f'Response: {response.text[:300]}')
except Exception as e:
    print(f'Error: {e}')

# Try login
print("\nTrying login...")
try:
    login_response = requests.post('http://localhost:8000/api/v1/auth/login', 
                                  json={"username": "admin@example.com", "password": "admin123"},
                                  timeout=5)
    print(f'Login status: {login_response.status_code}')
    print(f'Login response: {login_response.text[:300]}')
except Exception as e:
    print(f'Login error: {e}')
