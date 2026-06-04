#!/bin/sh
set -e

# Start Ollama server in background
ollama serve &
SERVER_PID=$!

echo "[ollama] Waiting for server to start..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done

echo "[ollama] Pulling chat model: $OLLAMA_MODEL"
ollama pull "$OLLAMA_MODEL"

echo "[ollama] Pulling embed model: $OLLAMA_EMBED_MODEL"
ollama pull "$OLLAMA_EMBED_MODEL"

echo "[ollama] Both models ready. Server running."
wait $SERVER_PID
