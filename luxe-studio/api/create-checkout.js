import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRO_PRICE_ID;
  if (!key || !price) return res.status(503).json({ error: 'Billing is not configured yet.' });
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: process.env.STRIPE_SUCCESS_URL || `${req.headers.origin || ''}/?checkout=success`,
      cancel_url: process.env.STRIPE_CANCEL_URL || `${req.headers.origin || ''}/?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error', error);
    return res.status(500).json({ error: 'Unable to start checkout.' });
  }
}
