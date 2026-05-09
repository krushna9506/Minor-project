# PowerShell script to start the ShedMaster Backend
Write-Host "🚀 Starting ShedMaster Backend..." -ForegroundColor Green
Set-Location backend
Write-Host "📁 Changed to backend directory" -ForegroundColor Yellow

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "📝 Create a .env file with the following content:" -ForegroundColor Cyan
    Write-Host "MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net" -ForegroundColor White
    Write-Host "SECRET_KEY=your-secret-key-here" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use local MongoDB: MONGODB_URL=mongodb://localhost:27017" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Activate virtual environment
if (Test-Path "activate.ps1") {
    Write-Host "🔧 Activating Python environment..." -ForegroundColor Cyan
    .\activate.ps1
}

Write-Host "🌐 Starting FastAPI server..." -ForegroundColor Green
Write-Host "📊 API Documentation will be available at: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "🔗 API will be running at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📝 Demo Login: admin@example.com / admin123" -ForegroundColor Yellow
Write-Host ""

# Start the server with local MongoDB connection
$env:MONGODB_URL = "mongodb://localhost:27017"
$env:PYTHONPATH = "$PSScriptRoot\backend"

& "venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
