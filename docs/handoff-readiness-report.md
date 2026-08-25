# HANDOFF-01 开源运营准备报告

> 2026-08-25 ｜ 范围：开源基础设施补齐 + 首批公开测试报告组织方案 + 30 天维护计划
> 边界遵守：未新增核心功能、未动评分算法。发现的 package.json 元数据错误已修正（见 §5）。

---

## 1. 仓库缺失文件评估

| 文件 | 状态 | 判定 |
|---|---|---|
| CONTRIBUTING.md | ❌ 缺 | ✅ **已创建**——含开发流程、PR 前检查、代码地图、"evidence over vibes" 原则（评分改动必须附真实数据） |
| CHANGELOG.md | ❌ 缺 | ✅ **已创建**——Keep a Changelog 格式，0.1.0(fork基线)/0.2.0(全部新增能力) 两版 |
| ROADMAP.md | ❌ 缺 | ✅ **已创建**——近期/中期/长期三层 + Non-goals（明确不做 SaaS、不做自动装卸 skill） |
| Issue Templates | ❌ 缺 | ✅ **已创建 2 个**——Bug report（要求附 benchmark.json/score.json）、Methodology discussion（评分改动须附证据，防口嗨） |
| SECURITY.md | ⚠️ 可延后 | 安全扫描器本身的漏洞走 GitHub private advisory 即可，暂不单独建 |
| CODE_OF_CONDUCT.md | ⚠️ 可延后 | 项目早期贡献量小，GitHub 内置行为准则兜底即可 |

**结论：核心四件套已补齐，仓库达到"可持续维护的开源项目基础状态"。**

## 2. 附带发现并修复的问题

🔴 **package.json 的 repository/bugs 字段仍指向上游 darkrishabh/agent-skills-eval**——发布检查遗漏项，已修正为本仓库地址。这正是 PROJECT_STATE 工件登记机制要防的那类断点，说明该机制需要把"元数据指向自查"加进 DONE_CHECKLIST C 类。

## 3. 第一批公开测试报告组织方案

### 形态：`reports/` 目录 + 单篇自包含 Markdown

```
reports/
├── 001-tdd-mattpocock.md        # 每篇结构固定：
│   ├── 一句话 verdict 卡片（PASS/CAUTION/FAIL/INCONCLUSIVE + 分数）
│   ├── 测试配置（模型/runs/题目数——可复现性）
│   ├── 六维分表 + Δ lift
│   ├── 关键 evidence 摘录（判官原话 2–3 条）
│   └── 给用户的建议（装/不装/什么场景用）
├── 002-research-mattpocock.md
└── README.md                    # 报告索引 + 复现方法链接
```

**内容纪律（从三轮验证直接继承）：**
1. INCONCLUSIVE 也照发——"测不出"本身就是对假高分泛滥市场的差异化信息
2. 必须附可复现命令与题目，读者可自行重跑验证
3. tdd 那篇是天然首发爆款素材：75.9 万安装的热门 skill，实测信号弱到跨轮翻转（−11pp↔0pp），最终诚实判 INCONCLUSIVE——标题即冲突点

## 4. 未来 30 天维护计划

| 周 | 动作 | 目标 |
|---|---|---|
| W1 | 发首批 4 篇实测报告（tdd/research/writing/frontend）+ 提交到 r/LocalLLaMA、agentskills 社区、V2EX | 收集首批 issue/反馈，验证报告格式是否可读 |
| W2 | Roadmap 近期项①②：雷达图 + MD 导出；响应首批 issue | 让早期用户看到迭代速度 |
| W3 | 种子题库 v0：按"裸模型通过率 30–70%"难度带筛选 20 题；公开测试报告 ×2 新增 | 解决"用户自测题目太易"的已知局限 |
| W4 | 盘点：star/issue/复跑数据 → 决定是否进 npm 发布 + 多 judge 共识设计 | 数据驱动决定下一投入 |

**持续纪律**：每次 push 后 PROJECT_STATE 台账同步；每篇公开报告过 DONE_CHECKLIST B 类。

## Stop-Escalation 检查

未触发。无架构/License/安全问题。（License 在上一阶段已核：上游 MIT 已保留声明。）
