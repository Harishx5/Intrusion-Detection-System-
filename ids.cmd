@echo off

if "%1"=="start" (
    start cmd /k npm run dev
    timeout /t 5 > nul
    start cmd /k python docs\ids_agent.py
    timeout /t 3 > nul
    npm start
)
