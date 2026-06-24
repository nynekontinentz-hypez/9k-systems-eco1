# Studio render worker

Phase 1 of the open-source faceless-video pipeline: turns a project's script into
an MP3 **voiceover** using **Kokoro** (Apache-2.0 TTS, CPU-only) → ffmpeg → uploads
to your Supabase `deliverables` bucket → signed callback to the app.

The Next.js app (`/api/studio/render`) orchestrates; this service does the heavy work
off-platform (it can't run inside Vercel). It holds **no Supabase credentials** — the
app hands it a single-use, single-path signed upload URL.

## Endpoints

- `GET /health` → `{ "ok": true }`
- `POST /jobs` (header `x-worker-secret: <STUDIO_WORKER_SECRET>`) → accepts a job and
  processes it in the background, then POSTs an HMAC-signed callback.

## Run locally

```bash
cd worker
docker build -t studio-worker .
docker run -p 8080:8080 -e STUDIO_WORKER_SECRET=dev-secret studio-worker
curl localhost:8080/health
```

First job downloads the Kokoro weights (~330 MB), so it's slow once, then cached.
CPU is fine; a ~700–900 word script renders in roughly 20–60s on a small instance.

## Deploy (pick any container host)

Fly.io / Railway / Render / a VPS all work. Build the image and expose the port.
Set **one** env var on the host:

- `STUDIO_WORKER_SECRET` — a long random string (e.g. `openssl rand -hex 32`).

Then, in **Vercel** (the Next app), set the matching pair and redeploy:

- `STUDIO_WORKER_URL` — the worker's public base URL (e.g. `https://studio-worker.fly.dev`)
- `STUDIO_WORKER_SECRET` — the **same** secret as above

The app treats the feature as available only when both are set (`isWorkerConfigured`).

## Voices

Kokoro voice ids, e.g. `af_heart` (default), `af_bella`, `am_michael`, `bf_emma`.
The app sends a voice per job; unknown ids fail the job with a clear error.

## Security notes

- Inbound `/jobs` requires the shared secret (constant-time compare).
- The callback body is HMAC-SHA256 signed with the same secret; the app verifies it.
- The worker can only write to the one path the app's signed URL allows, and the app
  registers **only** that path — a forged callback can't attach an arbitrary file.

## Next phases (not in this image yet)

Phase 2 adds stock b-roll (Pexels) + captions (faster-whisper) + assembly
(Revideo/ffmpeg) to produce a finished MP4. Same job/callback contract.
