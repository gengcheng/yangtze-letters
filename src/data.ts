import { newStations } from './newStations';
export type City = 'source' | 'yibin' | 'wuhan' | 'nanjing' | 'shanghai';
export const stations = {
  ...newStations,
  wuhan: { name:'武汉', number:'07', label:'江城来信', theme:'在城市与江水之间，读懂母亲河', location:'汉口江滩 · 长江7号主题邮局', description:'从汉口江滩出发，看看一座城市如何与长江一起生活。在江岸观察、学习分类，把一份小小的守护写进明信片。', source:'https://www.wuhan.gov.cn/sy/whyw/202506/t20250617_2596273.shtml', image:'/images/wuhan-postoffice.jpg', imageAlt:'武汉西藏中学学生参观长江7号主题邮局', imageCredit:'长江7号邮局实景 · 来源：长江日报 / 武汉市政府', stops:[['09:30','与长江见面','汉口江滩','沿开放步道散步，观察江水、岸线与城市生活。'],['10:30','邮局里的长江课','长江7号主题邮局','认识邮局故事与长江保护；到访和现场服务请提前确认。'],['12:00','自带水杯的午餐','江滩周边','安排午餐与休息，减少一次性包装。'],['14:00','给江岸做一件小事','开放公共步道','成人陪同观察并捡拾安全垃圾，记录分类。'],['15:30','寄一封信给长江','游学手账','完成学习任务，写下今天的发现与守护承诺。']], question:'江边的塑料包装可能怎样影响长江？', answers:['随雨水进入江河，影响水环境和动物','只影响美观，与江水无关','会自行快速消失'], correct:0, observation:'今天在江岸看到哪些生活痕迹？想一想它们可能怎样进入江水。' },
  shanghai: { name:'上海', number:'11', label:'河口来信', theme:'跟着一滴江水，走向大海', location:'宝山 · 吴淞炮台湾湿地公园', description:'在长江与大海相遇的地方，寻找湿地里的生命。认识潮汐与岸线垃圾，从一片江岸开始，理解水的漫长旅程。', source:'https://www.green-river.org.cn/show-15-470-1.html', image:'/images/shanghai-postoffice.jpg', imageAlt:'上海长江11号主题邮局内的长江流域全图墙', imageCredit:'长江11号邮局实景 · 来源：上海宝山官方微信 / 绿色江河', stops:[['09:30','寻找江海交汇的线索','吴淞炮台湾湿地公园','在开放步道观察河口景观，讨论江水最终流向哪里。'],['10:30','听一间邮局的故事','长江11号主题邮局','认识长江主题邮局与湿地保护；现场讲座需另行确认。'],['12:00','一顿少包装的午餐','公园周边','自带水杯与餐具，留出亲子休息时间。'],['14:00','湿地观察与守护','开放公共步道','记录植物或鸟类，观察垃圾来源，不进入滩涂。'],['15:30','把发现寄给未来','游学手账','完成任务，写下对长江与大海的祝愿。']], question:'河口湿地对水环境有什么帮助？', answers:['为生物提供栖息地，并帮助过滤部分污染物','让所有垃圾立刻消失','湿地只供游客拍照'], correct:0, observation:'观察一种湿地植物或鸟类，描述它的样子，以及它与水的关系。' }
};
export const sources = [ ['武汉长江7号邮局 · 武汉市政府',stations.wuhan.source],['上海长江11号邮局 · 绿色江河',stations.shanghai.source],['上海河口环保实践 · 上海市政府','https://www.shanghai.gov.cn/nw15343/20260403/5bf461d36ab74d2fae5f34fb9487415c.html'] ];

export const stationOrder: City[] = ['source', 'yibin', 'wuhan', 'nanjing', 'shanghai'];
export const stationLabels: Record<City,string> = {source:'长江源头 · 江源探索',yibin:'长江上游 · 三江探索',wuhan:'长江中游 · 江城探索',nanjing:'长江下游 · 滨江探索',shanghai:'长江河口 · 湿地观察'};
for (const city of ['source','yibin','nanjing'] as City[]) sources.push([`${stations[city].name}长江${stations[city].number}号邮局`,stations[city].source]);
sources.push(['宜宾邮局照片 · 宜宾融媒（搜狐转载）','https://www.sohu.com/a/902133550_121117460'],['南京邮局照片 · 江南时报','https://m.thepaper.cn/newsDetail_forward_33364265']);
