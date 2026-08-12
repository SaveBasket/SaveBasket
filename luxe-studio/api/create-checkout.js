import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function bearer(req){
  const value=req.headers.authorization||'';
  return value.startsWith('Bearer ')?value.slice(7).trim():'';
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const {STRIPE_SECRET_KEY,STRIPE_PRO_PRICE_ID,VITE_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,APP_URL}=process.env;
  if(!STRIPE_SECRET_KEY||!STRIPE_PRO_PRICE_ID)return res.status(503).json({error:'Billing is not configured yet.'});
  if(!VITE_SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:'Luxe Cloud authentication is not configured yet.'});
  if(!APP_URL)return res.status(503).json({error:'APP_URL is not configured yet.'});
  try{
    const token=bearer(req);
    if(!token)return res.status(401).json({error:'Luxe Cloud sign-in required.'});
    const supabase=createClient(VITE_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await supabase.auth.getUser(token);
    if(error||!data?.user)return res.status(401).json({error:'Invalid Luxe Cloud session.'});
    const stripe=new Stripe(STRIPE_SECRET_KEY);
    const base=APP_URL.replace(/\/$/,'');
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',
      line_items:[{price:STRIPE_PRO_PRICE_ID,quantity:1}],
      success_url:`${base}/?checkout=success`,
      cancel_url:`${base}/?checkout=cancelled`,
      allow_promotion_codes:true,
      billing_address_collection:'auto',
      customer_email:data.user.email||undefined,
      client_reference_id:data.user.id,
      metadata:{user_id:data.user.id,plan:'pro'},
      subscription_data:{metadata:{user_id:data.user.id,plan:'pro'}}
    });
    return res.status(200).json({url:session.url});
  }catch(error){
    console.error('Stripe checkout error',error);
    return res.status(500).json({error:'Unable to start checkout.'});
  }
}
