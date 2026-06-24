# 9K Systems — Studio render worker (Piper TTS; CPU + low memory, fits ~512MB).
# Python 3.11 — piper-phonemize wheels have the best coverage here.
FROM python:3.11-slim

# ffmpeg for audio encoding; espeak-ng-data backs Piper's phonemizer; curl to
# fetch the voice model at build time (so there's no slow first-request download).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg espeak-ng curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Fail the build immediately if Piper didn't install cleanly (its deps are fragile).
RUN python -c "import piper" && piper --help >/dev/null 2>&1

# Bake a default Piper voice (en_US-lessac-medium ~63MB) into the image.
RUN mkdir -p /app/voices \
  && curl -fsSL -o /app/voices/en_US-lessac-medium.onnx \
     "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx?download=true" \
  && curl -fsSL -o /app/voices/en_US-lessac-medium.onnx.json \
     "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json?download=true"

COPY main.py .

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
