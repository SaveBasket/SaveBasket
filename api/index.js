import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

const CATALOG = [
  { id:'iphone15-1', name:'Apple iPhone 15 128GB', source:'Example retailer', condition:'New', price:699, delivery:'Free delivery', emoji:'📱', url:'#' },
  { id:'iphone15-2', name:'Apple iPhone 15 128GB', source:'Example marketplace seller', condition:'New', price:679, delivery:'Delivery calculated at checkout', emoji:'📱', url:'#' },
  { id:'airpods-1', name:'Apple AirPods Pro (2nd gen)', source:'Example retailer', condition:'New', price:189, delivery:'Free delivery', emoji:'🎧', url:'#' },
  { id:'shoes-1', name:'Performance Running Shoes', source:'Example sports retailer', condition:'New', price:84, delivery:'Free delivery', emoji:'👟', url:'#' },
  { id:'laptop-1', name:'14-inch Performance Laptop', source:'Example electronics retailer', condition:'New', price:799, delivery:'Free delivery', emoji:'💻', url:'#' },
  { id:'refurb-1', name:'Premium Smartphone 256GB', source:'Example refurbisher', condition:'Refurbished — excellent', price:529, delivery:'30-day returns', emoji:'♻️', url:'#' }
];

function getConfig() {
  return {
    ownerEmail: process.env.OWNER_EMAIL,
    ownerPassword: process.env.OWNER_PASSWORD,
    sessionSecret: process.env.SESSION_SECRET,
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL
  };
}
function getSql(databaseUrl) { if (!databaseUrl) throw new Error('Missing Neon database connection string'); return neon(databaseUrl); }
function missingConfig(config) { return [!config.ownerEmail&&'OWNER_EMAIL',!config.ownerPassword&&'OWNER_PASSWORD',!config.sessionSecret&&'SESSION_SECRET',!config.databaseUrl&&'DATABASE_URL'].filter(Boolean); }
function parseCookies(req) { const out={}; for(const part of (req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>-1)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())} return out; }
function sign(value,secret){const sig=crypto.createHmac('sha256',secret).update(value).digest('hex');return `${value}.${sig}`;}
function valid(token,secret,email){if(!token||!secret||!email)return false;const i=token.lastIndexOf('.');if(i<1)return false;const value=token.slice(0,i),sig=token.slice(i+1),expected=crypto.createHmac('sha256',secret).update(value).digest('hex');if(sig.length!==expected.length)return false;return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))&&value.startsWith(`${email}|`)}
function json(res,status,data){res.status(status);res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(data));}
async function body(req){let s='';for await(const c of req)s+=c;try{return JSON.parse(s||'{}')}catch{return {}}}
async function findOwnerUser(sql,email){const rows=await sql`SELECT id,email,password_hash FROM public.users WHERE lower(email)=lower(${email}) AND role='owner' LIMIT 1`;return rows[0]||null}
async function ensureOwnerUser(sql,email,password){const existing=await findOwnerUser(sql,email);if(existing)return existing;if(!password)throw new Error('OWNER_PASSWORD is required for first-time owner setup');const hash=await bcrypt.hash(password,12);const inserted=await sql`INSERT INTO public.users (email,password_hash,role,must_change_password,created_at) VALUES (${email},${hash},'owner',false,now()) RETURNING id,email,password_hash`;return inserted[0]}

export default async function handler(req,res){
  // Public product discovery endpoint. It is deliberately provider-neutral: production
  // retailer/marketplace adapters can be added without changing the customer UI.
  if(req.method==='GET' && req.url.includes('/api/search')){
    const raw=new URL(req.url,'https://savebasket.local').searchParams.get('q')?.trim()||'';
    const terms=raw.toLowerCase().split(/\s+/).filter(Boolean);
    const offers=terms.length?CATALOG.filter(p=>terms.every(t=>`${p.name} ${p.source} ${p.condition}`.toLowerCase().includes(t))):CATALOG;
    offers.sort((a,b)=>a.price-b.price);
    return json(res,200,{query:raw,offers,message:'Demo offer catalogue is active. Connect retailer feeds to replace example sources with live offers.'});
  }

  const config=getConfig();const missing=missingConfig(config);
  if(missing.length){console.error('Owner authentication configuration diagnostics',{OWNER_EMAIL:Boolean(config.ownerEmail),OWNER_PASSWORD:Boolean(config.ownerPassword),SESSION_SECRET:Boolean(config.sessionSecret),DATABASE_URL:Boolean(config.databaseUrl),missing});return json(res,500,{error:'Owner authentication is not fully configured.',configured:{OWNER_EMAIL:Boolean(config.ownerEmail),OWNER_PASSWORD:Boolean(config.ownerPassword),SESSION_SECRET:Boolean(config.sessionSecret),DATABASE_URL:Boolean(config.databaseUrl)},missing});}
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  const data=await body(req);

  if(req.url.includes('/api/login')){
    const email=String(data.email||'').trim(),password=String(data.password||'');
    if(email.toLowerCase()!==config.ownerEmail.toLowerCase())return json(res,401,{error:'Invalid email or password'});
    try{const sql=getSql(config.databaseUrl);const user=await ensureOwnerUser(sql,config.ownerEmail,config.ownerPassword);if(!(await bcrypt.compare(password,user.password_hash)))return json(res,401,{error:'Invalid email or password'});}catch(error){console.error('Owner login database error',error);if(String(error?.message||'').includes('first-time owner setup'))return json(res,500,{error:'Owner account has not been initialized. Set OWNER_PASSWORD in Vercel once, then sign in.'});return json(res,500,{error:'Owner authentication storage is unavailable.'})}
    const token=sign(`${config.ownerEmail}|${Date.now()}`,config.sessionSecret);res.setHeader('set-cookie',`savebasket_owner=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`);return json(res,200,{ok:true});
  }

  if(req.url.includes('/api/change-password')){
    if(!valid(parseCookies(req).savebasket_owner,config.sessionSecret,config.ownerEmail))return json(res,401,{error:'Owner login required'});
    const currentPassword=String(data.currentPassword||''),newPassword=String(data.newPassword||'');if(newPassword.length<12)return json(res,400,{error:'New password must be at least 12 characters.'});
    try{const sql=getSql(config.databaseUrl);const user=await findOwnerUser(sql,config.ownerEmail);if(!user)return json(res,500,{error:'Owner account has not been initialized.'});if(!(await bcrypt.compare(currentPassword,user.password_hash)))return json(res,401,{error:'Current password is incorrect.'});const nextHash=await bcrypt.hash(newPassword,12);await sql`UPDATE public.users SET password_hash=${nextHash},must_change_password=false WHERE id=${user.id} AND role='owner'`;return json(res,200,{ok:true,message:'Owner password changed successfully.'})}catch(error){console.error('Owner password persistence error',error);return json(res,500,{error:'Unable to persist the new owner password.'})}
  }
  return json(res,404,{error:'Not found'});
}
