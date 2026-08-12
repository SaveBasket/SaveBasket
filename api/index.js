import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { loadOffers, searchOffers, providerHealth } from './sourcing.js';

const MAX_BODY_BYTES = 32 * 1024;
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 12;
const rateMemory = globalThis.__savebasketAuthRate || (globalThis.__savebasketAuthRate = new Map());

function getConfig() {
  return {
    ownerEmail: process.env.OWNER_EMAIL?.trim(),
    ownerPassword: process.env.OWNER_PASSWORD,
    sessionSecret: process.env.SESSION_SECRET,
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL
  };
}
function getSql(databaseUrl) { if (!databaseUrl) throw new Error('Missing Neon database connection string'); return neon(databaseUrl); }
function missingConfig(config) { return [!config.ownerEmail&&'OWNER_EMAIL',!config.ownerPassword&&'OWNER_PASSWORD',!config.sessionSecret&&'SESSION_SECRET',!config.databaseUrl&&'DATABASE_URL'].filter(Boolean); }
function clientIp(req) { return String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'unknown').split(',')[0].trim().slice(0,100); }
function rateKey(req,email) { return `${clientIp(req)}|${String(email||'').trim().toLowerCase().slice(0,254)}`; }
function rateLimited(req,email) {
  const key=rateKey(req,email);const now=Date.now();const current=rateMemory.get(key)||{start:now,count:0};
  if(now-current.start>RATE_WINDOW_MS){current.start=now;current.count=0;}
  current.count+=1;rateMemory.set(key,current);
  if(rateMemory.size>5000){for(const [k,v] of rateMemory){if(now-v.start>RATE_WINDOW_MS)rateMemory.delete(k);}}
  return current.count>RATE_LIMIT;
}
function clearRate(req,email){rateMemory.delete(rateKey(req,email));}
function parseCookies(req) { const out={}; for(const part of (req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>-1)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())} return out; }
function sign(value,secret){const sig=crypto.createHmac('sha256',secret).update(value).digest('hex');return `${value}.${sig}`;}
function valid(token,secret,email){
  if(!token||!secret||!email)return false;const i=token.lastIndexOf('.');if(i<1)return false;
  const value=token.slice(0,i),sig=token.slice(i+1),expected=crypto.createHmac('sha256',secret).update(value).digest('hex');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
  const [tokenEmail,issuedRaw]=value.split('|');const issued=Number(issuedRaw);
  return tokenEmail===email&&Number.isFinite(issued)&&issued<=Date.now()+60_000&&Date.now()-issued<=SESSION_MAX_AGE_MS;
}
function securityHeaders(res){
  res.setHeader('x-content-type-options','nosniff');
  res.setHeader('x-frame-options','DENY');
  res.setHeader('referrer-policy','strict-origin-when-cross-origin');
  res.setHeader('permissions-policy','microphone=(), camera=(), geolocation=()');
  res.setHeader('content-security-policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
}
function json(res,status,data,cache='no-store'){securityHeaders(res);res.status(status);res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control',cache);res.end(JSON.stringify(data));}
async function body(req){let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s,'utf8')>MAX_BODY_BYTES)throw new Error('request body too large')}try{return JSON.parse(s||'{}')}catch{throw new Error('invalid JSON')}}
async function findOwnerUser(sql,email){const rows=await sql`SELECT id,email,password_hash FROM public.users WHERE lower(email)=lower(${email}) AND role='owner' LIMIT 1`;return rows[0]||null}
async function ensureOwnerUser(sql,email,password){const existing=await findOwnerUser(sql,email);if(existing)return existing;if(!password)throw new Error('OWNER_PASSWORD is required for first-time owner setup');const hash=await bcrypt.hash(password,12);const inserted=await sql`INSERT INTO public.users (email,password_hash,role,must_change_password,created_at) VALUES (${email},${hash},'owner',false,now()) RETURNING id,email,password_hash`;return inserted[0]}

export default async function handler(req,res){
  securityHeaders(res);
  if(req.method==='OPTIONS'){res.status(204);return res.end();}

  if(req.method==='GET' && req.url.includes('/api/sourcing/providers')){
    try{const result=await loadOffers();return json(res,200,{providers:providerHealth(result.providers),configuredFeeds:result.configuredFeeds,demoFallback:result.demoFallback,offerCount:result.offers.length},'public, max-age=30, stale-while-revalidate=120');}
    catch(error){console.error('Sourcing health error',error);return json(res,503,{error:'Sourcing engine unavailable.'})}
  }

  if(req.method==='GET' && req.url.includes('/api/search')){
    try{
      const params=new URL(req.url,'https://savebasket.local').searchParams;
      const query=params.get('q')?.trim()||'';
      const condition=params.get('condition')||'all';
      const source=params.get('source')||'all';
      const sort=params.get('sort')||'best';
      const limit=Math.min(60,Math.max(1,Number(params.get('limit')||40)));
      const result=await loadOffers();
      const found=searchOffers(result.offers,query,{condition,source,sort,limit});
      return json(res,200,{query,filters:{condition,source,sort,limit},...found,providers:providerHealth(result.providers),demoFallback:result.demoFallback},'public, max-age=30, stale-while-revalidate=120');
    }catch(error){console.error('Sourcing search error',error);return json(res,503,{error:'Product sourcing is temporarily unavailable.'});}
  }

  if(req.method==='GET' && req.url.includes('/api/health')){
    return json(res,200,{ok:true,service:'savebasket-api',sourcing:'ready',timestamp:new Date().toISOString()},'no-store');
  }

  const config=getConfig();const missing=missingConfig(config);
  if(missing.length){console.error('Owner authentication configuration diagnostics',{OWNER_EMAIL:Boolean(config.ownerEmail),OWNER_PASSWORD:Boolean(config.ownerPassword),SESSION_SECRET:Boolean(config.sessionSecret),DATABASE_URL:Boolean(config.databaseUrl),missing});return json(res,500,{error:'Owner authentication is not fully configured.'});}
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  let data;
  try{data=await body(req);}catch(error){return json(res,400,{error:error.message==='request body too large'?'Request too large':'Invalid JSON'});}

  if(req.url.includes('/api/login')){
    const email=String(data.email||'').trim(),password=String(data.password||'');
    if(rateLimited(req,email))return json(res,429,{error:'Too many sign-in attempts. Please try again later.'});
    if(email.toLowerCase()!==config.ownerEmail.toLowerCase())return json(res,401,{error:'Invalid email or password'});
    try{
      const sql=getSql(config.databaseUrl);const user=await ensureOwnerUser(sql,config.ownerEmail,config.ownerPassword);
      if(!(await bcrypt.compare(password,user.password_hash)))return json(res,401,{error:'Invalid email or password'});
    }catch(error){console.error('Owner login database error',error);if(String(error?.message||'').includes('first-time owner setup'))return json(res,500,{error:'Owner account has not been initialized. Set OWNER_PASSWORD in Vercel once, then sign in.'});return json(res,500,{error:'Owner authentication storage is unavailable.'})}
    clearRate(req,email);const token=sign(`${config.ownerEmail}|${Date.now()}`,config.sessionSecret);res.setHeader('set-cookie',`savebasket_owner=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_MS/1000}`);return json(res,200,{ok:true});
  }

  if(req.url.includes('/api/logout')){
    if(!valid(parseCookies(req).savebasket_owner,config.sessionSecret,config.ownerEmail))return json(res,401,{error:'Owner login required'});
    res.setHeader('set-cookie','savebasket_owner=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return json(res,200,{ok:true});
  }

  if(req.url.includes('/api/change-password')){
    if(!valid(parseCookies(req).savebasket_owner,config.sessionSecret,config.ownerEmail))return json(res,401,{error:'Owner login required'});
    const currentPassword=String(data.currentPassword||''),newPassword=String(data.newPassword||'');if(newPassword.length<12)return json(res,400,{error:'New password must be at least 12 characters.'});
    try{const sql=getSql(config.databaseUrl);const user=await findOwnerUser(sql,config.ownerEmail);if(!user)return json(res,500,{error:'Owner account has not been initialized.'});if(!(await bcrypt.compare(currentPassword,user.password_hash)))return json(res,401,{error:'Current password is incorrect.'});const nextHash=await bcrypt.hash(newPassword,12);await sql`UPDATE public.users SET password_hash=${nextHash},must_change_password=false WHERE id=${user.id} AND role='owner'`;res.setHeader('set-cookie','savebasket_owner=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return json(res,200,{ok:true,message:'Owner password changed successfully. Please sign in again.'})}catch(error){console.error('Owner password persistence error',error);return json(res,500,{error:'Unable to persist the new owner password.'})}
  }
  return json(res,404,{error:'Not found'});
}
