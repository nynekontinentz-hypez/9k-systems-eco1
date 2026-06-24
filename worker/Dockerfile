# 9K Systems — Studio render worker (CPU-only; no GPU required for Kokoro).
FROM python:3.12-slim

# ffmpeg for audio encoding; espeak-ng is Kokoro's phonemizer backend;
# libsndfile1 backs soundfile.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg espeak-ng libsndfile1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Install the CPU-only torch wheel first so kokoro doesn't pull a multi-GB CUDA build.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch==2.4.1"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
