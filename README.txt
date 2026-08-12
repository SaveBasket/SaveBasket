SAVE BASKET — CONSUMER COMPARISON / SOURCING MVP

SaveBasket is a consumer-first discovery and comparison platform. A shopper searches once, compares source, condition, delivery and price, then chooses where to buy.

CURRENT STATE
- Customer-facing responsive comparison site is live in index.html.
- Search UI calls /api/search through the Vercel serverless API.
- A clearly labelled demo catalogue is included so the product works immediately without pretending that live retailer feeds exist.
- My Basket lets shoppers save offers locally while comparing.
- Owner authentication and password management remain available at /owner and use Neon PostgreSQL when configured.
- Luxe Studio is NOT part of the SaveBasket application or main branch. SaveBasket/main is the authoritative SaveBasket codebase.

DEMO DATA NOTICE
The example offer catalogue is demonstration data. It is not a claim that the named/example sources currently supply those prices. Production source connections must use authorised/licensed APIs, affiliate feeds or other permitted data sources and must comply with each source's terms.

PRODUCT PRINCIPLES
- Free, useful consumer search and comparison.
- SaveBasket acts as the discovery/referral layer rather than pretending to be every retailer.
- Compare total value, not just headline price: source, condition, delivery and availability matter.
- Sponsored offers must be clearly labelled and must not secretly manipulate comparison results.
- Never expose API keys or secrets in client-side code or Git.

NEXT PRODUCTION MILESTONES
1. Connect authorised retailer / marketplace / affiliate feeds.
2. Build a provider adapter layer so each source can be added or removed independently.
3. Add product identifiers (GTIN/EAN/UPC/MPN) and robust product matching.
4. Normalise condition, shipping, returns, seller quality and availability.
5. Add freshness timestamps and stale-offer handling.
6. Build transparent best-deal ranking and filters.
7. Add customer accounts, saved searches and alerts.
8. Add click/referral attribution and analytics.
9. Add seller/advertiser tooling with clearly separated sponsored placements.
10. Expand the owner dashboard for catalogue, sources, offers and system health.
11. Complete privacy, security, accessibility, consumer and advertising compliance review.
12. Add automated tests, CI checks and production monitoring.

DEPLOYMENT
Vercel can serve the static customer application and /api/index.js as a serverless function. Configure OWNER_EMAIL, OWNER_PASSWORD, SESSION_SECRET and DATABASE_URL in Vercel Environment Variables; use .env.example as the safe template. Never commit real credentials.
