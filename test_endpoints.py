import requests
import json
import time

# Give server a moment to fully start
time.sleep(2)

print('BACKEND AUTHENTICATION AND ENDPOINT TESTING')
print('=' * 80)

# Step 1: Check if server is responding
print('\n1. SERVER HEALTH CHECK')
print('-' * 80)
try:
    response = requests.get('http://localhost:8000/docs', timeout=5)
    print(f'   FastAPI Docs: Status {response.status_code}')
    if response.status_code == 200:
        print('   Server is RUNNING and responding')
except Exception as e:
    print(f'   Error: {e}')

# Step 2: Attempt login
print('\n2. AUTHENTICATION')
print('-' * 80)
login_url = 'http://localhost:8000/api/v1/auth/login'
print(f'   Attempting login at: {login_url}')

token = None
headers = {}

try:
    login_response = requests.post(login_url, 
                                  data={'username': 'admin@example.com', 'password': 'admin123'},
                                  timeout=5)
    print(f'   Login Status: {login_response.status_code}')
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        token = token_data.get('access_token')
        print(f'   Login successful - Token obtained')
        headers = {'Authorization': f'Bearer {token}'}
    else:
        print(f'   Login Response: {login_response.text[:200]}')
except Exception as e:
    print(f'   Login Error: {e}')

# Step 3: Test all endpoints
print('\n3. API ENDPOINT TESTS WITH AUTHENTICATION')
print('-' * 80)

endpoints = [
    ('Courses', 'http://localhost:8000/api/v1/courses/'),
    ('Faculty', 'http://localhost:8000/api/v1/faculty/'),
    ('Student Groups', 'http://localhost:8000/api/v1/student-groups/'),
    ('Rooms', 'http://localhost:8000/api/v1/rooms/'),
]

results = []
for name, url in endpoints:
    print(f'\n   {name}:')
    print(f'   URL: {url}')
    try:
        response = requests.get(url, headers=headers, timeout=5)
        print(f'   Status: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            item_count = len(data) if isinstance(data, list) else 'N/A'
            print(f'   Items Count: {item_count}')
            
            if data and isinstance(data, list) and len(data) > 0:
                fields = list(data[0].keys())
                print(f'   Fields: {fields}')
                results.append({'name': name, 'status': 200, 'items': item_count, 'fields': fields})
            else:
                results.append({'name': name, 'status': 200, 'items': item_count, 'fields': []})
        else:
            print(f'   Response: {response.text[:150]}')
            results.append({'name': name, 'status': response.status_code, 'items': 'N/A', 'fields': []})
    except Exception as e:
        print(f'   Error: {str(e)[:100]}')
        results.append({'name': name, 'status': 'ERROR', 'items': 'N/A', 'fields': []})

print('\n' + '=' * 80)
print('SUMMARY - AUTHENTICATED API ENDPOINT RESULTS')
print('=' * 80)
for result in results:
    print(f'\n{result["name"]}:')
    print(f'  Status Code: {result["status"]}')
    print(f'  Item Count: {result["items"]}')
    if result['fields']:
        print(f'  Fields: {result["fields"]}')
