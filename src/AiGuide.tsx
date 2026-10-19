import { useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, Check, BookOpen } from 'lucide-react';
import { stations, type City } from './data';

export type Reference = { title: string; url: string };
type ObservationReply = { source: 'ai'; feedback: string; question: string; references: Reference[] };
type LetterReply = { source: 'ai'; draft: string; references: Reference[] };
type GuideProps = { city: City; age: number; observation: string };

export function useAiRequest<T>(kind: 'observe' | 'letter' | 'prepare' | 'ask' | 'album', input: object) {
  const [response, setResponse] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const context = JSON.stringify(input);
  const currentContext = useRef(context);
  currentContext.current = context;
  useEffect(() => {
    controller.current?.abort();
    setResponse(null); setError(''); setLoading(false);
    return () => controller.current?.abort();
  }, [context]);
  async function request() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLoading(true); setError(''); setResponse(null);
    const timeout = window.setTimeout(() => active.abort(), 30000);
    try {
      const res = await fetch(`/learning-ai/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: context, signal: active.signal
      });
      const data = await res.json();
      if (controller.current !== active || currentContext.current !== context) return;
      if (!res.ok) throw new Error(data.error || 'AI暂时无法回答，请重试');
      setResponse(data as T);
    } catch (e) {
      if (controller.current === active && currentContext.current === context) {
        setError(active.signal.aborted ? '等待AI回复超时，请重试' : e instanceof Error ? e.message : '连接失败，请重试');
      }
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === active && currentContext.current === context) setLoading(false);
    }
  }
  return { response, error, loading, request, context };
}

export function Sources({ references }: { references: Reference[] }) {
  return <div className="ai-sources">路线资料：{references.map(r => <a key={r.url} href={r.url} target="_blank" rel="noreferrer">{r.title}</a>)}</div>;
}

type ClassroomReply = { story: string; questions: string[]; references: Reference[] };
export function PreparationClass({ city, age }: { city: City; age: number }) {
  const { response, error, loading, request } = useAiRequest<ClassroomReply>('prepare', { city, age });
  return <section className="ai-guide preparation-class" id="preparation-class" aria-label="行前小课堂">
    <div className="ai-heading"><BookOpen size={17}/><h4>AI 行前小课堂</h4></div>
    <p className="ai-description">给{age}岁的孩子讲一段{stations[city].name}的长江故事，带着三个问题出发。</p>
    <p className="ai-privacy">点击后仅发送站点和年龄。切换站点或年龄后，可重新生成课堂。</p>
    <button className="ai-button" disabled={loading} onClick={request}>{loading ? <RefreshCw className="spin" size={15}/> : <Sparkles size={15}/>} {loading ? '正在准备课堂…' : response ? '再上一堂小课堂' : '生成本站行前小课堂'}</button>
    {error && <p className="error" role="alert">{error}</p>}
    <div aria-live="polite">{response && <div className="ai-response"><h5>先听一个长江故事</h5><p>{response.story}</p><h5>带着三个问题出发</h5><ol className="learning-questions">{response.questions.map((question, index) => <li key={index}>{question}</li>)}</ol><small>AI 辅助讲解，具体开放与接待以现场为准。</small><Sources references={response.references}/></div>}</div>
  </section>;
}


type AnswerReply = { answer: string; followUp: string; references: Reference[] };
const examples: Record<City,string[]> = {
  source: ['为什么要在长江源头保护环境？', '沱沱河和长江有什么关系？'],
  yibin: ['三江口的三条江有什么关系？', '上游的垃圾可能影响下游吗？'],
  wuhan: ['江滩和城市生活有什么关系？', '为什么江边的垃圾需要分类？'],
  nanjing: ['邮局为什么在一节绿皮火车里？', '我们可以怎样守护江边的动物？'],
  shanghai: ['湿地为什么像一个大海绵？', '江水到了河口会发生什么？']
};
export function FieldQuestions({ city, age }: { city: City; age: number }) {
  const [question, setQuestion] = useState('');
  useEffect(() => setQuestion(''), [city]);
  const { response, error, loading, request } = useAiRequest<AnswerReply>('ask', { city, age, question });
  return <section className="ai-guide field-questions" id="field-questions" aria-label="现场问答">
    <div className="ai-heading"><Sparkles size={17}/><h4>AI 现场问答</h4></div>
    <p className="ai-description">在{stations[city].name}遇到好奇的事，随时问一问。每次回答一个问题。</p>
    <div className="question-examples">{examples[city].map(example => <button key={example} onClick={() => setQuestion(example)}>{example}</button>)}</div>
    <label>想问长江什么？<textarea maxLength={300} placeholder="例如：这里为什么会有这间邮局？" value={question} onChange={event => setQuestion(event.target.value)}/></label>
    <p className="ai-privacy">仅发送所选站点、年龄和问题。请勿输入真实姓名、联系方式；回答不代表实时现场信息。</p>
    <button className="ai-button" disabled={question.trim().length < 2 || loading} onClick={request}>{loading ? <RefreshCw size={15} className="spin"/> : <Sparkles size={15}/>} {loading ? '正在想一想…' : '请 AI 讲一讲'}</button>
    {error && <p className="error" role="alert">{error}</p>}
    <div aria-live="polite">{response && <div className="ai-response"><p>{response.answer}</p><h5>再想一想</h5><p>{response.followUp}</p><Sources references={response.references}/><small>AI 的解释可能有误，可以和家长一起查阅资料。</small></div>}</div>
  </section>;
}

export function ObservationGuide(props: GuideProps) {
  const { response, error, loading, request } = useAiRequest<ObservationReply>('observe', props);
  const ready = props.observation.trim().length >= 5;
  return <div className="ai-guide">
    <div className="ai-heading"><Sparkles size={17}/><h4>AI 观察导师</h4></div>
    <p className="ai-description">写下你的真实发现，导师会给你一点反馈，再问一个值得观察的问题。</p>
    <p className="ai-privacy">点击后仅将城市、年龄和这条观察发送给模型服务；请勿填写真实姓名或联系方式。</p>
    <button type="button" className="ai-button" disabled={!ready || loading} onClick={request}>
      {loading ? <RefreshCw size={15} className="spin"/> : <Sparkles size={15}/>}{loading ? '导师正在想一想…' : response ? '再给我一个观察问题' : '和 AI 聊聊我的发现'}
    </button>
    {!ready && <small className="muted">先写下至少5个字的观察，就可以请导师帮忙。</small>}
    {error && <p className="error" role="alert">{error}</p>}
    <div aria-live="polite">{response && <div className="ai-response">
      <p>{response.feedback}</p><h5>再观察一下</h5><p>{response.question}</p>
      <small>AI 的解释可能有误，请和家长一起讨论；只在开放步道安全观察。</small>
      <Sources references={response.references}/>
    </div>}</div>
  </div>;
}

export function LetterAssistant({ onUseDraft, ...props }: GuideProps & { action: boolean; letter: string; onUseDraft: (draft: string) => void }) {
  const { response, error, loading, request, context } = useAiRequest<LetterReply>('letter', props);
  const [draft, setDraft] = useState('');
  const [used, setUsed] = useState(false);
  const appliedContext = useRef<string | null>(null);
  useEffect(() => { setDraft(''); setUsed(context === appliedContext.current); }, [context]);
  useEffect(() => { if (response) { setDraft(response.draft); setUsed(false); } }, [response]);
  const ready = props.observation.trim().length >= 5;
  function adoptDraft() {
    appliedContext.current = JSON.stringify({ ...props, letter: draft.trim() });
    onUseDraft(draft.trim());
    setUsed(true);
  }
  return <div className="ai-guide">
    <div className="ai-heading"><Sparkles size={17}/><h4>AI 写信助手</h4></div>
    <p className="ai-description">把你的观察和已有寄语整理成草稿，读一读、改一改，再决定是否用在明信片上。</p>
    <p className="ai-privacy">点击后将城市、年龄、观察、家长确认状态和已有寄语发送给模型服务；不发送昵称。</p>
    <button type="button" className="ai-button" disabled={!ready || loading} onClick={request}>
      {loading ? <RefreshCw size={15} className="spin"/> : <Sparkles size={15}/>}{loading ? '正在整理你的来信…' : '帮我整理给长江的信'}
    </button>
    {!ready && <small className="muted">先完成“记录一个发现”，再请助手帮忙。</small>}
    {error && <p className="error" role="alert">{error}</p>}
    <div aria-live="polite">{response && <div className="ai-response">
      <label>AI 寄语草稿（可以修改）<textarea maxLength={160} value={draft} onChange={e => { setDraft(e.target.value); setUsed(false); }}/></label>
      <small>{draft.length} / 160 · 草稿还未写入手账</small>
      <p className="ai-review">和孩子一起确认内容符合真实经历，写上自己的守护承诺。</p>
      <button type="button" className="ai-button" disabled={draft.trim().length < 5} onClick={adoptDraft}><Check size={15}/>确认，用这段寄语</button>
      <Sources references={response.references}/>
    </div>}</div>
    {used && <p className="ai-applied" role="status">已填入上方寄语，可以继续修改。</p>}
  </div>;
}
