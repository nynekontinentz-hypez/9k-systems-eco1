"""
9K Systems — Studio render worker (Phase 1: voiceover).

Open-source, commercial-safe, low-memory stack: Piper TTS (MIT, onnxruntime —
no torch, fits in ~512MB) -> ffmpeg -> upload to a Supabase signed URL ->
signed callback to the Next.js app.

The Next app dispatches a job here (authenticated with STUDIO_WORKER_SECRET).
We synthesize audio with a voice baked into the image, upload it to the single
signed path the app minted, then POST a callback whose body is HMAC-signed with
the same secret. We never hold any Supabase service credentials — only a
one-path, single-use token.
"""

import hashlib
import hmac
import json
import os
import subprocess
import tempfile
import time

import requests
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request, status

SECRET = os.environ.get("STUDIO_WORKER_SECRET", "")
# Piper voice model baked into the image (see Dockerfile). Override with PIPER_MODEL.
VOICE_MODEL = os.environ.get("PIPER_MODEL", "/app/voices/en_US-lessac-medium.onnx")

app = FastAPI(title="9K Studio Render Worker")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/jobs", status_code=status.HTTP_202_ACCEPTED)
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
        mp3_bytes = synth_mp3(p["text"])
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


def synth_mp3(text: str) -> bytes:
    """Piper (stdin text) -> wav -> mp3 (128k). Returns mp3 bytes."""
    with tempfile.TemporaryDirectory() as d:
        wav_path = os.path.join(d, "out.wav")
        mp3_path = os.path.join(d, "out.mp3")
        # Piper CLI: reads text on stdin, writes a wav with -f. Stable interface.
        synth = subprocess.run(
            ["piper", "-m", VOICE_MODEL, "-f", wav_path],
            input=text.encode("utf-8"),
            capture_output=True,
        )
        if synth.returncode != 0 or not os.path.exists(wav_path):
            raise RuntimeError(f"Piper failed: {synth.stderr.decode('utf-8', 'ignore')[:300]}")
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

    Sign and send the exact same UTF-8 bytes so the app's HMAC over the raw
    request body matches. Retry a few times so a transient blip doesn't strand
    the job.
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
        time.sleep(2 ** attempt)
    print(f"callback failed after retries for job: {last}", flush=True)
