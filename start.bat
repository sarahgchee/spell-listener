@echo off
rem Starts Spell Listener. Keep this window open while you play; close it when you're done.
cd /d "%~dp0"
echo Spell Listener is running at http://localhost:8765/
echo Keep this window open while you play. Close it when you're done.
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start "" chrome http://localhost:8765/"
python -m http.server 8765 --bind 127.0.0.1
