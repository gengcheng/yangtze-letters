import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,normalize,search} from './travel.js';
test('new stations query their own destinations and landmarks',async()=>{
 for(const [city,destination,poi] of [['source','格尔木','唐古拉山镇'],['yibin','宜宾','三江口长江公园'],['nanjing','南京','下关滨江火车主题园']]){
  const trip={city,category:'hotel',date:'2099-01-01'};
  assert.equal(validate(trip).city,city);
  await search(trip,async(command,args)=>{
   assert.equal(args[args.indexOf('--dest-name')+1],destination);
   assert.ok(args[args.indexOf('--poi-name')+1].includes(poi));
   return {stdout:'{"status":0,"data":{"itemList":[{"name":"住宿"}]}}'};
  });
  await search({...trip,category:'transport',origin:'杭州'},async(command,args)=>{
   assert.equal(args[args.indexOf('--destination')+1],destination);
   return {stdout:'{"status":0,"data":{"itemList":[]}}'};
  });
  assert.throws(()=>validate({...trip,category:'transport',origin:destination}));
 }
 assert.throws(()=>validate({city:'__proto__',category:'hotel',date:'2099-01-01'}));
});
test('validates trip inputs and rejects command-like origins',()=>{
 assert.equal(validate({city:'wuhan',category:'hotel',date:'2099-01-01',origin:'杭州'}).city,'wuhan');
 for(const patch of [{city:'unknown'},{category:'exec'},{date:'2099-02-30'},{date:'2020-01-01'},{origin:'$(whoami)'},{date:''}]) assert.throws(()=>validate({city:'shanghai',category:'nearby',date:'2099-01-01',...patch}));
});
test('search preserves live metadata and uses fixed CLI argument arrays',async()=>{
 const result=await search({city:'shanghai',category:'hotel',date:'2099-01-01'},async(command,args,options)=>{
  assert.equal(command,process.env.FLYAI_BIN || 'flyai'); assert.equal(args[0],'search-hotel');assert.equal(args[args.indexOf('--check-out-date')+1],'2099-01-02');assert.equal(options.timeout,20000);
  return {stdout:JSON.stringify({status:0,data:{itemList:[{name:'酒店',price:'¥200',detailUrl:'https://example.com/book'}]},systemMessage:'平台提示'})};
 });
 assert.equal(result.source,'live');assert.equal(result.platformHint,'平台提示');assert.equal(result.resources[0].url,'https://example.com/book');
});
test('falls back to project CLI only when installed flyai is missing',async()=>{
 let calls=0;
 const result=await search({city:'wuhan',category:'nearby',date:'2099-01-01'},async(command,args)=>{
  calls++;
  if(calls===1)throw Object.assign(new Error('missing'),{code:'ENOENT'});
  assert.equal(command,process.execPath);assert.match(args[0],/flyai-bundle\.cjs$/);
  return {stdout:'{"status":0,"data":{"itemList":[{"name":"亲子资源"}]}}'};
 });
 assert.equal(calls,2);assert.equal(result.source,'live');
});
test('empty, timeout and quota failures return labeled demo without booking links',async()=>{
 for(const outcome of ['empty','timeout','quota','error']){
  const result=await search({city:'wuhan',category:'nearby',date:'2099-01-01'},async()=>{
   if(outcome==='empty')return {stdout:'{"status":0,"data":{"itemList":[]}}'};
   throw Object.assign(new Error('internal'),{killed:outcome==='timeout',stderr:outcome==='quota'?'Trial limit reached':''});
  });
  assert.equal(result.source,'demo');assert.equal(result.resources[0].url,undefined);assert.ok(result.reason);if(outcome==='quota')assert.match(result.reason,/额度/);if(outcome==='timeout')assert.match(result.reason,/超时/);
 }
});
test('normalizes hotel and keyword results, discarding unsafe links',()=>{
 const data=normalize({status:0,data:{itemList:[{info:{title:'江岸游学',picUrl:'https://example.com/image.jpg',jumpUrl:'javascript:alert(1)',price:100}},{name:'亲子酒店',mainPic:'https://example.com/hotel.jpg',detailUrl:'https://example.com/book'}]}});
 assert.equal(data[0].price,'100');assert.equal(data[0].url,undefined);assert.equal(data[1].title,'亲子酒店');assert.equal(data[1].url,'https://example.com/book');assert.deepEqual(normalize({status:0,data:{itemList:[]}}),[]);assert.throws(()=>normalize({status:1}));
});

test('transport requires a distinct origin and a supported mode',()=>{
 const trip={city:'wuhan',category:'transport',date:'2099-01-01'};
 for(const patch of [{},{origin:'  '},{origin:'武汉'},{origin:'武汉市'},{origin:'杭州',transportMode:'boat'}]) assert.throws(()=>validate({...trip,...patch}));
 assert.equal(validate({...trip,origin:'杭州',transportMode:'flight'}).origin,'杭州');
});

test('transport uses dedicated train/flight commands and maps actual itinerary and price fields',async()=>{
 for(const mode of ['train','flight']){
  const segment={transportType:mode==='flight'?'飞机':'火车',marketingTransportNo:mode==='flight'?'CZ3784':'G1790',marketingTransportName:mode==='flight'?'南航':'高铁',depStationName:mode==='flight'?'萧山国际机场':'杭州东站',arrStationName:mode==='flight'?'天河国际机场':'武汉站',depDateTime:'2099-01-01 14:52:00',arrDateTime:'2099-01-01 19:30:00',seatClassName:mode==='flight'?'经济舱':'二等座'};
  const item={journeys:[{segments:[segment]}],jumpUrl:'https://example.com/book',totalDuration:'278',...(mode==='flight'?{ticketPrice:'910.00'}:{price:'324.00'})};
  const result=await search({city:'wuhan',category:'transport',origin:' 杭州 ',date:'2099-01-01',transportMode:mode},async(command,args)=>{
   assert.deepEqual(args,[mode==='flight'?'search-flight':'search-train','--origin','杭州','--destination','武汉','--dep-date','2099-01-01']);
   return {stdout:JSON.stringify({status:0,data:{itemList:[item]},systemMessage:'平台提示'})};
  });
  assert.equal(result.source,'live');assert.equal(result.platformHint,'平台提示');
  assert.match(result.resources[0].title,new RegExp(segment.marketingTransportNo));
  assert.match(result.resources[0].description,new RegExp(segment.depStationName));
  assert.match(result.resources[0].description,/14:52:00.*19:30:00/);
  assert.equal(result.resources[0].price,mode==='flight'?'参考票价 ¥910.00':'参考票价 ¥324.00');
  assert.equal(result.resources[0].url,'https://example.com/book');
 }
});

test('transport never presents unrelated products or demo suggestions as ticket results',async()=>{
 for(const outcome of ['unrelated','empty','failure']){
  const result=await search({city:'shanghai',category:'transport',origin:'杭州',date:'2099-01-01'},async()=>{
   if(outcome==='failure')throw new Error('upstream failure');
   return {stdout:JSON.stringify({status:0,data:{itemList:outcome==='empty'?[]:[{title:'酒店套餐',price:'100',jumpUrl:'https://example.com/hotel'}]},systemMessage:'平台提示'})};
  });
  assert.equal(result.source,'unavailable');assert.deepEqual(result.resources,[]);assert.ok(result.reason);
  if(outcome!=='failure')assert.equal(result.platformHint,'平台提示');
 }
});
