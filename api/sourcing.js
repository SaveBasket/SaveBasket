const DEMO_OFFERS = [
  { id:'demo-iphone15-retailer', title:'Apple iPhone 15 128GB', brand:'Apple', model:'iPhone 15', sku:'SB-IP15-128', source:'Example Retailer', sourceType:'retailer', condition:'new', price:699, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.7 },
  { id:'demo-iphone15-marketplace', title:'Apple iPhone 15 128GB', brand:'Apple', model:'iPhone 15', sku:'SB-IP15-128', source:'Example Marketplace Seller', sourceType:'marketplace', condition:'new', price:679, shipping:4.99, currency:'GBP', availability:'in_stock', delivery:'Delivery calculated at checkout', url:'#', image:null, rating:4.5 },
  { id:'demo-airpods', title:'Apple AirPods Pro (2nd gen)', brand:'Apple', model:'AirPods Pro 2', sku:'SB-APP2', source:'Example Retailer', sourceType:'retailer', condition:'new', price:189, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.8 },
  { id:'demo-running-shoes', title:'Performance Running Shoes', brand:'Example', model:'Performance Runner', sku:'SB-RUN-01', source:'Example Sports Retailer', sourceType:'retailer', condition:'new', price:84, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.4 },
  { id:'demo-laptop', title:'14-inch Performance Laptop', brand:'Example', model:'14 Performance', sku:'SB-LAP-14', source:'Example Electronics Retailer', sourceType:'retailer', condition:'new', price:799, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.6 },
  { id:'demo-refurb-phone', title:'Premium Smartphone 256GB', brand:'Example', model:'Premium 256', sku:'SB-REF-256', source:'Example Refurbisher', sourceType:'refurbisher', condition:'refurbished', price:529, shipping:0, currency:'GBP', availability:'in_stock', delivery:'30-day returns', url:'#', image:null, rating:4.3 }
];

const STOP = new Set(['the','and','with','for','from','new','gb','gbp','inch','phone','smartphone']);

function text(value=''){return String(value ?? '').trim();}
function tokens(value=''){return text(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean).filter(t=>!STOP.has(t));}
function money(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
function normalCondition(value='new'){
  const v=text(value).toLowerCase();
  if(/refurb|renew|recondition/.test(v))return 'refurbished';
  if(/used|pre.?owned|second.?hand/.test(v))return 'used';
  if(/open.?box/.test(v))return 'open_box';
  return 'new';
}
function normalAvailability(value='in_stock'){
  const v=text(value).toLowerCase();
  if(/out|unavailable|sold/.test(v))return 'out_of_stock';
  if(/pre.?order/.test(v))return 'preorder';
  return 'in_stock';
}
function sourceType(value='retailer'){
  const v=text(value).toLowerCase();
  if(/market/.test(v))return 'marketplace';
  if(/refurb|renew/.test(v))return 'refurbisher';
  if(/outlet/.test(v))return 'outlet';
  if(/resell|seller/.test(v))return 'reseller';
  return 'retailer';
}
function canonicalKey(o){
  if(o.gtin)return `gtin:${text(o.gtin)}`;
  if(o.ean)return `ean:${text(o.ean)}`;
  if(o.upc)return `upc:${text(o.upc)}`;
  if(o.sku && o.brand)return `brand-sku:${tokens(o.brand).join('-')}:${text(o.sku).toLowerCase()}`;
  return `name:${tokens(`${o.brand||''} ${o.model||''} ${o.title||''}`).join('-')}`;
}

export function normalizeOffer(raw, provider='feed'){
  const title=text(raw.title||raw.name||raw.product_name||raw.productName);
  if(!title)return null;
  const price=money(raw.price ?? raw.current_price ?? raw.sale_price);
  if(price===null)return null;
  const shipping=money(raw.shipping ?? raw.shipping_price ?? raw.delivery_price) ?? 0;
  const currency=text(raw.currency||raw.price_currency||'GBP').toUpperCase();
  const source=text(raw.source||raw.retailer||raw.merchant||provider);
  const offer={
    id:text(raw.id||raw.offer_id||raw.external_id||`${provider}-${canonicalKey(raw)}`),
    title, brand:text(raw.brand), model:text(raw.model||raw.product_model), sku:text(raw.sku), gtin:text(raw.gtin||raw.ean||raw.upc),
    source, sourceType:sourceType(raw.sourceType||raw.source_type||raw.channel), condition:normalCondition(raw.condition),
    price, shipping, total:price+shipping, currency, availability:normalAvailability(raw.availability||raw.stock),
    delivery:text(raw.delivery||raw.shipping_label||raw.delivery_estimate||'Delivery details at source'),
    url:text(raw.url||raw.link||raw.product_url||'#'), image:text(raw.image||raw.image_url), rating:money(raw.rating),
    updatedAt:text(raw.updatedAt||raw.updated_at||new Date().toISOString()), provider
  };
  return offer;
}

async function fetchFeed(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const response=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error(`feed ${response.status}`);
    const data=await response.json();
    const rows=Array.isArray(data)?data:(Array.isArray(data.offers)?data.offers:Array.isArray(data.products)?data.products:[]);
    return rows;
  }finally{clearTimeout(timer);}
}

export async function loadOffers(){
  const configured=(process.env.SOURCING_FEED_URLS||process.env.SOURCING_FEED_URL||'').split(',').map(s=>s.trim()).filter(Boolean);
  const results=[];
  const providers=[];
  for(const url of configured){
    try{
      const rows=await fetchFeed(url);
      const name=text(new URL(url).hostname);
      providers.push({name,url,status:'ok',offers:rows.length});
      for(const row of rows){const offer=normalizeOffer(row,name);if(offer)results.push(offer);}
    }catch(error){providers.push({name:url,url,status:'error',error:String(error?.message||error)});}
  }
  const demoEnabled=process.env.SOURCING_DEMO_FALLBACK!=='false';
  if(demoEnabled)for(const row of DEMO_OFFERS){const offer=normalizeOffer(row,'demo');if(offer)results.push(offer);}
  return {offers:results,providers,configuredFeeds:configured.length,demoFallback:demoEnabled};
}

function scoreOffer(offer,queryTokens){
  const hay=tokens(`${offer.title} ${offer.brand} ${offer.model} ${offer.sku}`).join(' ');
  const set=new Set(tokens(hay));
  let score=0;
  for(const token of queryTokens){
    if(set.has(token))score+=12;
    else if(hay.includes(token))score+=6;
  }
  const exact=tokens(offer.title).join(' ')===queryTokens.join(' ');
  if(exact)score+=25;
  if(offer.availability==='in_stock')score+=8;
  if(offer.condition==='new')score+=4;
  if(offer.rating)score+=Math.min(5,offer.rating);
  return score;
}

export function searchOffers(allOffers,query,{condition='all',source='all',limit=40,sort='best'}={}){
  const q=tokens(query);
  let rows=allOffers.filter(o=>o.availability!=='out_of_stock');
  if(condition!=='all')rows=rows.filter(o=>o.condition===condition);
  if(source!=='all')rows=rows.filter(o=>o.sourceType===source);
  if(q.length)rows=rows.filter(o=>q.every(token=>tokens(`${o.title} ${o.brand} ${o.model} ${o.sku}`).join(' ').includes(token)));
  rows=rows.map(o=>({...o,relevance:scoreOffer(o,q),bestDeal:false}));
  if(sort==='price')rows.sort((a,b)=>a.total-b.total||b.relevance-a.relevance);
  else rows.sort((a,b)=>b.relevance-a.relevance||a.total-b.total);
  const seen=new Map();
  for(const offer of rows){
    const key=canonicalKey(offer);
    const existing=seen.get(key);
    if(!existing||offer.total<existing.total)seen.set(key,offer);
  }
  const grouped=[...seen.values()];
  grouped.sort((a,b)=>sort==='price'?a.total-b.total:b.relevance-a.relevance||a.total-b.total);
  const byKey=new Map(grouped.map(o=>[canonicalKey(o),o]));
  for(const offer of rows){const best=byKey.get(canonicalKey(offer));if(best&&best.id===offer.id)offer.bestDeal=true;}
  return {matches:rows.slice(0,limit),bestDeals:grouped.slice(0,Math.min(12,limit)),totalMatches:rows.length};
}

export function providerHealth(providers){return providers.map(p=>({name:p.name,status:p.status,offers:p.offers||0,error:p.error||null}));}
