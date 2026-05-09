import requests
import time

# Give servers a moment to be ready
time.sleep(2)

print('=' * 60)
print('API ENDPOINT TEST RESULTS')
print('=' * 60)

endpoints = [
    'http://localhost:8000/api/v1/courses/',
    'http://localhost:8000/api/v1/faculty/',
    'http://localhost:8000/api/v1/student-groups/',
    'http://localhost:8000/api/v1/rooms/',
]

results = []
for url in endpoints:
    try:
        response = requests.get(url, timeout=5)
        print(f'\n{url}')
        print(f'  Status Code: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f'  Items Count: {len(data)}')
                if len(data) > 0:
                    print(f'  First Item Keys: {list(data[0].keys())}')
                results.append((url, response.status_code, len(data)))
            else:
                print(f'  Response Type: {type(data).__name__}')
        else:
            try:
                error_data = response.json()
                print(f'  Error: {error_data}')
            except:
                print(f'  Error Text: {response.text[:100]}')
            results.append((url, response.status_code, 'N/A'))
    except Exception as e:
        print(f'\n{url}')
        print(f'  Connection Error: {str(e)}')
        results.append((url, 'Error', str(e)))

print('\n' + '=' * 60)
print('SUMMARY')
print('=' * 60)
for endpoint, status, count in results:
    print(f'{endpoint}')
    print(f'  Status: {status}, Items: {count}')
