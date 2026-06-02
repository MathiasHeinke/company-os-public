#!/usr/bin/env python3
"""
Start the Antigravity MCP Gateway with .env auto-loading.
Usage: python3 start.py

This is the official entry point for the MCP Gateway.
It loads .env variables BEFORE importing the gateway module
to ensure all configuration is available at import time.
"""
import os
from pathlib import Path

# Load .env BEFORE importing the gateway module
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip()
            if val:
                os.environ[key] = val
    print(f"✅ Loaded {env_file}")
else:
    print(f"⚠️  No .env file found at {env_file}")

# Verify critical keys
print(f"   GATEWAY_PORT: {os.environ.get('GATEWAY_PORT', '9090')}")

import uvicorn
uvicorn.run(
    "gateway:app",
    host="0.0.0.0",
    port=int(os.environ.get("GATEWAY_PORT", "9090")),
    log_level=os.environ.get("LOG_LEVEL", "info").lower(),
)
