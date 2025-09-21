@echo off
echo ==============================================
echo Iniciando el entorno de desarrollo de OpenDoors
echo ==============================================

echo.
echo 1. Deteniendo los servicios de Docker (PostgreSQL)...
docker-compose down
echo.

echo 2. Liberando el puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":3000"') do (
  taskkill /f /pid %%a > nul
)
echo Puerto 3000 liberado.
echo.

echo 3. Iniciando la base de datos con Docker...
docker-compose up -d
echo Esperando 10 segundos para que la base de datos se inicie...
timeout /t 10
echo Base de datos iniciada.
echo.

echo 4. Iniciando el servidor backend/frontend...
start cmd /k "npm run dev"

echo 5. Abriendo la aplicacion en el navegador...
timeout /t 5
start http://localhost:3000

echo.
echo ==============================================
echo ¡Listo! Ya puedes trabajar en tu proyecto.
echo ==============================================