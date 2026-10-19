# Yangtze Letters · 长江来信

An AI-powered family learning journey along the Yangtze River.

面向6–12岁亲子家庭的公益游学 Web 原型。以长江主题邮局为探索起点，连接行前学习、江岸观察、环保行动和旅行记录。

## 五站长江探索

| 站点 | 邮局编号 | 探索主题 |
|---|---|---|
| 长江源 | 01 | 沱沱河、江源与草原共学 |
| 宜宾 | 04 | 三江汇流与上下游的连接 |
| 武汉 | 07 | 城市生活与江岸环境 |
| 南京 | 10 | 滨江文化与生态保护 |
| 上海 | 11 | 长江河口与湿地生态 |

长江源站支持公开影像共学，不作为从格尔木出发的一日游。交通查询仅到格尔木中转城市，前往唐古拉山镇的后续行程需要单独规划。

## 功能

- **首页轮播**：五座邮局图片与文案默认每5秒切换，支持手动切换、暂停和响应式布局。
- **行前小课堂**：按站点和年龄生成讲解及三个探索问题。
- **现场问答**：回答本站江河自然与文化相关问题，附公开资料来源与启发问题。
- **观察导师**：基于孩子的真实观察提供反馈和追问。
- **四步游学护照**：学习、观察、家长确认环保行动、给长江写信；各站进度独立保存。
- **写信助手**：整理观察与已有寄语，生成可编辑、需确认后采用的草稿。
- **纪念册和明信片**：汇总有记录的站点，生成 AI 导读，下载离线 HTML 小册子；完成四项任务后可下载带本站纪念邮戳的明信片 PNG。
- **旅行查询**：通过 FlyAI 官方 CLI 查询交通、住宿及周边资源。

## 技术栈

React 19、TypeScript、Vite、Express、Node.js、阿里云百炼、FlyAI 官方 CLI。

百炼运行时默认使用 `qwen3.8-flash`，由服务端调用 OpenAI 兼容的 Chat Completions API，关闭思考模式并使用 JSON 结构化输出。站点背景由应用提供，模型不进行实时网页检索。

## 本地运行

需要 Node.js 22+，并支持 `--env-file-if-exists`。依赖从 npm 公共源安装。

```bash
npm ci
cp .env.example .env
```

在 `.env` 中填写自己的 `DASHSCOPE_API_KEY` 和 `FLYAI_API_KEY`。可在以下平台获取配置：

- [阿里云百炼](https://bailian.console.aliyun.com/)
- [FlyAI 开放平台](https://flyai.open.fliggy.com/)

```bash
npm run dev
```

访问 `http://localhost:5173`。开发命令同时启动 Vite 与端口3001的 Node.js 服务；Vite 转发学习和旅行 API 请求。若修改后端端口，请同步修改 `vite.config.ts` 中的代理目标。

未配置模型凭证时，前端、任务记录和本地导出仍可使用，AI 请求会明确报错。旅行查询受平台权限、额度及库存影响，失败时展示明确标注的演示建议或暂无结果，不返回虚构票价与车次。

## 测试与生产启动

```bash
npm test
npm run build
npm start
```

默认访问 `http://localhost:3001`。生产服务同时提供 `dist/` 静态文件和 API。容器或远程部署时设置 `HOST=0.0.0.0`，并通过部署平台的环境变量或凭证管理配置自己的 Key。

自动化测试覆盖请求校验、站点上下文、模型输出解析、异常与限流处理、旅行结果映射，以及纪念册导出的文本转义和任务邮戳状态。测试使用模拟响应，不需要真实模型或旅行平台凭证。

## 体验流程

选择站点 → 选择日期与年龄 → 生成行前小课堂 → 提问或查询出行资源 → 领取任务 → 填写观察 → 家长确认行动 → 整理给长江的信 → 下载纪念册或明信片。

下载的纪念册为可离线阅读的 HTML 文件，打开后可打印或另存为 PDF。未完成的任务仍按实际状态记录，不生成已完成邮戳。

## API

| 路径 | 主要输入 | 输出 |
|---|---|---|
| `POST /learning-ai/prepare` | `city`、`age` | 行前讲解与三个问题 |
| `POST /learning-ai/ask` | `city`、`age`、`question` | 回答与启发问题 |
| `POST /learning-ai/observe` | `city`、`age`、`observation` | 观察反馈与追问 |
| `POST /learning-ai/letter` | `city`、`age`、`observation`、`action`、`letter` | 寄语草稿 |
| `POST /learning-ai/album` | `age`、`records` | 纪念册导读与行动建议 |
| `POST /travel-api/search` | `city`、`date`、`category` | 旅行资源及来源状态 |

站点标识为 `source`、`yibin`、`wuhan`、`nanjing`、`shanghai`。年龄限定为6–12岁。纪念册最多包含五个不重复站点，每站只接收 `city`、`observation`、`letter`、`quiz`、`action`。

旅行分类为 `nearby`、`hotel`、`transport`。交通查询另需出发城市 `origin`，可选 `transportMode` 为 `train` 或 `flight`。日期使用 `YYYY-MM-DD`，且为今天或未来日期。兼容路径 `POST /api/travel/search` 仍保留；部署时优先使用 `/travel-api/search`，避免与网关系统路径冲突。

## 数据与使用边界

- 手账仅保存在访问者浏览器的 `localStorage` 中，不跨设备同步，清理浏览器数据会删除进度。
- 仅在用户点击 AI 按钮后发送对应的站点、年龄、观察、问题或寄语等必要字段；昵称和日期不发送给模型。
- 模型凭证只在服务端读取。服务端不将观察、寄语和模型回复持久化到应用数据库或日志；模型平台的数据策略由相应服务提供方管理。
- AI 调用具有超时、并发和频次限制；回复可能有误，需与家长和公开资料核对。
- 本项目不进行物种识别、水质检测或环保成效认定，不提供支付或活动报名。
- 路线与课程由本站设计，开放时间与现场服务需提前确认。本站与绿色江河、中国邮政无已确认的官方合作关系；邮戳不代表官方盖戳、认证或志愿服务时长。

## 资料与素材来源

- [绿色江河机构介绍](https://www.green-river.org.cn/list-7-1.html)
- [长江源1号邮局 · 新华网](https://www.xinhuanet.com/gongyi/20250605/10729d28986c4e308900d9d817feedd0/c.html)
- [宜宾4号邮局 · 绿色江河](https://www.green-river.org.cn/show-20-507-1.html)
- [武汉7号邮局 · 武汉市政府](https://www.wuhan.gov.cn/sy/whyw/202506/t20250617_2596273.shtml)
- [南京10号邮局 · 中国邮政](https://www.chinapost.com.cn/cn/report/2606/3916-1.html)
- [上海11号邮局 · 绿色江河](https://www.green-river.org.cn/show-15-470-1.html)

邮局图片的报道出处见页面卡片及 `src/data.ts`、`src/newStations.ts`。第三方图片和视频保留原有来源与标识，不表示官方合作或授权背书。
