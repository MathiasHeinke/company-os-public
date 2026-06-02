#!/bin/bash
# Antigravity Dashboard Opener — Waits for gateway, then opens dashboard
# Called by com.antigravity.dashboard-opener LaunchAgent
MAX_WAIT=30
INTERVAL=2
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s --max-time 1 http://localhost:9090/health > /dev/null 2>&1; then
        open "http://localhost:9090/dashboard"
        exit 0
    fi
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done
echo "Gateway not available after ${MAX_WAIT}s — skipping dashboard open"
exit 1
