# Project workspace setup tasks

- [x] Create base project structure
- [ ] Set up MongoDB database
- [ ] Install dependencies
- [ ] Start the server
- [ ] Create initial admin user

This file contains common tasks for setting up and working with this project.

## Initial Setup

1. Create a virtual environment:

   ```
   # Windows (using py command)
   py -m venv venv

   # Windows (using python command)
   python -m venv venv

   # Linux/Mac
   python3 -m venv venv
   ```

2. Activate the virtual environment:

   ```
   # Windows
   venv\Scripts\activate

   # Alternative: use the included batch file
   activate.bat

   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file:

   ```
   cp .env.example .env
   # Edit .env and set your own SECRET_KEY
   ```

5. Start MongoDB (if not using Docker):
   ```
   # Install MongoDB locally or use Docker:
   docker run -d -p 27017:27017 --name mongodb mongo:5.0
   ```

## Running the Application

### Using Python directly:

```
uvicorn app.main:app --reload
```

### Using Docker Compose:

```
docker-compose up -d
```

## API Documentation

After starting the server, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
