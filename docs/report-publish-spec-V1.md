# AI-Skill-Evaluator 首批公开测评案例发布规范 V1.0

> 2026-08-25 ｜ 适用范围：所有以项目名义发布的 Skill 测评报告
> 定位：第三方测评机构风格——结论可复现、措辞可辩护、对作者无攻击性。

---

## 1. 公开报告必含信息（缺一不可发布）

### 元数据块（报告头部，表格形式）

| 字段 | 说明 |
|---|---|
| Skill 名称 + 来源仓库 | 含作者/组织名，链接到原 repo |
| 测试日期 | 单日或多日区间 |
| Evaluator 版本 | 本项目 commit SHA |
| Target 模型 | 精确模型 ID + endpoint 类型 |
| Judge 模型 | 同上 |
| runs × evals | 如 3×3 |
| baseline 开关 | 是/否 |

### 结果块

- 六维分数表（capability/lift/cost/speed/stability/security）
- overall 分 + verdict
- Δ pass_rate（with−without）与基线 pass_rate
- evaluation_cost 三分账（skill_cost / eval_overhead / total）

### 证据块

- 至少 2 条判官 evidence 原文摘录（支撑关键结论的）
- INCONCLUSIVE 时：命中的具体 gate 与 reason

### 限制块

- 本报告不适用的场景
- 判官/样本量局限声明

### 可复现块

- 完整命令行 + evals.json 要点 + 原始工件链接

**硬规则：任何一块缺失 = 不满足验收标准 §5。**

## 2. C1 tdd 报告发布结构（首发模板）

```
标题：We tested the most-installed TDD skill for Claude Code three times.
      The honest result: inconclusive.

① TL;DR（3 行内）
   - verdict 卡片：INCONCLUSIVE (reliability: low)
   - 一句结论：三轮实测 Δ 在 -11pp ~ 0pp 间摆动，
     效果信号弱于运行噪声，无法给出有效/无效判断。

② 为什么测它
   - 安装量最高的工程 skill 之一；"热门≠有效"的最好试金石。
   - 引 SkillsBench 数据铺垫：16/84 任务装了 skill 反而变差。

③ 测试方法（可复现块）
   - 环境、模型、runs=3、baseline、3 条自编 evals（附 evals.json 链接）
   - 明确声明：题目为本项目自编，非官方评测。

④ 结果
   - 三轮 Δ 序列表（R1 −11pp → R2 0pp → R3 触发噪声带）
   - 六维分表 + benchmark.json 摘录
   - evidence 摘录 2 条：with_skill 漏掉空字符串边界测试、
     缺少"测试应先失败"的显式声明——引用判官原话。

⑤ 为什么不是简单打分（本篇灵魂段落）
   - 解释 I4 噪声带：-11pp 和 0pp 来自同一 skill+同一题目，
     这个摆动本身就是测量噪声的实测值。
   - 给 INCONCLUSIVE 而不是武断 FAIL/PASS，是工具诚实性的体现：
     "我们宁可说不知道，也不编一个分数。"

⑥ 限制说明
   - 单 judge 模型；自编题目可能未覆盖该 skill 的最佳使用场景；
     样本量 9 次 target 运行不构成统计显著性。
   - 欢迎作者提供官方 evals，我们愿意用更高样本量重测。

⑦ 结论 + 复现指引
   - 给用户的建议：此 skill 在我们的任务集上未显示可区分的提升；
     是否安装取决于你对作者的信任与本报告的独立验证权重。
   - 完整复现命令 + 工件链接。

语气基线：全程只描述测量结果，不用"垃圾/智商税/翻车"定性词；
对作者的隐含姿态是"邀请提供官方 evals 重测"，而非审判。
```

## 3. 社区传播注意事项

### 禁止（红线，违反即撤稿）
1. 标题党夸大（"吊打""智商税""翻车现场"等定性词进标题）
2. 宣称某 Skill "是垃圾"——我们只能说"在本次测试中未显示可区分提升"
3. 隐藏测试条件或选择性展示轮次
4. 用 R1 的 −11pp 单独传播而不提三轮全貌（选择性引用=撒谎）
5. 在作者明确请求下拒绝撤下或更新报告（可加"作者回应"附录，不可删报告）

### 要求
- 第三方机构风格：冷数据、热方法。数据冷静呈现，方法论热情讲解。
- 每篇都主动邀请复现和反驳："如果你跑出了不同结果，请开 issue 附工件。"
- 作者回应权：任何被测 skill 作者的公开回应，以附录形式加进报告原文之下。

## 4. 数据沉淀规划

```
examples/reports/
├── 2026-08-tdd-mattpocock/
│   ├── report.md            # 按 §1 结构的正式报告
│   ├── evals.json           # 所用题目（全文公开）
│   ├── benchmark.json       # 三轮汇总原始数据
│   └── score.json           # 六维分 + evaluation_cost
├── 2026-08-writing-for-agents/
├── ...
└── INDEX.md                 # 报告索引表：skill/日期/verdict/Δ/链接
```

- **INDEX.md 即未来 Skill 测试数据库的雏形**：每行一条测评记录（skill/来源/日期/模型/verdict/Δ/cost），积累到 50+ 条后天然形成私有数据资产的公开层。
- 原始工件（grading/timing JSON）保留在 git 历史；INDEX 只链最终报告。
- 命名规范：`YYYY-MM-<skill>-<author>`，同 skill 多轮用 `YYYY-MM-<skill>-r2` 后缀。

## 5. 发布验收标准（全部 ✅ 才可公开）

| # | 标准 | 验证方式 |
|---|---|---|
| 1 | §1 七大信息块齐全且真实 | 对照 workspace 工件核对 |
| 2 | 数据来自 ≥2 个自然日或 ≥3 runs（防单次抖动） | benchmark.json 时间戳 |
| 3 | verdict 与 score.json 一致（不可手改） | diff 校验 |
| 4 | evidence 摘录 ≥2 条且与 grading.json 原文一致 | diff 校验 |
| 5 | 限制说明包含至少 3 条真实局限 | 人工审读 |
| 6 | 可复现命令在本机重跑成功 | 实际执行 |
| 7 | 措辞过红线检查（§3 五条禁止逐条对照） | 人工审读 |
| 8 | PROJECT_STATE 台账登记该报告为工件 | 台账可见 |

## Stop-Escalation 检查

C1–C4 四个案例的三轮数据完整、evidence 可回查、判定路径均有文档支撑——**不存在"结果无法公开解释"的情况**。版权风险已核（报告引用判官输出属合理使用范畴，且均标注来源）。无需停止发布。
