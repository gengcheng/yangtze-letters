import { Download, RefreshCw, Sparkles, BookOpen } from 'lucide-react';
import { stations, stationOrder, type City } from './data';
import { Sources, useAiRequest, type Reference } from './AiGuide';
import { hasRecord, renderAlbum, taskStatus, type AlbumRecord, type AlbumReview } from './album';

export function MemoryAlbum({ records, age }: { records: Record<City, AlbumRecord>; age: number }) {
  const cities = stationOrder.filter(city => hasRecord(records[city]));
  const input = { age, records: cities.map(city => ({ city, observation: records[city].observation, letter: records[city].letter, action: records[city].action, quiz: records[city].quiz })) };
  const { response, error, loading, request } = useAiRequest<AlbumReview & { references: Reference[] }>('album', input);
  const ready = input.records.some(record => record.observation.trim().length >= 5 || record.letter.trim().length >= 5);

  function downloadAlbum() {
    const html = renderAlbum(cities.map(city => ({ station: stations[city], record: records[city] })), response || undefined);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = '我的长江游学纪念册.html'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="paper-panel memory-album" id="memory-album" aria-labelledby="album-title">
    <span className="eyebrow">YOUR FAMILY TRAVEL JOURNAL</span><h2 id="album-title"><BookOpen size={24}/> 我的游学纪念册</h2>
    <p className="muted">汇总本浏览器里有记录的站点，收藏原始观察、寄语、任务与纪念邮戳。无需完成全部任务也可下载。</p>
    {cities.length ? <div className="album-stations">{cities.map(city => <span key={city}>{stations[city].name} · {stations[city].number}<small>{taskStatus(records[city]).filter(Boolean).length} / 4 项任务</small></span>)}</div> : <p className="album-empty">先完成一项任务，或写下一条观察、寄语，你的纪念册就从这里开始。</p>}
    <p className="ai-privacy">点击生成 AI 导读时，仅发送年龄、各站观察与寄语、答题和家长确认状态；不发送昵称或日期。下载文件在浏览器内生成。</p>
    <div className="album-actions"><button className="ai-button" disabled={!ready || loading} onClick={request}>{loading ? <RefreshCw size={16} className="spin"/> : <Sparkles size={16}/>} {loading ? '正在整理导读…' : response ? '重新生成 AI 导读' : '生成 AI 纪念册导读'}</button><button className="primary" disabled={!cities.length || loading} onClick={downloadAlbum}><Download size={17}/>下载游学纪念册</button></div>
    {!ready && cities.length > 0 && <p className="muted">写下至少5字的观察或寄语后，即可生成 AI 导读；也可以直接下载已有记录。</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div aria-live="polite">{response && <div className="ai-response"><h5>AI 记录导读</h5><p>{response.summary}</p><h5>带回家的小行动</h5><p>{response.nextStep}</p><small>导读随原始记录一同导出，请和孩子核对；修改记录后需重新生成。</small><Sources references={response.references}/></div>}</div>
    <p className="album-export-note">下载的是可离线打开的 HTML 小册子；打开后可打印或另存为 PDF。仅四项任务全部完成的站点显示纪念邮戳。</p>
  </section>;
}
