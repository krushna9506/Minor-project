import requests
import json

try:
    response = requests.post('http://localhost:8000/api/v1/auth/login', data={'username': 'admin@example.com', 'password': 'admin123'})
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {str(e)}")
