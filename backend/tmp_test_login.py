import requests

data={'username':'admin@example.com','password':'admin123'}
resp=requests.post('http://localhost:8000/api/v1/auth/login', data=data)
print(resp.status_code)
print(resp.text)
