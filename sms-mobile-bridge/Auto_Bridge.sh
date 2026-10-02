#!/bin/bash

echo "🔄 FSMS Full System Auto-Bridge Started"
echo "Watching for your Android device... (Press Ctrl+C to stop)"
echo "------------------------------------------------"

DIR="$(cd "$(dirname "$0")" && pwd)"

while true; do
    # Check if a device is connected
    if adb devices | grep -q -w "device"; then
        echo "✅ Android Device Detected!"

        # Bridge for SMS App
        echo "🔗 Linking SMS Automation (Port 8000)..."
        adb reverse tcp:8000 tcp:8000

        # Start the server if it's not already running
        if ! lsof -i :8000 > /dev/null; then
            echo "🛰️ Starting SMS Bridge Server..."
            cd "$DIR"
            source venv/bin/activate
            python3 server.py &
        fi

        echo "🚀 System is ready!"
        echo "App URL: http://localhost:8000"
        echo "------------------------------------------------"

        # Wait until the device is disconnected before watching again
        adb wait-for-disconnect
        echo "🔌 Device Disconnected. Monitoring..."
    fi
    sleep 2
done
