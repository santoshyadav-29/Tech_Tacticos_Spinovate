# Quick Start Script for Beta Release

# 1. Install Backend Dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
pip install -r requirements.txt

# 2. Start Backend (in background)
Write-Host "`nStarting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m app.main"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# 3. Setup Frontend
Write-Host "`nSetting up frontend..." -ForegroundColor Cyan
Set-Location ../frontend

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    Copy-Item ".env.local.example" ".env.local"
}

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install

# 4. Start Frontend
Write-Host "`nStarting frontend..." -ForegroundColor Cyan
npm run dev

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
