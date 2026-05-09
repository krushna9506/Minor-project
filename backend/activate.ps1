# PowerShell script to activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& "$PSScriptRoot\venv\Scripts\Activate.ps1"
Write-Host "Environment activated!" -ForegroundColor Green
Write-Host ""
Write-Host "To install dependencies, run: pip install -r requirements.txt" -ForegroundColor Cyan
Write-Host "To start the development server, run: uvicorn app.main:app --reload" -ForegroundColor Cyan
