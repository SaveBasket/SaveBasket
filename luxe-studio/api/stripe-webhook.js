import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks=[];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,VITE_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env;
  if(!STRIPE_SECRET_KEY||!STRIPE_WEBHOOK_SECRET||!VITE_SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({error:'Webhook integration is not configured.'});
  try{
    const stripe=new Stripe(STRIPE_SECRET_KEY);
    const raw=await rawBody(req);
    const signature=req.headers['stripe-signature'];
    const event=stripe.webhooks.constructEvent(raw,signature,STRIPE_WEBHOOK_SECRET);
    const db=createClient(VITE_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const object=event.data.object;
    const customerId=object.customer;
    if(event.type==='checkout.session.completed' || event.type==='customer.subscription.created' || event.type==='customer.subscription.updated'){
      const status=object.status==='active'||object.status==='trialing'?'active':'inactive';
      await db.from('subscriptions').upsert({stripe_customer_id:customerId,stripe_subscription_id:object.id,status,provider:'stripe',raw_event_id:event.id},{onConflict:'stripe_subscription_id'});
    }
    if(event.type==='customer.subscription.deleted'){
      await db.from('subscriptions').update({status:'cancelled',provider:'stripe'}).eq('stripe_subscription_id',object.id);
    }
    return res.status(200).json({received:true});
  }catch(error){
    console.error('Stripe webhook error',error);
    return res.status(400).json({error:'Invalid webhook'});
  }
}
