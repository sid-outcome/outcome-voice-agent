#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="logs/server_${TIMESTAMP}.log"
LATEST_LOG="logs/latest.log"

echo "🚀 Starting Voice Agent Server with auto-restart on file changes..."
echo "📝 Logs will be written to: $LOG_FILE"
echo "📝 Latest logs symlink: $LATEST_LOG"
echo "🔄 Auto-restart: ENABLED (watching for file changes)"
echo ""

# Start the server with Node.js watch mode for auto-restart
# --watch flag automatically restarts on file changes
node --watch server-modular.js 2>&1 | tee "$LOG_FILE" &

# Create symlink to latest log for easy access
ln -sf "server_${TIMESTAMP}.log" "$LATEST_LOG"

# Store the PID
echo $! > logs/server.pid

echo "✅ Server started with PID: $(cat logs/server.pid)"
echo ""
echo "📖 To view logs in real-time:"
echo "   tail -f $LATEST_LOG"
echo ""
echo "🔄 Server will automatically restart when you save changes to:"
echo "   - server-modular.js"
echo "   - Any imported modules in src/"
echo ""
echo "🛑 To stop the server:"
echo "   kill $(cat logs/server.pid)"

# Keep script running to maintain the tee process
wait