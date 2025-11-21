@echo off
echo.
echo ================================================
echo    DEMO ASSISTANT SOFINCO
echo    Lancement en cours...
echo ================================================
echo.

REM Chercher Python
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python trouve
    start http://localhost:8000
    echo.
    echo Demo disponible sur: http://localhost:8000
    echo.
    echo Appuyez sur CTRL+C pour arreter le serveur
    echo.
    python -m http.server 8000
) else (
    where python3 >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Python3 trouve
        start http://localhost:8000
        echo.
        echo Demo disponible sur: http://localhost:8000
        echo.
        echo Appuyez sur CTRL+C pour arreter le serveur
        echo.
        python3 -m http.server 8000
    ) else (
        echo [ERREUR] Python n'est pas installe
        echo.
        echo Veuillez installer Python depuis: https://www.python.org/downloads/
        echo.
        pause
    )
)
