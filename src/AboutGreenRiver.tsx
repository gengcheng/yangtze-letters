import { ArrowUpRight, X } from 'lucide-react';
import { sources } from './data';

export function AboutGreenRiver({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-label="关于绿色江河" onClick={event => event.stopPropagation()}>
      <button className="modal-close" aria-label="关闭介绍" onClick={onClose}><X/></button>
      <span className="eyebrow">ABOUT GREEN RIVER</span>
      <h2>绿色江河</h2>
      <p>从长江源头到入海口，连接人与自然，让江河保护成为共同的行动。</p>
      <h3>机构简介</h3>
      <p>绿色江河是长江生态环境保护联盟的简称，联结四川、青海格尔木、上海宝山等地的环保公益机构。其中，四川省绿色江河环境保护促进会于1995年开始筹备、1999年完成注册。</p>
      <p>绿色江河通过实地调查、保护站建设、志愿者行动与公众科普，推动更多人了解江河生态、参与自然保护。</p>
      <h3>主要工作</h3>
      <ul className="organization-projects">
        <li><strong>守护江源</strong><span>以长江源水生态环境保护站为基地，探索高原垃圾回收与环境治理。</span></li>
        <li><strong>保护野生生命</strong><span>开展生物多样性调查、冰川监测与班德湖斑头雁守护。</span></li>
        <li><strong>连接公众行动</strong><span>通过绿色驿站、长江主题邮局和自然科普，连接源头与河口的环保参与。</span></li>
      </ul>
      <h3>了解与参与</h3>
      <p>想进一步了解项目或参与志愿服务，可以前往绿色江河官网查看机构介绍、项目动态与志愿者招募信息。</p>
      <a className="source-link" href="https://www.green-river.org.cn/list-7-1.html" target="_blank" rel="noreferrer">绿色江河官方机构介绍 <ArrowUpRight size={16}/></a>
      <a className="source-link" href="https://www.green-river.org.cn/" target="_blank" rel="noreferrer">访问绿色江河官网 <ArrowUpRight size={16}/></a>
      <p className="muted">介绍依据绿色江河官网整理。本站为独立游学演示，与绿色江河无已确认的官方合作关系。</p>
      <details className="organization-sources"><summary>本站游学图片与路线资料来源</summary>{sources.map(([label,url]) => <a className="source-link" href={url} key={url} target="_blank" rel="noreferrer">{label}<ArrowUpRight size={14}/></a>)}</details>
    </section>
  </div>;
}
