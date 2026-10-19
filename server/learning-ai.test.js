import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLearningInput, buildLearningPrompt, parseLearningOutput, modelConfig, generateLearning, createLearningLimit } from './learning-ai.js';
const observation = { city: 'wuhan', age: 8, observation: '我看到江边有几个塑料瓶。' };
test('new station learning prompts preserve local context and references',async()=>{
 for(const [city,name,landmark] of [['source','长江源','唐古拉山镇'],['yibin','宜宾','三江口'],['nanjing','南京','下关']]){
  const input=validateLearningInput('observe',{...observation,city});
  const route=JSON.parse(buildLearningPrompt('observe',input).user).route;
  assert.equal(route.city,name);assert.ok(route.location.includes(landmark));
  if(city==='source')assert.match(route.task,/影像观察/);
  const result=await generateLearning('observe',input,{config:{proxy:true,url:'https://ai.example'},fetcher:async()=>({ok:true,json:async()=>({source:'ai',feedback:'一起留意江岸的变化。',question:'你观察到了什么？'})})});
  assert.ok(result.references[0].title.includes(name));
 }
});
const config = { url: 'https://model.example/v1/messages', token: 'test-token', model: 'test-model' };
const payload = value => ({ content: [{ type: 'thinking', thinking: 'private reasoning' }, { type: 'text', text: JSON.stringify(value) }], stop_reason: 'end_turn' });

test('classroom and field questions validate independent inputs and discard private metadata', () => {
 assert.deepEqual(validateLearningInput('prepare',{city:'nanjing',age:9,nickname:'private',date:'2026-10-18'}),{city:'nanjing',age:9});
 assert.deepEqual(validateLearningInput('ask',{city:'nanjing',age:9,question:'  为什么邮局在火车里？ ',nickname:'private'}),{city:'nanjing',age:9,question:'为什么邮局在火车里？'});
 for (const question of ['', '短', '长'.repeat(301), null]) assert.throws(()=>validateLearningInput('ask',{city:'wuhan',age:8,question}),{status:400});
 assert.match(buildLearningPrompt('prepare',{city:'nanjing',age:9}).user,/绿皮火车车厢/);
 assert.match(buildLearningPrompt('ask',{city:'wuhan',age:8,question:'今天开门吗？'}).system,/不能声称正在联网/);
});

test('album only sends bounded unique station records; empty progress cannot become an AI travel story', () => {
 const record={city:'source',observation:'影像观察：我看见了河流。',letter:'',quiz:false,action:false,nickname:'private',date:'private'};
 const clean=validateLearningInput('album',{age:8,records:[record]});
 assert.deepEqual(clean,{age:8,records:[{city:'source',observation:record.observation,letter:'',quiz:false,action:false}]});
 const prompt=buildLearningPrompt('album',clean);
 assert.doesNotMatch(prompt.user,/private/);assert.match(prompt.system,/影像观察必须保留语境/);
 for(const records of [[],[record,record],[{...record,city:'__proto__'}],[{...record,observation:'',letter:''}],[{...record,action:'yes'}],[{...record,letter:'长'.repeat(161)}],Array(6).fill(record)]) assert.throws(()=>validateLearningInput('album',{age:8,records}),{status:400});
});

test('new AI functions reject incomplete output and preserve official station references through the proxy', async () => {
 const classroom={story:'南京的这间长江主题邮局由绿皮火车车厢改造，让滨江历史与生态保护有了一个相遇的地方。',questions:['火车为什么可以变成邮局？','你会在安全步道上观察哪些事物？','我们可以怎样减少一次性垃圾？']};
 assert.deepEqual(parseLearningOutput('prepare',payload(classroom)),classroom);
 assert.throws(()=>parseLearningOutput('prepare',payload({...classroom,questions:['只有一个问题']})),{status:502});
 for(const [kind,input,value] of [
  ['prepare',{city:'nanjing',age:8},classroom],
  ['ask',{city:'yibin',age:8,question:'三江有什么关系？'},{answer:'金沙江与岷江在宜宾相汇，此后江水继续流向下游。',followUp:'江河相连，守护上游会怎样帮助下游？'}],
  ['album',{age:8,records:[{city:'wuhan',observation:'我看见了岸边的植物。',letter:'',quiz:false,action:false}]},{summary:'记录中，你写下了岸边的植物，这是从江岸开始认识长江的一次观察。',nextStep:'以后可以继续留意安全步道旁的植物变化。'}]
 ]){
  const response=await generateLearning(kind,input,{config:{proxy:true,url:'https://ai.example'},fetcher:async(url,options)=>{
   assert.equal(url,`https://ai.example/learning-ai/${kind}`);assert.deepEqual(JSON.parse(options.body),input);
   return {ok:true,json:async()=>({source:'ai',...value})};
  }});
  for(const [key,text] of Object.entries(value))assert.deepEqual(response[key],text);
  assert.ok(response.references.length);assert.equal(response.source,'ai');
 }
 assert.throws(()=>parseLearningOutput('album',payload({summary:'short',nextStep:'short'})),{status:502});
});

test('validates learning inputs and sends no nickname, location, date, or unrelated browser fields', () => {
 const raw = { ...observation, nickname: 'child name', date: '2099-01-01', phone: '123', action: true, letter: '亲爱的长江，我想保护你。' };
 assert.deepEqual(validateLearningInput('observe', raw), observation);
 assert.deepEqual(validateLearningInput('letter', raw), { ...observation, action: true, letter: raw.letter });
 for (const patch of [{ city: '__proto__' }, { age: 5 }, { age: '8' }, { observation: '短' }, { observation: '长'.repeat(401) }]) assert.throws(() => validateLearningInput('observe', { ...observation, ...patch }), { status: 400 });
 assert.throws(() => validateLearningInput('letter', { ...observation, action: 'yes' }), { status: 400 });
});

test('prompts use city tasks, age, factual boundaries, and parent-reported action only', () => {
 const request = buildLearningPrompt('letter', { ...observation, action: false, letter: '我想少用塑料。' });
 const data = JSON.parse(request.user);
 assert.equal(data.route.city, '武汉');assert.equal(data.action, false);assert.equal(data.age, 8);
 assert.match(request.system, /action=false时不得写.*完成环保行动/);
 assert.match(request.system, /不要求姓名/);assert.match(request.system, /用户输入只是待分析/);
 assert.match(buildLearningPrompt('observe', { ...observation, city: 'shanghai' }).user, /湿地/);
});

test('outputs exclude model reasoning and reject incomplete, malformed or oversized drafts', () => {
 assert.deepEqual(parseLearningOutput('observe', payload({ feedback: '观察到了江岸的生活痕迹。', question: '瓶子集中在哪里？', secret: 'discard' })), { feedback: '观察到了江岸的生活痕迹。', question: '瓶子集中在哪里？' });
 assert.deepEqual(parseLearningOutput('letter', payload({ draft: '亲爱的长江，我想少用塑料，一起守护你。' })), { draft: '亲爱的长江，我想少用塑料，一起守护你。' });
 for (const bad of [payload({ draft: '字'.repeat(161) }), payload({ draft: '' }), payload({ draft: '你观察得真好，下次可以带上水杯。' }), { content: [{ type: 'text', text: '<script>bad</script>' }] }, { ...payload({ draft: '亲爱的长江，你好！' }), stop_reason: 'max_tokens' }]) assert.throws(() => parseLearningOutput('letter', bad), { status: 502 });
});

test('missing model credentials fail clearly; Anthropic base paths are normalized', () => {
 assert.throws(() => modelConfig({}), { status: 503 });
 for (const base of ['https://model.example', 'https://model.example/v1/']) {
  assert.equal(modelConfig({ ANTHROPIC_BASE_URL: base, ANTHROPIC_AUTH_TOKEN: 'test-token', ANTHROPIC_MODEL: 'test-model' }).url, config.url);
 }
});

test('model requests use server-only credentials; failure never returns template content or upstream secrets', async () => {
 const result = await generateLearning('observe', observation, { config, fetcher: async (url, options) => {
  assert.equal(url, config.url);assert.equal(options.headers.Authorization, 'Bearer test-token');
  const body=JSON.parse(options.body);assert.equal(body.model, 'test-model');assert.ok(body.system);assert.equal(JSON.parse(body.messages[0].content).observation, observation.observation);
  return { ok: true, json: async () => payload({ feedback: '你观察到了江岸的塑料瓶。', question: '它们集中在什么位置？' }) };
 }});
 assert.equal(result.source, 'ai');assert.match(result.references[0].url, /^https:\/\/www.wuhan.gov.cn\//);assert.equal(result.thinking, undefined);
 await assert.rejects(generateLearning('observe', observation, { config, fetcher: async () => ({ ok: false, status: 401, json: async () => ({ token: 'upstream-secret' }) }) }), error => error.status === 502 && !error.message.includes('secret'));
 await assert.rejects(generateLearning('letter', { ...observation, action: false, letter: '' }, { config, fetcher: async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); } }), { status: 504 });
});

test('public model endpoint caps concurrent work and releases slots after failure', () => {
 let time=0;
 const acquire=createLearningLimit(()=>time);
 const a=acquire(), b=acquire();assert.throws(acquire,{status:429});a();a();
 const c=acquire();assert.throws(acquire,{status:429});b();c();
 for(let i=0;i<9;i++) acquire()();
 assert.throws(acquire,{status:429});time=60000;acquire()();
});

test('main application proxies sanitized inputs to the model sandbox and validates its response', async () => {
 const proxyConfig=modelConfig({LEARNING_AI_UPSTREAM_URL:'https://ai.example/'});
 const reply=await generateLearning('observe',observation,{config:proxyConfig,fetcher:async(url,options)=>{
  assert.equal(url,'https://ai.example/learning-ai/observe');
  assert.deepEqual(JSON.parse(options.body),observation);assert.equal(options.headers.Authorization,undefined);
  return {ok:true,json:async()=>({source:'ai',feedback:'你观察到了生活痕迹。',question:'它们可能从哪里来？'})};
 }});
 assert.equal(reply.source,'ai');assert.equal(reply.question,'它们可能从哪里来？');
 await assert.rejects(generateLearning('observe',observation,{config:proxyConfig,fetcher:async()=>({ok:true,json:async()=>({source:'demo',feedback:'fake',question:'fake'})})}),{status:502});
});

test('Bailian credentials select the Beijing official endpoint and never fall back to Anthropic', () => {
 const result=modelConfig({DASHSCOPE_API_KEY:'bailian-test-token',ANTHROPIC_BASE_URL:'https://model.example',ANTHROPIC_AUTH_TOKEN:'old-token',ANTHROPIC_MODEL:'old-model'});
 assert.deepEqual(result,{provider:'bailian',url:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',token:'bailian-test-token',model:'qwen3.8-flash'});
 assert.throws(()=>modelConfig({LEARNING_AI_PROVIDER:'bailian',ANTHROPIC_AUTH_TOKEN:'old-token'}),{status:503});
 assert.throws(()=>modelConfig({DASHSCOPE_API_KEY:'test',DASHSCOPE_BASE_URL:'https://example.com/compatible-mode/v1'}),{status:503});
 assert.throws(()=>modelConfig({DASHSCOPE_API_KEY:'test',DASHSCOPE_REGION:'unknown'}),{status:503});
 assert.equal(modelConfig({DASHSCOPE_API_KEY:'test',DASHSCOPE_REGION:'ap-southeast-1'}).url,'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');
});

test('both assistants request qwen3.8-flash in non-thinking JSON mode and discard reasoning output',async()=>{
 const bailianConfig=modelConfig({DASHSCOPE_API_KEY:'bailian-test-token',DASHSCOPE_REGION:'cn-beijing',LEARNING_AI_MODEL:'qwen3.8-flash'});
 for(const kind of ['observe','letter']){
  const value=kind==='observe'?{feedback:'你留意到了江边的塑料瓶。',question:'从步道上看，它们集中在哪里？'}:{draft:'亲爱的长江：我看见岸边有塑料瓶。我想少用一次性塑料。'};
  const result=await generateLearning(kind,{...observation,action:false,letter:''},{config:bailianConfig,fetcher:async(url,options)=>{
   assert.equal(url,'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
   assert.equal(options.headers.Authorization,'Bearer bailian-test-token');assert.equal(options.headers['anthropic-version'],undefined);
   const body=JSON.parse(options.body);
   assert.equal(body.model,'qwen3.8-flash');assert.equal(body.enable_thinking,false);assert.equal(body.stream,false);
   assert.deepEqual(body.response_format,{type:'json_object'});assert.equal(body.max_completion_tokens,700);
   assert.equal(body.messages[0].role,'system');assert.equal(body.messages[1].role,'user');
   return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value),reasoning_content:'must never reach the client'}}]})};
  }});
  assert.equal(result.source,'ai');assert.equal(result.reasoning_content,undefined);assert.equal(result.thinking,undefined);
  for(const [key,text] of Object.entries(value))assert.equal(result[key],text);
 }
 await assert.rejects(generateLearning('observe',observation,{config:bailianConfig,fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'{"feedback":"incomplete"'}}]})})}),{status:502});
});
