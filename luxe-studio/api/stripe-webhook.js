import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks=[];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function planFrom(metadata={}){return String(metadata.plan||'pro').toLowerCase();}
function statusFrom(value){return value==='active'||value==='trialing'?'active':value==='canceled'?'cancelled':'inactive';}

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

    if(event.type==='checkout.session.completed'){
      const subscriptionId=typeof object.subscription==='string'?object.subscription:object.subscription?.id;
      if(subscriptionId){
        const subscription=await stripe.subscriptions.retrieve(subscriptionId);
        const metadata={...(subscription.metadata||{}),...(object.metadata||{})};
        const row={user_id:metadata.user_id||null,provider:'stripe',provider_subscription_id:subscription.id,plan:planFrom(metadata),status:statusFrom(subscription.status),current_period_end:subscription.current_period_end?new Date(subscription.current_period_end*1000).toISOString():null,stripe_customer_id:typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id||null,raw_event_id:event.id};
        const {error}=await db.from('subscriptions').upsert(row,{onConflict:'provider_subscription_id'});
        if(error)throw error;
      }
    }

    if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'){
      const metadata=object.metadata||{};
      const row={user_id:metadata.user_id||null,provider:'stripe',provider_subscription_id:object.id,plan:planFrom(metadata),status:statusFrom(object.status),current_period_end:object.current_period_end?new Date(object.current_period_end*1000).toISOString():null,stripe_customer_id:typeof object.customer==='string'?object.customer:object.customer?.id||null,raw_event_id:event.id};
      const {error}=await db.from('subscriptions').upsert(row,{onConflict:'provider_subscription_id'});
      if(error)throw error;
    }

    if(event.type==='customer.subscription.deleted'){
      const {error}=await db.from('subscriptions').update({status:'cancelled',raw_event_id:event.id}).eq('provider_subscription_id',object.id);
      if(error)throw error;
    }
    return res.status(200).json({received:true});
  }catch(error){
    console.error('Stripe webhook error',error);
    return res.status(400).json({error:'Invalid webhook'});
  }
}
