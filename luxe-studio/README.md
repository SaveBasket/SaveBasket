# Luxe Studio — Foundation

A premium browser-based music production workstation foundation, created as the continuation path for the Luxe Studio Core build.

## Current working features

- Cinematic desktop-first studio UI
- Transport: play / stop / record / BPM / metronome state
- MPC-style 16-pad grid with mouse and keyboard triggering
- Built-in Web Audio synth voices so the workstation is usable immediately
- Sample file import and browser-side audio decoding
- Sample controls: trim, pitch, level, reverse/slice interaction states
- 16-step pattern sequencer with clear and pattern playback
- Mixer console and master meter UI
- Effects rack
- Plugin / marketplace catalog with purchase/library interaction states
- Microphone recording with MediaRecorder when browser permissions allow
- WAV bounce/export utility
- Project browser and local-first/cloud-ready architecture cues
- Responsive desktop/tablet/mobile behavior

## Product direction

Luxe Studio is intended to grow into a commercial music-production platform:

`OPEN PROJECT → SAMPLE → RECORD → PLAY PADS → SEQUENCE → ARRANGE → MIX → MASTER → EXPORT`

Future production layers should use Web Audio / AudioWorklet / WASM for DSP, object storage for audio assets, PostgreSQL/Supabase for project metadata and entitlements, and Stripe/Paddle for billing. Native VST/AU binaries should not be claimed as browser plugins; the intended plugin path is browser-native Web Audio / AudioWorklet / WASM modules with a first-party SDK/registry.

## Continue in v0

This repository is intentionally importable as an existing GitHub codebase. v0 supports importing existing GitHub repositories and working against the actual codebase with a real preview environment. Select the `luxe-studio` directory as the project root when prompted.

Recommended next build pass:

1. Convert the foundation to a component architecture while preserving the visual language.
2. Add real audio timeline/arrangement state and clip editing.
3. Add AudioWorklet-based mixer/FX routing.
4. Add autosave/versioning and Supabase project persistence.
5. Add authenticated accounts and Free/Pro entitlements.
6. Add Stripe/Paddle checkout + webhook-backed subscription state.
7. Add marketplace product tables, creator profiles and revenue-share accounting.
8. Add browser-native plugin SDK / registry and installation lifecycle.
9. Add WAV/MP3/stem export using honest browser/server capability boundaries.
10. Add automated build/type/runtime checks before production deployment.
