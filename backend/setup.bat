@echo off
REM MOVZZ Backend Setup Script for Windows

echo ========================================
echo MOVZZ Backend Setup (Windows)
echo ========================================
echo.

REM Check Node.js
echo Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detected
node --version

REM Check PostgreSQL
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL is not installed
    echo Please install PostgreSQL 14+ from https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo [OK] PostgreSQL detected
psql --version
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Set up environment
if not exist .env (
    echo Setting up environment variables...
    copy .env.example .env
    echo [OK] .env file created
    echo [WARNING] Please update DATABASE_URL in .env with your PostgreSQL credentials
) else (
    echo [WARNING] .env file already exists, skipping...
)
echo.

REM Database setup instructions
echo ========================================
echo Database Setup Instructions
echo ========================================
echo.
echo Please open a new Command Prompt and run:
echo   psql -U postgres
echo.
echo Then execute these SQL commands:
echo   CREATE DATABASE movzz_dev;
echo   CREATE USER movzz WITH PASSWORD 'movzz_secure_password_123';
echo   GRANT ALL PRIVILEGES ON DATABASE movzz_dev TO movzz;
echo   \c movzz_dev
echo   GRANT ALL ON SCHEMA public TO movzz;
echo   \q
echo.
pause
echo.

REM Generate Prisma Client
echo Generating Prisma Client...
call npm run prisma:generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate Prisma Client
    pause
    exit /b 1
)
echo [OK] Prisma Client generated
echo.

REM Run migrations
echo Running database migrations...
call npm run prisma:migrate dev -- --name initial_schema
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to run migrations
    echo Please check your DATABASE_URL in .env
    pause
    exit /b 1
)
echo [OK] Database migrations completed
echo.

REM Success
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Your backend is ready to run!
echo.
echo Next steps:
echo   1. Review .env file and update if needed
echo   2. Start the server: npm run dev
echo   3. Test: curl http://localhost:5000/health
echo.
echo Optional:
echo   - View database: npm run prisma:studio
echo   - Check logs: type logs\combined.log
echo.
echo Documentation:
echo   - Setup Guide: backend\MANUAL_SETUP.md
echo   - API Docs: backend\README.md
echo.
echo Happy coding!
echo.
pause
