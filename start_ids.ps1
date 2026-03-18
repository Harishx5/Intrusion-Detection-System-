Write-Host "Starting IDS Dashboard..."
Start-Process powershell -ArgumentList "npm run dev"

Start-Sleep -Seconds 5

Write-Host "Starting Python IDS Agent..."
Start-Process powershell -ArgumentList "python docs/ids_agent.py"

Start-Sleep -Seconds 3

Write-Host "Launching Desktop IDS App..."
npm start
