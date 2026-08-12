# Luxe Studio production handoff

## Current state
- Cinematic workstation runtime is in `app.production.js`.
- Browser audio uses Web Audio; imported samples are decoded and playable on pads.
- Microphone recording creates downloadable browser takes.
- Sequencer, project JSON export and WAV bounce are local-first.
- Supabase client adapter is in `production/supabase.js`.
- Commercial schema is in `production/schema.sql`.
- Stripe checkout is `api/create-checkout.js` and webhook verification is `api/stripe-webhook.js`.
- CI build verification is `.github/workflows/luxe-studio-build.yml`.

## Required production configuration
1. Create a dedicated Supabase project and run `production/schema.sql`.
2. Create private object-storage buckets for project audio/assets; keep service-role keys server-only.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the browser.
4. Set `SUPABASE_SERVICE_ROLE_KEY` only in server/production environment variables.
5. Create a Stripe Pro recurring price and set `STRIPE_SECRET_KEY` + `STRIPE_PRO_PRICE_ID`.
6. Set `STRIPE_WEBHOOK_SECRET` and register `/api/stripe-webhook` for subscription lifecycle events.
7. Set `STRIPE_SUCCESS_URL` and `STRIPE_CANCEL_URL` to the production studio URL.
8. Deploy the `luxe-studio` directory as its own Vercel project; do not overwrite unrelated projects.
9. Point the chosen Luxe Studio domain at the production deployment.

## Browser limits we do not fake
- Native VST/AU binaries are not browser-loadable; Luxe plugins use Web Audio/AudioWorklet/WASM architecture.
- MP3 encoding and high-quality offline stem rendering require a dedicated browser/WASM encoder or server render worker; WAV and project JSON are available locally now.
- Cloud persistence requires the Supabase project and storage configuration above.

## Launch acceptance
- Test sample import/playback, microphone permission, recording, sequencer playback, project JSON export and WAV export.
- Test Chrome, Safari, Edge and Firefox.
- Verify Stripe test checkout and webhook before live mode.
- Verify RLS with two separate test accounts.
- Verify no service-role or Stripe secret is present in client bundles.
- Only switch Stripe to live mode after successful end-to-end test transactions.
