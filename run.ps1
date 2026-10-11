Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  AquaGuard AI - Acoustic Leak Detection & Response" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$backend = Start-Process python -ArgumentList "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -PassThru

Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location frontend
$frontend = Start-Process npm -ArgumentList "run", "dev" -PassThru
Set-Location ..

Write-Host ""
Write-Host "AquaGuard AI is running!" -ForegroundColor Cyan
Write-Host "  - Web Dashboard: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  - API Swagger:   http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop services."
