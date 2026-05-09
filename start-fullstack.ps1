# AI Timetable System - Complete Startup Guide

Write-Host " AI Timetable System - Starting Full Stack Application" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

# Function to start backend
function Start-Backend {
    Write-Host " Starting Backend (FastAPI)..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-Command", "cd '$PSScriptRoot'; .\start-backend.ps1" -WindowStyle Normal
    Write-Host " Backend starting in new window" -ForegroundColor Green
}

# Function to start frontend
function Start-Frontend {
    Write-Host " Starting Frontend (React)..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal
    Write-Host " Frontend starting in new window" -ForegroundColor Green
}

# Main execution
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan

Start-Backend
Start-Sleep -Seconds 2
Start-Frontend

Write-Host ""
Write-Host " Services Information:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173 (or next available port)" -ForegroundColor White
Write-Host ""
Write-Host " Please wait a few moments for services to fully start..." -ForegroundColor Yellow
Write-Host ""
Write-Host " To stop services, close the respective terminal windows" -ForegroundColor Red
Write-Host ""
Write-Host "Happy coding! " -ForegroundColor Green
