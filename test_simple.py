import requests
import json

print('BACKEND API ENDPOINT TEST RESULTS')
print('=' * 80)

endpoints = [
    ('Courses', 'http://localhost:8000/api/v1/courses/'),
    ('Faculty', 'http://localhost:8000/api/v1/faculty/'),
    ('Student Groups', 'http://localhost:8000/api/v1/student-groups/'),
    ('Rooms', 'http://localhost:8000/api/v1/rooms/'),
]

for name, url in endpoints:
    try:
        response = requests.get(url, timeout=5)
        print(f'\n{name}:')
        print(f'  URL: {url}')
        print(f'  Status Code: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            item_count = len(data) if isinstance(data, list) else 'N/A'
            print(f'  Item Count: {item_count}')
            
            if data and isinstance(data, list) and len(data) > 0:
                fields = list(data[0].keys())
                print(f'  Fields: {fields}')
        else:
            print(f'  Error Response: {response.text[:200]}')
    except Exception as e:
        print(f'\n{name}:')
        print(f'  Error: {str(e)}')

print('\n' + '=' * 80)
