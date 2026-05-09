@echo off
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Environment activated!
echo.

echo Installing dependencies...
pip install -r requirements.txt

echo Starting development server...
python -m uvicorn app.main:app --reload

pause
