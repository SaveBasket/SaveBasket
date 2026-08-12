SAVE BASKET — CONSUMER COMPARISON / SOURCING ENGINE

SaveBasket is a consumer-first discovery and comparison platform. A shopper searches once, compares source, condition, delivery and price, then chooses where to buy.

CURRENT STATE
- Responsive customer-facing comparison site is live in index.html.
- Search UI calls /api/search through the Vercel serverless API.
- api/sourcing.js is the provider-neutral sourcing engine.
- Sourcing accepts authorised HTTPS JSON feeds through SOURCING_FEED_URLS and normalises retailer/marketplace/refurbisher/outlet offers into one schema.
- Product matching prefers GTIN/EAN/UPC identifiers and falls back to conservative brand/model/title normalisation rather than assuming a seller SKU is globally unique.
- Search supports condition, source type, best-match and price sorting, availability filtering, total-cost ranking and best-deal grouping.
- Feed ingestion has bounded timeouts, response-size protection, URL validation, currency-precision rounding and short-lived instance caching.
- /api/sourcing/providers exposes safe adapter health without revealing credentials.
- A clearly labelled demo catalogue remains enabled by default so the product works immediately without pretending that live retailer feeds exist.
- My Basket lets shoppers save offers locally while comparing.
- Owner authentication and password management remain available at /owner and use Neon PostgreSQL when configured.
- Luxe Studio is NOT part of the SaveBasket application or main branch. SaveBasket/main is the authoritative SaveBasket codebase.

SOURCING ENGINE
1. Configure one or more authorised HTTPS JSON feeds in SOURCING_FEED_URLS.
2. Each offer should provide title/name and price; source, url, condition, shipping, currency, availability and product identifiers are strongly recommended.
3. The engine fetches feeds with bounded timeouts and a 2.5MB response limit, rejects malformed offers, normalises condition/source/availability and calculates total cost.
4. Search ranks relevance first, then total cost, stock state and quality signals. Product groups use trusted identifiers first and a conservative normalised-name fallback.
5. Replace the demo fallback with real feeds only after commercial/API permissions are confirmed.

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
2. Add dedicated adapters for each contracted provider and their authentication/signature requirements.
3. Expand identifier matching with MPN/model/variant and confidence scoring.
4. Persist catalogue and offer snapshots in PostgreSQL for freshness history and price alerts.
5. Add delivery-region and tax-aware total-cost calculations.
6. Add customer accounts, saved searches and price-drop alerts.
7. Add click/referral attribution and analytics.
8. Add seller/advertiser tooling with clearly separated sponsored placements.
9. Expand the owner dashboard for catalogue, sources, offers and system health.
10. Complete privacy, security, accessibility, consumer and advertising compliance review.
11. Add automated tests, CI checks, rate limiting and production monitoring.

DEPLOYMENT
Vercel can serve the static customer application and /api/index.js as a serverless function. Configure OWNER_EMAIL, OWNER_PASSWORD, SESSION_SECRET, DATABASE_URL, SOURCING_FEED_URLS, SOURCING_DEMO_FALLBACK and optional sourcing timeout/cache variables in Vercel Environment Variables; use .env.example as the safe template. Never commit real credentials.
