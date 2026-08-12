import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOffer, searchOffers } from './sourcing.js';

test('normalizes price strings, condition, source and safe urls',()=>{
  const offer=normalizeOffer({name:'Widget Pro',brand:'Acme',model:'Widget Pro',price:'£129.99',shipping:'4.99',condition:'refurbished - excellent',source:'Example Refurbisher',source_type:'refurbisher',url:'https://example.com/widget'},'example');
  assert.equal(offer.price,129.99);
  assert.equal(offer.shipping,4.99);
  assert.equal(offer.total,134.98);
  assert.equal(offer.condition,'refurbished');
  assert.equal(offer.sourceType,'refurbisher');
  assert.match(offer.url,/^https:\/\//);
});

test('rejects unsafe source urls',()=>{
  const offer=normalizeOffer({title:'Widget',price:10,url:'javascript:alert(1)'},'example');
  assert.equal(offer.url,'#');
});

test('ranks the cheapest canonical offer as best deal',()=>{
  const rows=[
    normalizeOffer({id:'a',title:'Acme Widget Pro',brand:'Acme',model:'Widget Pro',gtin:'123',price:120,source:'Retailer A'},'a'),
    normalizeOffer({id:'b',title:'Acme Widget Pro',brand:'Acme',model:'Widget Pro',gtin:'123',price:99,source:'Retailer B'},'b'),
    normalizeOffer({id:'c',title:'Different Widget',brand:'Other',model:'Different',price:50,source:'Retailer C'},'c')
  ];
  const result=searchOffers(rows,'Acme Widget',{sort:'best'});
  assert.equal(result.bestDeals[0].id,'b');
  assert.equal(result.matches.find(x=>x.id==='b').bestDeal,true);
});
