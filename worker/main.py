"""
9K Systems — Studio render worker (Phase 1: voiceover).

Open-source, commercial-safe stack: Kokoro TTS (Apache-2.0) -> ffmpeg -> upload
to a Supabase signed URL -> signed callback to the Next.js app.

The Next app dispatches a job here (authenticated with STUDIO_WORKER_SECRET).
We synthesize audio, upload it to the single signed path the app minted, then
POST a callback whose body is HMAC-signed with the same secret. We never receive
or hold any Supabase service credentials — only a one-path, single-use token.
"""

import hashlib
import hmac
import json
import os
import subprocess
import tempfile
import time

import numpy as np
import requests
import soundfile as sf
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request

SECRET = os.environ.get("STUDIO_WORKER_SECRET", "")
app = FastAPI(title="9K Studio Render Worker")

# Kokoro pipeline is lazy-loaded on first job so the container boots fast.
_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        from kokoro import KPipeline  # imported here to defer the heavy load

        # 'a' = American English. Weights download on first use (~330MB).
        _pipeline = KPipeline(lang_code="a")
    return _pipeline


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/jobs")
async def create_job(
    request: Request,
    background: BackgroundTasks,
    x_worker_secret: str = Header(default=""),
):
    if not SECRET or not hmac.compare_digest(x_worker_secret, SECRET):
        raise HTTPException(status_code=401, detail="Bad secret")
    payload = await request.json()
    for field in ("jobId", "text", "supabaseUrl", "bucket", "uploadPath", "uploadToken", "callbackUrl"):
        if not payload.get(field):
            raise HTTPException(status_code=400, detail=f"Missing {field}")
    background.add_task(process_job, payload)
    return {"accepted": True}


def process_job(p: dict):
    job_id = p["jobId"]
    try:
        mp3_bytes = synth_mp3(p["text"], p.get("voice") or "af_heart")
        upload_signed(
            p["supabaseUrl"], p["bucket"], p["uploadPath"], p["uploadToken"], mp3_bytes
        )
        callback(p["callbackUrl"], {
            "jobId": job_id,
            "status": "done",
            "sizeBytes": len(mp3_bytes),
        })
    except Exception as e:  # noqa: BLE001 — report any failure back to the app
        callback(p["callbackUrl"], {
            "jobId": job_id,
            "status": "failed",
            "error": str(e)[:500],
        })


def synth_mp3(text: str, voice: str) -> bytes:
    """Kokoro -> 24kHz wav -> mp3 (128k). Returns mp3 bytes."""
    pipeline = get_pipeline()
    chunks = []
    for _gs, _ps, audio in pipeline(text, voice=voice):
        arr = audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio)
        chunks.append(arr.astype(np.float32))
    if not chunks:
        raise RuntimeError("TTS produced no audio")
    full = np.concatenate(chunks)

    with tempfile.TemporaryDirectory() as d:
        wav_path = os.path.join(d, "out.wav")
        mp3_path = os.path.join(d, "out.mp3")
        sf.write(wav_path, full, 24000)
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-b:a", "128k", mp3_path],
            check=True,
            capture_output=True,
        )
        with open(mp3_path, "rb") as f:
            return f.read()


def upload_signed(supabase_url: str, bucket: str, path: str, token: str, data: bytes):
    """PUT bytes to a Supabase signed upload URL (least-privilege, one path)."""
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/upload/sign/{bucket}/{path}"
    res = requests.put(
        url,
        params={"token": token},
        data=data,
        headers={"Content-Type": "audio/mpeg", "x-upsert": "true"},
        timeout=120,
    )
    if res.status_code not in (200, 201):
        raise RuntimeError(f"Upload failed {res.status_code}: {res.text[:200]}")


def callback(callback_url: str, body: dict):
    """POST an HMAC-signed callback the Next app can verify.

    We sign and send the *exact same bytes* (UTF-8) so the app's HMAC over the
    raw request body matches even when the payload contains non-ASCII (e.g. a
    Unicode error message). Retries a few times so a transient blip doesn't
    strand the job.
    """
    raw_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
    sig = hmac.new(SECRET.encode("utf-8"), raw_bytes, hashlib.sha256).hexdigest()
    headers = {"Content-Type": "application/json", "x-worker-signature": sig}
    last = None
    for attempt in range(4):
        try:
            res = requests.post(callback_url, data=raw_bytes, headers=headers, timeout=30)
            if res.status_code < 300:
                return
            last = f"{res.status_code}: {res.text[:200]}"
        except Exception as e:  # noqa: BLE001
            last = str(e)
        time.sleep(2 ** attempt)  # 1, 2, 4, 8s backoff
    print(f"callback failed after retries for job: {last}", flush=True)
