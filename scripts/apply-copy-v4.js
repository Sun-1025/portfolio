'use strict';

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'site.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.site.version = '4.0.0';
data.site.title = '孙志昊 · 嵌入式 / 物联网作品集';
data.site.tagline = '把想法做成能跑的东西。';
data.site.description = '孙志昊的个人技术档案：嵌入式、物联网与端侧应用。项目、实践、在线工具和真实记录。';
data.site.footer = '© 2026 孙志昊 · HTML / Tailwind / Vanilla JS 手写';
data.site.themeColor = '#070908';
data.site.accent = '#d6f36a';

data.home.hero = {
  eyebrow: '山东石油化工学院 · 物联网工程 2025 级',
  title: '把想法\n做成能跑的东西。',
  intro: '做嵌入式与端侧应用。写代码、接传感器、跑通链路，再把结果交给真实场景。现在开放实习，方向是嵌入式、物联网和 AI 应用。',
  primary: { label: '看项目', href: '#/work' },
  secondary: { label: '打开工具台', href: '#/tools' },
  visual: '/assets/signal-core.webp',
  source: '主要版本，站内使用',
  alternate: {
    label: '备选版本 B',
    title: '先扎住，\n再一点点往前。',
    intro: '不是天赋型选手，习惯把大问题拆成今天能动手的一步。方向是嵌入式、物联网和 AI 应用，先把基本功练实，再把手上的东西交出去。',
    primary: { label: '从项目看起', href: '#/work' },
    secondary: { label: '发封邮件', href: 'mailto:1322816531@qq.com' }
  }
};

data.home.stats = [
  { value: '3.83', label: '绩点 / 5.0' },
  { value: '前 20%', label: '专业排名' },
  { value: '3', label: '核心项目' },
  { value: '99', label: '转换路径' }
];

data.home.selectedIds = ['case-iot', 'case-lib', 'case-physics'];

data.home.practice = [
  {
    label: '学院预备实习',
    org: '山东石油化工学院 · 技术方向',
    period: '2026 学年 — 至今',
    role: '项目申报 · 方案拆解',
    summary: '把项目背景、目标和验证步骤写成别人能复核的条目。第一次申报书被问「创新点在哪」，改到第四遍才像样。'
  },
  {
    label: '技术开发实习',
    org: 'C 语言图书管理系统 · 独立开发',
    period: '2026.07 — 2026.08',
    role: '需求 · 数据库 · 编码 · 测试',
    summary: '从需求到交付自己走一遍，数据层用 SQL Server，异常输入和边界情况在交付前逐个处理。'
  },
  {
    label: '东营区图书馆',
    org: '小小物理学家探险队 · 主要负责人',
    period: '2026.10 — 至今',
    role: '课程研发 · 项目统筹 · 主讲',
    summary: '联合学院与图书馆做少儿物理公益课，设计 8 节以上课程，完成 5 场以上授课，覆盖 30 余名儿童。'
  }
];

data.home.hobbies = [
  {
    no: '01',
    title: '骑行',
    meta: '长距离 / 东营周边',
    text: '风大就低头蹬。很多想不明白的事，骑一圈回来会清楚一点。'
  },
  {
    no: '02',
    title: '羽毛球',
    meta: '双打 / 补位',
    text: '球路要预判，站位要补位。一个人强没用，两个人有默契才有用。'
  },
  {
    no: '03',
    title: '策略游戏',
    meta: '先想清楚，再动手',
    text: '偏爱策略、模拟经营和开放世界。玩的时候也会拆它的交互和资源分配。'
  },
  {
    no: '04',
    title: '日常记账',
    meta: '从大一开始',
    text: '记久了才知道钱花在哪。把有限资源分好，和做项目是一回事。'
  }
];

data.home.principles = [
  {
    label: 'PLAN / DO / DONE',
    title: '把今天能动手的那一步先做掉',
    text: '计划拆到今天能动手；做的时候只看眼前这一步；做完留个结果，哪怕结果是「失败了，原因是这个」。'
  },
  {
    label: '结硬寨，打呆仗',
    title: '难事先扎住，再一点点啃',
    text: '不指望一次想明白所有事。先把能验证的部分做出来，再回头改。'
  },
  {
    label: '交付前先当最不讲理的用户',
    title: '输入空的、编号重复、文件坏了，都先自己试一遍',
    text: '系统能跑不算完，得顶住真实场景里的坏输入和断线。'
  }
];

data.home.about.lead = '我把做过的事、踩过的坑，还有接下来想走的方向放在这里。先写我具体做过什么，再写我怎么想。';
data.home.about.lines[5] = '暑假我一个人写了套图书管理系统，需求、结构、菜单、异常处理都得自己定，数据放在 SQL Server 里。最费时间的是想别人会怎么把它用坏，输入空的、编号重复、文件读到一半坏了。写到后面养成个习惯，交之前先当一次最不讲理的用户，能顶住才算完。';
data.home.about.facts = data.home.about.facts.map((f) => {
  if (f.k === '年龄') return { ...f, k: '年级', v: '2025 级 · 大二' };
  if (f.k === '身份资质') return { ...f, v: '预备实习 · 开放实习' };
  return f;
});

data.work.title = '项目与经历';
data.work.intro = '这里放我做过的项目、实习、校园活动和几个爱好。点开一段，能看到当时的背景、我负责的部分，以及最后留下的结果。';

const cases = data.work.cases;
const byId = Object.fromEntries(cases.map((c) => [c.id, c]));

const lib = byId['case-lib'];
lib.role = '需求梳理 · 数据层设计 · 编码 · 测试交付';
lib.summary = '独立完成需求梳理、数据库设计与全功能开发。用 C 语言写业务逻辑，SQL Server 搭数据层，覆盖增删改查与异常拦截，交之前先按最不讲理的用户视角把系统用坏一遍。';
lib.cover = '/assets/illustrations/cover-library.svg';
lib.tags = ['C 语言', 'SQL Server', '数据结构', '异常处理', '工程交付'];
lib.sections[1].p = '实习初期，我对标线下社区图书馆与班级图书角的真实业务场景，梳理出图书信息管理、借阅流程管控、用户操作交互三大核心需求，拆解为图书信息录入、多条件查询、借阅登记、归还注销四大功能模块。\n技术架构上，采用 C 语言结构化程序设计思路，以结构体作为业务数据载体，封装图书编号、书名、作者、出版信息、库存状态等字段；数据层用 SQL Server 建立图书、借阅与用户数据表，用主键、约束和索引承担一部分一致性检查，业务代码负责事务边界与异常处理。';
lib.sections[2].p = '编码阶段，我基于前期设计方案逐模块推进功能落地。数据管理层面，实现图书信息的增、删、改、查全链路操作，通过 SQL Server 参数化查询完成结构化存储与多条件检索，可稳定承载 100 条以上图书数据的日常管理需求。\n业务流程层面，打通借阅与归还的完整闭环，通过库存状态字段的实时同步更新，实现借阅状态的动态管控，从逻辑上规避重复借阅、超量借阅等问题。\n用户交互层面，设计层级清晰的命令行菜单，搭配操作引导与状态提示，引导用户分步完成各项操作，降低非技术用户的使用门槛。';
lib.result = '四大核心功能、一套能编译运行的工程，数据层落在 SQL Server。';

const iot = byId['case-iot'];
iot.summary = '负责 APP 端声音可视化与异常提醒，参与识别阈值标定和 WiFi 传输链路联调。把采样、传输、告警整条链路跑通，也处理过断网重连和误报。';
iot.cover = '/assets/illustrations/cover-voice.svg';

const physics = byId['case-physics'];
physics.summary = '面向小学生的物理科普公益课，用气球、纸杯、手电筒把知识点变成能上手的小实验。负责课程设计、现场授课和三方协调。';
physics.cover = '/assets/illustrations/cover-physics.svg';
physics.result = '让四十分钟里至少出现三次「哇」，比讲完一页 PPT 重要。';

data.notices = [
  {
    id: 'v4',
    title: '站点完成视觉与文案重构',
    body: '导航、字体、项目封面和 AI 入口已更新；原有路由、主题切换和工具保持可用。',
    enabled: true,
    level: 'info',
    date: '2026-11-23'
  }
];

data.tools.intro = '把文件拖进来，选目标格式，批量转换后直接下载。图片、数据、文档、音频、PDF、Office、电子书和 3D 模型都在浏览器本地处理，不上传服务器。';

data.ai.quick = ['你在做什么项目', '会哪些技术', '能实习吗'];

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('updated', file);
