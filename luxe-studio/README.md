# Luxe Studio — production workstation

Luxe Studio is a **separate product from SaveBasket**. SaveBasket is the consumer comparison/sourcing platform; Luxe Studio is the browser-native MPC/music-production workstation. They may live under the same GitHub account for convenience, but their code, deployment and product identity must remain separate.

## Production branch

`luxe-studio-production` is the release track for Luxe Studio. `main` remains the SaveBasket product line and does not contain the Luxe Studio application.

## Working product surface

- Cinematic desktop/tablet/mobile MPC-style workstation UI.
- Transport with play/stop/record, BPM and bar/step position.
- 16-pad bank with mouse and keyboard triggering.
- Built-in Web Audio voices for immediate operation without external assets.
- Audio file import with browser decoding.
- Trim start/end, pitch and level controls.
- 16-way sample slicing mapped to the pad bank.
- 16-step pattern sequencer with length, swing, humanize and velocity controls.
- Arrangement, mixer and master views with persisted project state.
- Microphone recording through `MediaRecorder` when the browser grants permission.
- Pattern WAV export and versioned `.luxe.json` project export/import.
- Local autosave/recovery state.
- Optional Supabase authentication and cloud project vault with per-user RLS.
- Optional Stripe Pro checkout bound to a verified Supabase user identity.
- PWA shell with cache rotation and offline-ready static assets.
- Independent Vercel deployment contract in `luxe-studio/vercel.json`.

## Production setup

1. Deploy the Vercel project with **Root Directory = `luxe-studio`**.
2. Configure the variables in `.env.example` in the Vercel project. Browser-safe values use the `VITE_` prefix; server secrets do not.
3. Run `production/schema.sql` in the dedicated Supabase project before enabling cloud saves.
4. Configure the Stripe Pro price and webhook endpoint for `api/stripe-webhook`.
5. Set `APP_URL` to the public Luxe Studio origin. Checkout redirects are deliberately pinned to this value rather than trusting a request origin.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` and Stripe secrets server-only.

## Product boundary

Do not move Luxe Studio code into SaveBasket/main. If a future GitHub repository is created for Luxe Studio, migrate the contents of this branch into that repository without changing the product identity or deployment root.

## Commercial roadmap

The remaining high-value production layers are: real non-destructive audio timeline editing, AudioWorklet/WASM DSP and bus routing, resumable object-storage uploads for audio assets, version history/conflict handling, entitlement enforcement, creator marketplace fulfilment/revenue-share accounting, signed browser-plugin manifests, stem rendering, and automated browser/audio regression tests.
