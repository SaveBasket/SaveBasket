const DEMO_OFFERS = [
  { id:'demo-iphone15-retailer', title:'Apple iPhone 15 128GB', brand:'Apple', model:'iPhone 15', sku:'SB-IP15-128', source:'Example Retailer', sourceType:'retailer', condition:'new', price:699, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.7 },
  { id:'demo-iphone15-marketplace', title:'Apple iPhone 15 128GB', brand:'Apple', model:'iPhone 15', sku:'SB-IP15-128', source:'Example Marketplace Seller', sourceType:'marketplace', condition:'new', price:679, shipping:4.99, currency:'GBP', availability:'in_stock', delivery:'Delivery calculated at checkout', url:'#', image:null, rating:4.5 },
  { id:'demo-airpods', title:'Apple AirPods Pro (2nd gen)', brand:'Apple', model:'AirPods Pro 2', sku:'SB-APP2', source:'Example Retailer', sourceType:'retailer', condition:'new', price:189, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.8 },
  { id:'demo-running-shoes', title:'Performance Running Shoes', brand:'Example', model:'Performance Runner', sku:'SB-RUN-01', source:'Example Sports Retailer', sourceType:'retailer', condition:'new', price:84, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.4 },
  { id:'demo-laptop', title:'14-inch Performance Laptop', brand:'Example', model:'14 Performance', sku:'SB-LAP-14', source:'Example Electronics Retailer', sourceType:'retailer', condition:'new', price:799, shipping:0, currency:'GBP', availability:'in_stock', delivery:'Free delivery', url:'#', image:null, rating:4.6 },
  { id:'demo-refurb-phone', title:'Premium Smartphone 256GB', brand:'Example', model:'Premium 256', sku:'SB-REF-256', source:'Example Refurbisher', sourceType:'refurbisher', condition:'refurbished', price:529, shipping:0, currency:'GBP', availability:'in_stock', delivery:'30-day returns', url:'#', image:null, rating:4.3 }
];
const STOP = new Set(['the','and','with','for','from','new','gb','gbp','inch','phone','smartphone']);
const memory = globalThis.__savebasketSourcingCache || (globalThis.__savebasketSourcingCache={expires:0,data:null});
function text(value=''){return String(value??'').trim();}
function tokens(value=''){return text(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean).filter(t=>!STOP.has(t));}
function number(value){if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;const cleaned=text(value).replace(/[^0-9.-]+/g,'');const n=Number(cleaned);return Number.isFinite(n)&&n>=0?n:null;}
function safeUrl(value){const v=text(value);try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.toString():'#'}catch{return '#'}}
function normalCondition(value='new'){const v=text(value).toLowerCase();if(/refurb|renew|recondition/.test(v))return 'refurbished';if(/used|pre.?owned|second.?hand/.test(v))return 'used';if(/open.?box/.test(v))return 'open_box';return 'new';}
function normalAvailability(value='in_stock'){const v=text(value).toLowerCase();if(/out|unavailable|sold/.test(v))return 'out_of_stock';if(/pre.?order/.test(v))return 'preorder';return 'in_stock';}
function sourceType(value='retailer'){const v=text(value).toLowerCase();if(/market/.test(v))return 'marketplace';if(/refurb|renew/.test(v))return 'refurbisher';if(/outlet/.test(v))return 'outlet';if(/resell|seller/.test(v))return 'reseller';return 'retailer';}
function canonicalKey(o){if(o.gtin)return `gtin:${text(o.gtin)}`;if(o.ean)return `ean:${text(o.ean)}`;if(o.upc)return `upc:${text(o.upc)}`;const product=tokens(`${o.brand||''} ${o.model||''} ${o.title||''}`).join('-');return `product:${product}`;}
export function normalizeOffer(raw,provider='feed'){
  const title=text(raw.title||raw.name||raw.product_name||raw.productName);if(!title)return null;
  const price=number(raw.price??raw.current_price??raw.sale_price);if(price===null)return null;
  const shipping=number(raw.shipping??raw.shipping_price??raw.delivery_price)??0;
  const currency=text(raw.currency||raw.price_currency||'GBP').toUpperCase()||'GBP';
  const source=text(raw.source||raw.retailer||raw.merchant||provider);
  return {id:text(raw.id||raw.offer_id||raw.external_id||`${provider}-${canonicalKey(raw)}`),title,brand:text(raw.brand),model:text(raw.model||raw.product_model),sku:text(raw.sku),gtin:text(raw.gtin),ean:text(raw.ean),upc:text(raw.upc),source,sourceType:sourceType(raw.sourceType||raw.source_type||raw.channel),condition:normalCondition(raw.condition),price,shipping,total:price+shipping,currency,availability:normalAvailability(raw.availability||raw.stock),delivery:text(raw.delivery||raw.shipping_label||raw.delivery_estimate||'Delivery details at source'),url:safeUrl(raw.url||raw.link||raw.product_url),image:safeUrl(raw.image||raw.image_url),rating:number(raw.rating),updatedAt:text(raw.updatedAt||raw.updated_at||new Date().toISOString()),provider};
}
async function fetchFeed(url){
  const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error('feed must use HTTPS');
  const controller=new AbortController();const timeoutMs=Math.max(1000,Math.min(15000,Number(process.env.SOURCING_FEED_TIMEOUT_MS||6500)));const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetch(parsed,{headers:{accept:'application/json'},signal:controller.signal});if(!response.ok)throw new Error(`feed ${response.status}`);const length=Number(response.headers.get('content-length')||0);if(length>2500000)throw new Error('feed exceeds 2.5MB safety limit');const body=await response.text();if(body.length>2500000)throw new Error('feed exceeds 2.5MB safety limit');const data=JSON.parse(body);return Array.isArray(data)?data:(Array.isArray(data.offers)?data.offers:Array.isArray(data.products)?data.products:[]);}finally{clearTimeout(timer);}}
export async function loadOffers(){
  const now=Date.now();const ttl=Math.max(5000,Math.min(120000,Number(process.env.SOURCING_CACHE_MS||30000)));if(memory.data&&memory.expires>now)return memory.data;
  const configured=(process.env.SOURCING_FEED_URLS||process.env.SOURCING_FEED_URL||'').split(',').map(s=>s.trim()).filter(Boolean);
  const results=[];const providers=[];
  for(const url of configured){try{const rows=await fetchFeed(url);const name=text(new URL(url).hostname);providers.push({name,url,status:'ok',offers:rows.length});for(const row of rows){const offer=normalizeOffer(row,name);if(offer)results.push(offer);}}catch(error){providers.push({name:url,url,status:'error',offers:0,error:String(error?.message||error)});}}
  const demoEnabled=process.env.SOURCING_DEMO_FALLBACK!=='false';if(demoEnabled)for(const row of DEMO_OFFERS){const offer=normalizeOffer(row,'demo');if(offer)results.push(offer);}
  const data={offers:results,providers,configuredFeeds:configured.length,demoFallback:demoEnabled};memory.data=data;memory.expires=now+ttl;return data;
}
function scoreOffer(offer,q){const hay=tokens(`${offer.title} ${offer.brand} ${offer.model} ${offer.sku}`).join(' ');const set=new Set(tokens(hay));let score=0;for(const token of q){if(set.has(token))score+=12;else if(hay.includes(token))score+=6;}if(tokens(offer.title).join(' ')===q.join(' '))score+=25;if(offer.availability==='in_stock')score+=8;if(offer.condition==='new')score+=4;if(offer.rating)score+=Math.min(5,offer.rating);return score;}
export function searchOffers(allOffers,query,{condition='all',source='all',limit=40,sort='best'}={}){
  const q=tokens(query);let rows=allOffers.filter(o=>o.availability!=='out_of_stock');if(condition!=='all')rows=rows.filter(o=>o.condition===condition);if(source!=='all')rows=rows.filter(o=>o.sourceType===source);
  if(q.length)rows=rows.filter(o=>q.every(token=>tokens(`${o.title} ${o.brand} ${o.model} ${o.sku}`).includes(token)));
  rows=rows.map(o=>({...o,relevance:scoreOffer(o,q),bestDeal:false}));
  rows.sort((a,b)=>sort==='price'?a.total-b.total||b.relevance-a.relevance:b.relevance-a.relevance||a.total-b.total);
  const grouped=new Map();for(const offer of rows){const key=canonicalKey(offer);const existing=grouped.get(key);if(!existing||offer.total<existing.total)grouped.set(key,offer);}
  const bestDeals=[...grouped.values()].sort((a,b)=>a.total-b.total||b.relevance-a.relevance).slice(0,Math.min(12,limit));const bestIds=new Set(bestDeals.map(x=>x.id));rows=rows.map(o=>({...o,bestDeal:bestIds.has(o.id)}));
  return {matches:rows.slice(0,limit),bestDeals,totalMatches:rows.length};
}
export function providerHealth(providers){return providers.map(p=>({name:p.name,status:p.status,offers:p.offers||0,error:p.error||null}));}
