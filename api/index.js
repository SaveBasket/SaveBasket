import crypto from 'node:crypto';

const ownerEmail = process.env.OWNER_EMAIL || 'owner@savebasket.local';
const ownerPassword = process.env.OWNER_PASSWORD || 'CHANGE-ME-NOW';

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0,i).trim()] = decodeURIComponent(part.slice(i+1).trim());
  }
  return out;
}
function sign(value) {
  const secret = process.env.SESSION_SECRET || 'CHANGE-ME-SESSION-SECRET';
  const sig = crypto.createHmac('sha256', secret).update(value).digest('hex');
  return `${value}.${sig}`;
}
function valid(token) {
  if (!token) return false;
  const i = token.lastIndexOf('.');
  if (i < 1) return false;
  const value = token.slice(0,i), sig = token.slice(i+1);
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'CHANGE-ME-SESSION-SECRET').update(value).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) && value.startsWith(ownerEmail + '|');
}
function json(res,status,data){res.status(status).setHeader('content-type','application/json');res.end(JSON.stringify(data));}
async function body(req){let s='';for await(const c of req)s+=c;try{return JSON.parse(s||'{}')}catch{return {}}}

export default async function handler(req,res) {
  if (req.method !== 'POST') return json(res,405,{error:'Method not allowed'});
  const data=await body(req);
  if (req.url.includes('/api/login')) {
    if (String(data.email||'').trim().toLowerCase() !== ownerEmail.toLowerCase() ||
        String(data.password||'') !== ownerPassword) return json(res,401,{error:'Invalid email or password'});
    const token=sign(ownerEmail+'|'+Date.now());
    res.setHeader('set-cookie',`savebasket_owner=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`);
    return json(res,200,{ok:true});
  }
  if (req.url.includes('/api/change-password')) {
    const cookies=parseCookies(req);
    if(!valid(cookies.savebasket_owner)) return json(res,401,{error:'Owner login required'});
    if(String(data.currentPassword||'')!==ownerPassword) return json(res,400,{error:'Current password is incorrect'});
    if(String(data.newPassword||'').length<12) return json(res,400,{error:'New password must be at least 12 characters'});
    return json(res,200,{ok:true,message:'Password change request accepted. For persistent production password changes, connect this deployment to a database/managed secret and update OWNER_PASSWORD.'});
  }
  return json(res,404,{error:'Not found'});
}
