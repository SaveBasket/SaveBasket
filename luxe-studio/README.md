# Luxe Studio — MPC Workstation Foundation

Luxe Studio is a separate music-production product. It is stored in the SaveBasket GitHub account for convenience, but it is **not SaveBasket** and must not be merged into SaveBasket/main.

## Current working features

- Cinematic desktop-first studio UI
- Transport: play / stop / record / BPM / position
- MPC-style 16-pad grid with mouse and keyboard triggering
- Built-in Web Audio synth voices so the workstation is usable immediately
- Sample file import and browser-side audio decoding
- Sample controls: trim, pitch, level and slice workflow states
- 16-step pattern sequencer with clear, quantize and playback controls
- Arrangement, mixer and master views
- Mixer level/pan/mute state persisted locally
- Microphone recording with MediaRecorder when browser permissions allow
- Pattern WAV bounce/export
- Full `.luxe.json` project export/import
- Local autosave / recovery
- Optional Supabase authentication and cloud project vault
- Cloud project create/update/list/load with per-user row-level-security-compatible queries
- Optional Stripe Pro subscription checkout + webhook foundation
- Installable/offline-ready PWA shell with service-worker caching
- Responsive desktop/tablet/mobile behavior

## Product direction

`OPEN PROJECT → SAMPLE → RECORD → PLAY PADS → SEQUENCE → ARRANGE → MIX → MASTER → EXPORT`

Luxe Studio is intended to grow into a commercial browser-native music-production platform. The architecture keeps audio processing honest: browser plugins should use Web Audio / AudioWorklet / WASM rather than pretending native VST/AU binaries run in the browser. Supabase/Postgres is the project and entitlement layer; object storage is the correct home for large audio assets; Stripe is the current billing foundation.

## Cloud setup

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Luxe Studio deployment. Run `production/schema.sql` in the Supabase project before enabling cloud project saves. The client only queries rows owned by the authenticated user; the schema's RLS policies remain the security boundary.

## Billing setup

Configure `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the Vercel API functions. Never expose service-role or Stripe secret keys in browser code.

## Next production layers

1. Replace visual timeline clips with a real audio timeline and non-destructive clip editing model.
2. Move mixer/FX processing into AudioWorklet nodes and build a real bus graph.
3. Add object-storage upload/resume for samples and recordings with waveform metadata.
4. Add collaborative/project version history and conflict-safe autosave.
5. Add Free/Pro entitlement gates around cloud storage, advanced DSP and exports.
6. Add marketplace product fulfilment, creator accounts and revenue-share accounting.
7. Add browser-native plugin SDK/manifest validation and a signed registry.
8. Add stem rendering and MP3/AAC export where the selected browser/server path supports it.
9. Add automated browser tests, audio regression tests and deployment health checks.
