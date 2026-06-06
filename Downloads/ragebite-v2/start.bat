@echo off
echo Starting setup...

:: Check for Node.js and PostgreSQL
where node >nul 2>nul || (echo Node.js not found & pause & exit)
where psql >nul 2>nul || (echo PostgreSQL not found & pause & exit)

:: Setup Database
echo Creating database...
psql -U postgres -c "CREATE DATABASE ragebite;"

:: Setup Backend
echo Installing backend...
cd backend
call npm install
start cmd /k "node index.js"
cd ..

:: Setup Frontend
echo Installing frontend...
cd frontend
call npm install
start cmd /k "npm run dev"
cd ..

echo Setup complete.
start http://localhost:3000
pause