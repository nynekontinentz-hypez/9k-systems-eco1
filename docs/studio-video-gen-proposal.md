# Studio video generation — scoping proposal

_9K Systems · faceless-video studio · drafted June 24, 2026_

## What you have vs. what "video generation" means

Today the Studio is a **pipeline board + AI script generator + manual asset uploads**. The
AI piece writes text (hook, titles, voiceover script) via a text LLM (BYOK). It does **not**
produce video.

"Video generation" for a faceless channel is a multi-stage pipeline:

```
script ─▶ voiceover (TTS) ─▶ visuals (stock b-roll or AI clips) ─▶ captions ─▶ assemble ─▶ final MP4
```

Each stage is a different class of API. The big architectural fact: **rendering is slow**
(tens of seconds to minutes), which exceeds Vercel's function limit (300s on Pro). So the
build is less about "an API key" and more about an **async job pipeline**.

## Recommended architecture (fits your current stack)

Reuse everything already in place: Supabase (`studio_projects`, `studio_assets`,
`deliverables` bucket), Clerk org scoping, and the BYOK encryption pattern from the AI
settings feature.

**New pieces:**

- **`studio_render_jobs` table** — `project_id`, `clerk_org_id`/`created_by` (same tenant
  scoping), `status` (queued → rendering → done → failed), `provider`, `external_job_id`,
  `output_asset_id`, timestamps. One row per render.
- **`POST /api/studio/render`** — resolves config (BYOK/supplied, same resolver pattern),
  kicks off TTS + assembly, writes a job row, returns immediately.
- **`POST /api/studio/render/webhook`** — the render API calls this when a job finishes;
  we download the MP4 into the `deliverables` bucket and insert a `studio_assets` row
  (`kind = final`). The board already models `voiceover | thumbnail | broll | final`.
- **Orchestration** — most render APIs are **async with webhooks**, which sidesteps the
  Vercel timeout entirely (submit → webhook → store). A heavy queue is optional; if any
  step needs to run longer than a request allows, add **Trigger.dev** (built for long
  tasks, self-hostable) or **QStash** (lightweight HTTP queue).

This keeps the heavy lifting (encoding) **off your infrastructure** — you orchestrate, the
render API encodes.

## Component options & live pricing (June 2026)

### Text-to-speech (the voiceover)

| Provider | Cost | Notes |
|---|---|---|
| **OpenAI TTS** | ~$15 / 1M chars (HD $30) | Cheapest. A 600–900-word script ≈ 4–6k chars ≈ **$0.06–0.18**. |
| **ElevenLabs** | ~$120–180 / 1M chars | Best quality, voice cloning, emotion. ~$0.70–1.10 per script. |
| Google / PlayHT / others | between the two | Viable alternates. |

Recommendation: **OpenAI TTS as the default/"Fast" voice, ElevenLabs as a premium/BYOK
upgrade** — mirrors the Fast/Premium model you already chose for scripts.

### Visuals (the b-roll)

| Option | Cost | Notes |
|---|---|---|
| **Stock APIs (Pexels, Pixabay)** | **Free** | No attribution; ~200 req/hr, 20k/mo. Keyword-match clips to script beats. Best v1. |
| **AI video (Luma, Kling, Runway)** | ~$0.50–1.05 per 5s clip | Generative, distinctive, but a full video of clips gets expensive fast. Premium upgrade. |

Recommendation: **stock b-roll for v1** (free, fast, good enough for faceless explainer/
listicle content), AI clips as an opt-in premium accent later.

### Assembly / render engine (stitches it together)

| Engine | Entry pricing | Notes |
|---|---|---|
| **JSON2Video** | from $19.95/mo, **TTS included** in credits | Cheapest entry; built-in voices + templates. |
| **Creatomate** | $41 → $0.28/min, $99 → $0.14/min | JSON templates, keyframes, reusable. |
| **Shotstack** | $49 → $0.25/min, $99 → $0.20/min | Mature, well-documented edit API. |
| Self-host (**Remotion** / ffmpeg) | infra only | Max control, but you run + scale the encoder. More ops. |

Recommendation: start on a **managed render API** (JSON2Video or Creatomate) to avoid
running encoders; revisit self-hosting only if volume makes per-minute pricing hurt.

### Rough cost per finished ~5-min video (v1, stock + OpenAI TTS + managed render)

≈ **$0.80–1.50 each** at the low tier, dropping with volume. Stock = free, TTS = cents,
render = the main line item. AI-clip visuals would add $0.50–1.00 **per 5s** — reserve for
premium.

## Phasing

- **Phase 1 — Voiceover (days).** Script → OpenAI/ElevenLabs TTS → store as a
  `studio_asset` (`kind = voiceover`), playable/downloadable on the project page. Reuses the
  BYOK resolver almost verbatim. Immediate, cheap, useful on its own.
- **Phase 2 — Full render (the real "video generator").** Add stock b-roll fetch +
  captions + managed-render assembly + the `studio_render_jobs` table and webhook → final
  MP4 in `deliverables`. This is the meaningful build.
- **Phase 3 — Premium upgrades.** ElevenLabs voices, AI-generated b-roll, auto-thumbnails,
  multiple aspect ratios (9:16 / 1:1 / 16:9), background music.

## Money / access model

Video APIs cost real money per render (unlike the free-tier script LLM). Given you chose
**BYOK** for scripts, the consistent and safest move is **BYOK or a hard usage cap for
video too** — otherwise render costs are an open-ended liability. The existing
`studio_ai_settings` encryption + cap machinery extends directly to TTS and render keys.

## Decisions needed before Phase 1 build

1. **Render engine:** JSON2Video (cheapest, TTS bundled) vs Creatomate vs Shotstack vs
   self-host Remotion.
2. **Visuals v1:** stock-only (free) vs include AI clips (premium cost).
3. **TTS default:** OpenAI (cheap) vs ElevenLabs (quality).
4. **Access:** BYOK, supplied-with-cap, or hybrid (as with scripts).
5. **Start at Phase 1 (voiceover only) or go straight for Phase 2 (full render)?**

## Appendix — open-source / self-hosted stack

Trade per-render fees for ops: you run the models/encoders, marginal cost ≈ infra only,
no vendor lock-in. Caveat: this can't run on Vercel serverless — it needs a GPU/container
**worker** (Fly.io, Railway, Modal, RunPod, or a VPS) that the Next.js app submits jobs to.

**End-to-end reference projects (fork or study):**
- **MoneyPrinterTurbo** — Python; full pipeline (LLM script → stock footage → TTS →
  subtitles → music → batch) with Web UI, API, Docker self-host. Closest to "already built."
- **ShortGPT** — Python; stock + AI voice, BYO keys. Good reference architecture.

**TTS (open weights):**
- **Kokoro-82M** — Apache-2.0, runs on CPU / 2–3GB VRAM. Best commercial-safe default.
- **Chatterbox** (Resemble, MIT) — voice cloning; beat ElevenLabs in their own blind test.
- **Piper** — ultra-light CPU/RPi.
- ⚠️ **XTTS v2**, **F5-TTS** — non-commercial licenses; avoid for a paid product.
- Quality gap to ElevenLabs is now ~0.1–0.3 MOS — effectively closed.

**Assembly / render:**
- **Revideo** — TypeScript (fits the stack), headless, serverless-deployable.
- **Remotion** — React + bundled ffmpeg. ⚠️ commercial use needs a company license.
- **MoviePy** (Python), **ffmpeg** (the foundation) — max control.

**Captions:** **WhisperX** (word-level timestamps), **faster-whisper** (~4× faster),
**whisper.cpp** (zero-dep CPU, writes SRT/VTT). All local, free, private.

**Visuals:** Pexels / Pixabay APIs — free tier (not OSS but free).

**Commercial-safe self-hosted combo:** Kokoro + faster-whisper + Revideo/ffmpeg + Pexels,
orchestrated as a worker service. Near-zero marginal cost; you own the whole chain.

**Open-source sources:**
- [MoneyPrinterTurbo (GitHub)](https://github.com/harry0703/MoneyPrinterTurbo) · [faceless-video-generator topic](https://github.com/topics/faceless-video-generator)
- [Best open-source TTS 2026 (BentoML)](https://bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models) · [Local TTS guide 2026](https://localaimaster.com/blog/best-local-tts-models)
- [Remotion (GitHub)](https://github.com/remotion-dev/remotion) · [Revideo (GitHub)](https://github.com/midrender/revideo)
- [faster-whisper (GitHub)](https://github.com/SYSTRAN/faster-whisper) · [subsai (Whisper subtitles)](https://github.com/absadiki/subsai)

## Sources

- [Best video APIs 2026 — Shotstack vs Creatomate vs JSON2Video](https://samautomation.work/blog/best-video-apis-developers-2026/)
- [Creatomate — best video generation APIs](https://creatomate.com/blog/the-best-video-generation-apis)
- [JSON2Video pricing](https://json2video.com/pricing/)
- [Text-to-Speech API comparison 2026 (OpenAI vs ElevenLabs vs Google)](https://tokenmix.ai/blog/tts-api-comparison)
- [ElevenLabs API pricing](https://elevenlabs.io/pricing/api)
- [Pexels API](https://www.pexels.com/api/) · [Pixabay videos](https://pixabay.com/videos/)
- [Luma AI pricing 2026](https://www.eesel.ai/blog/luma-ai-pricing) · [Kling AI pricing 2026](https://www.eesel.ai/blog/kling-ai-pricing)
- [Inngest vs Trigger.dev vs QStash 2026](https://www.pkgpulse.com/guides/inngest-vs-triggerdev-vs-qstash-serverless-durable-2026)
