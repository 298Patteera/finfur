# npm init -y
# npm install express promptpay-qr qrcode multer sharp bcrypt sqlite3 express-session
# node index.js

@echo off
echo Starting Node.js application setup and execution...

:: Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm is not installed or not in your PATH.
    echo Please check your Node.js installation.
    pause
    exit /b 1
)

:: Check if package.json exists, if not create a basic one
if not exist package.json (
    echo Creating package.json...
    echo {"name":"nodejs-express-app","version":"1.0.0","main":"index.js"} > package.json
)

:: Install all required packages
echo Installing required packages...
call npm install ejs express sqlite3 uuid body-parser express-session multer promptpay-qr qrcode sharp bcrypt

:: Check if the installation was successful
if %ERRORLEVEL% neq 0 (
    echo Failed to install packages. Please check your internet connection and try again.
    pause
    exit /b 1
)

:: Run the application
echo Starting the Node.js application...
node index.js

pause