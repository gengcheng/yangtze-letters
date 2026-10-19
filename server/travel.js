import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../node_modules/@fly-ai/flyai-cli/dist/flyai-bundle.cjs', import.meta.url));
const destinations = { source: { city: '格尔木', poi: '唐古拉山镇 长江1号邮局' }, yibin: { city: '宜宾', poi: '三江口长江公园 知了书店' }, wuhan: { city: '武汉', poi: '汉口江滩' }, nanjing: { city: '南京', poi: '下关滨江火车主题园' }, shanghai: { city: '上海', poi: '吴淞炮台湾湿地公园' } };
const cityName = city => destinations[city].city;
const safeUrl = value => { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; } };
export function validate(body) {
  if (!body || !Object.hasOwn(destinations, body.city) || !['transport','hotel','nearby'].includes(body.category)) throw new Error('请选择有效的城市和资源类型');
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || new Date(body.date).toISOString().slice(0,10) !== body.date) throw new Error('请输入有效日期');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  if (body.date < today) throw new Error('请选择今天或未来的日期');
  if (body.origin !== undefined && (typeof body.origin !== 'string' || body.origin.length > 30 || !/^[\p{L}\s·-]*$/u.test(body.origin))) throw new Error('出发城市格式不正确');
  if (body.category === 'transport') {
    if (!body.origin?.trim()) throw new Error('请填写交通查询的出发城市');
    if (body.origin.trim().replace(/市$/, '') === cityName(body.city)) throw new Error('出发城市与目的地相同，请选择周边亲子资源或填写其他出发城市');
    if (body.transportMode !== undefined && !['train','flight'].includes(body.transportMode)) throw new Error('请选择火车票或机票');
  }
  return body;
}
export function normalize(payload) {
  if (payload.status !== 0) throw new Error('旅行平台暂未返回可用结果');
  return (payload.data?.itemList || []).map(item => {
    const x = item.info || item;
    return { title: x.title || x.name || '旅行资源', price: String(x.price || '价格以平台为准'), image: safeUrl(x.picUrl || x.mainPic), url: safeUrl(x.jumpUrl || x.detailUrl), description: x.interestsPoi || x.review || (x.tags || []).join(' · ') };
  }).slice(0,6);
}
export function normalizeTransport(payload, mode) {
  if (payload.status !== 0) throw new Error('交通平台暂未返回可用结果');
  const expectedType = mode === 'flight' ? '飞机' : '火车';
  return (payload.data?.itemList || []).flatMap(item => {
    const segments = (item.journeys || []).flatMap(j => j.segments || []);
    if (!segments.length || !segments.every(s => s.transportType === expectedType && s.marketingTransportNo && s.depStationName && s.arrStationName && s.depDateTime && s.arrDateTime)) return [];
    const numbers = segments.map(s => s.marketingTransportNo).join(' → ');
    const names = [...new Set(segments.map(s => s.marketingTransportName).filter(Boolean))].join(' / ');
    const amount = item.adultPrice ?? item.ticketPrice ?? item.price;
    const duration = item.totalDuration ?? item.journeys?.[0]?.totalDuration;
    const durationText = duration == null || duration === '' ? '' : /^\d+$/.test(String(duration)) ? `${duration}分钟` : String(duration);
    return [{
      title: `${mode === 'flight' ? '航班' : '火车'} ${numbers}${names ? ` · ${names}` : ''}`,
      price: amount == null || amount === '' ? '票价以平台为准' : `参考票价 ${/^[¥￥]/.test(String(amount)) ? amount : `¥${amount}`}`,
      url: safeUrl(item.jumpUrl), image: safeUrl(item.picUrl),
      description: segments.map(s => `${s.depStationName}${s.depTerm ? ` ${s.depTerm}` : ''} → ${s.arrStationName}${s.arrTerm ? ` ${s.arrTerm}` : ''} · ${s.depDateTime} → ${s.arrDateTime}${s.seatClassName ? ` · ${s.seatClassName}` : ''}`).join('；') + (durationText ? ` · 全程${durationText}` : '')
    }];
  }).slice(0,6);
}
export async function search(body, runner = execute) {
  const city = cityName(body.city);
  const poi = destinations[body.city].poi;
  const isTransport = body.category === 'transport';
  const mode = body.transportMode || 'train';
  const args = isTransport ? [mode === 'flight' ? 'search-flight' : 'search-train', '--origin', body.origin.trim(), '--destination', city, '--dep-date', body.date] : body.category === 'hotel' ? ['search-hotel','--dest-name',city,'--poi-name',poi,'--check-in-date',body.date,'--check-out-date',new Date(new Date(body.date).getTime()+86400000).toISOString().slice(0,10)] : ['keyword-search','--query',`${city} ${poi} 周边亲子景点 ${body.date}`];
  let platformHint = '';
  try {
    const options = { timeout: 20000, maxBuffer: 4*1024*1024 };
    let output;
    try {
      output = await runner(process.env.FLYAI_BIN || 'flyai', args, options);
    } catch (e) {
      if (e.code !== 'ENOENT' || process.env.FLYAI_BIN) throw e;
      output = await runner(process.execPath, [cli,...args], options);
    }
    const payload = JSON.parse(output.stdout.trim());
    platformHint = payload.systemMessage || '';
    const resources = isTransport ? normalizeTransport(payload, mode) : normalize(payload);
    if (!resources.length) throw new Error(isTransport ? `没有找到匹配的${mode === 'flight' ? '航班' : '车次'}，请检查城市和日期，或更换交通方式` : '没有找到匹配资源');
    return { source:'live', queriedAt:new Date().toISOString(), resources, platformHint, reason:'' };
  } catch (e) {
    const reason = e.killed ? '旅行查询超时，请稍后重试' : /Trial limit reached/.test(e.stderr || '') ? 'FlyAI 试用额度已用尽，请在服务端配置正式 API Key' : e.message.startsWith('没有找到匹配') ? e.message : '旅行服务暂时不可用，请稍后重试';
    if (isTransport) return { source:'unavailable', queriedAt:new Date().toISOString(), reason, platformHint, resources:[] };
    return { source:'demo', queriedAt:new Date().toISOString(), reason, platformHint:'以下是演示建议，不代表实时价格、库存或预约信息。', resources:[{ title:body.category === 'hotel' ? `${poi}周边亲子住宿` : `${poi}江岸自然观察`, price:'演示建议 · 无实时报价', description:body.category === 'hotel' ? '优先考虑公共交通便利的住宿，出行前自行确认房型与价格。' : '在开放公共步道观察江岸植物和垃圾来源，不进入未开放区域。' }] };
  }
}
