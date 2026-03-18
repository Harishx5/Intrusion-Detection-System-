@echo off
echo Starting IDS Dashboard...

start cmd /k npm run dev

timeout /t 5 > nul

echo Starting IDS Python Agent...

start cmd /k python docs\ids_agent.py

timeout /t 3 > nul

echo Launching Desktop IDS Console...

npm start
