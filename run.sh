#!/bin/bash

echo "Starting backend..."
cd backend || exit 1
uv run main.py &
BACKEND_PID=$!

echo "Starting frontend..."
cd ../frontend || exit 1
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

echo "Press Ctrl+C to stop both"

trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID" SIGINT
wait
