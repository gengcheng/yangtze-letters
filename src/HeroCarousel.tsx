import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Leaf, Mail, Pause, Play } from 'lucide-react';
import { stations, stationOrder, stationLabels, type City } from './data';

const copy: Record<City, { title: string; subtitle: string; description: string }> = {
  source: { title: '在长江的起点，', subtitle: '寄出第一封来信。', description: '从沱沱河畔的1号邮局出发，认识江源与草原的故事，把守护写进一滴水的旅程。' },
  yibin: { title: '在三江汇流处，', subtitle: '读懂一条江的相遇。', description: '走近宜宾长江4号邮局，沿着三江口认识上下游的连接，把江岸的发现寄给远方。' },
  wuhan: { title: '把课堂搬到江边，', subtitle: '把热爱寄给长江。', description: '从武汉长江7号邮局出发，在汉口江滩读懂城市与江水，让每一次探索成为温柔的守护。' },
  nanjing: { title: '走进一节绿皮车厢，', subtitle: '打开长江的新来信。', description: '在南京长江10号邮局，连接滨江的历史与生态，和孩子一起收藏城市与江河的故事。' },
  shanghai: { title: '跟着一滴江水，', subtitle: '把来信寄向大海。', description: '来到上海长江11号邮局，在河口认识湿地与生命，为源头到大海的旅程写下新的守护承诺。' }
};

export function HeroCarousel({ onExplore, onAbout }: { onExplore: (city: City) => void; onAbout: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const city = stationOrder[index], station = stations[city], text = copy[city];
  const running = playing && !hovered && !focused && visible;

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = () => { if (motion.matches) setPlaying(false); };
    motion.addEventListener('change', reduceMotion);
    return () => { document.removeEventListener('visibilitychange', update); motion.removeEventListener('change', reduceMotion); };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex(current => (current + 1) % stationOrder.length), 5000);
    return () => window.clearTimeout(timer);
  }, [index, running]);

  function move(delta: number) { setIndex(current => (current + delta + stationOrder.length) % stationOrder.length); }

  return <section className="hero hero-carousel" aria-label="五座长江邮局图片与故事轮播" aria-roledescription="轮播"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } }}>
    <div className="hero-slides" aria-hidden="true">{stationOrder.map((id, i) => <img key={id} className={`hero-slide hero-slide-${id} ${i === index ? 'is-active' : ''}`} src={stations[id].image} alt="" fetchPriority={i === 0 ? 'high' : 'auto'} draggable={false}/>)}</div>
    <div className="hero-overlay"/>
    <div className="hero-content">
      <div className="hero-story" key={city}>
        <span className="eyebrow light"><span/> {stationLabels[city]} · 长江{Number(station.number)}号邮局</span>
        <h1>{text.title}<br/><span>{text.subtitle}</span></h1>
        <p>{text.description}</p>
        <div className="hero-buttons"><button className="primary cream" onClick={() => onExplore(city)}>探索{station.name}这一站 <ArrowRight size={18}/></button><button className="hero-secondary" onClick={onAbout}>了解绿色江河 <ArrowUpRight size={17}/></button></div>
        <div className="hero-tags"><span><Leaf size={15}/> 公益行动</span><span><BookOpen size={15}/> 亲子共学</span><span><Mail size={15}/> 从源头到入海口</span></div>
      </div>
      <p className="hero-image-credit">{station.imageCredit}</p>
    </div>
    <div className="hero-carousel-controls">
      <div className="hero-station-tabs" role="group" aria-label="选择邮局图片">{stationOrder.map((id,i) => <button key={id} className={i === index ? 'selected' : ''} aria-label={`切换到${stations[id].name}${Number(stations[id].number)}号邮局`} aria-pressed={i === index} onClick={() => setIndex(i)}><span>{stations[id].number}</span>{stations[id].name}<i/></button>)}</div>
      <div className="hero-playback"><span className="hero-slide-count" aria-live={playing ? 'off' : 'polite'}>{String(index + 1).padStart(2,'0')} / 05</span><button aria-label="上一座邮局" onClick={() => move(-1)}><ArrowLeft size={17}/></button><button aria-label={playing ? '暂停自动轮播' : '开始自动轮播'} onClick={() => setPlaying(current => !current)}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button><button aria-label="下一座邮局" onClick={() => move(1)}><ArrowRight size={17}/></button></div>
    </div>
    <span className="hero-side">EXPLORE · LEARN · PROTECT</span>
  </section>;
}
