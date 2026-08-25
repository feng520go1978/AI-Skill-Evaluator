# VALIDATION-04 W1 传播验证报告

> 2026-08-25 ｜ C1 tdd 案例小范围社区验证启动

---

## 1. 发布渠道状态

| 渠道 | 状态 | 说明 |
|---|---|---|
| **GitHub Discussions** | ✅ **已发布** | [Discussion #1](https://github.com/feng520go1978/AI-Skill-Evaluator/discussions/1)（Announcements 版块） |
| GitHub Discussions 开通 | ✅ 本次通过 GraphQL API 开启 | 6 个默认版块就绪：Announcements/General/Ideas/Polls/Q&A/Show and tell |
| Reddit (r/ClaudeAI 等) | ⏸ **需用户手动发帖**——本机无 Reddit 登录态，匿名无法发帖 | 帖子文案已备好（见 §4） |
| HN / B站 / 小红书 | ⏸ 后置 | 按 30 天计划节奏 |

## 2. 已完成动作清单

1. ✅ 开启仓库 Discussions 功能（GraphQL API，此前未启用）
2. ✅ 发布 Eval #001 公告帖至 Announcements：
   - 三轮数据表 + 噪声带解释
   - "What we are NOT saying" 免责段（不攻击 skill/TDD）
   - 完整可复现命令
   - 明确邀请第三方复现与作者回应
3. ✅ 报告本体已在仓库 examples/reports/ 公开

## 3. 触达与反馈记录（Day 0）

| 指标 | 当前值 |
|---|---|
| M1 有效反馈 | 0 |
| M2 第三方复现 | 0 |
| M3 技术讨论 | 0 |
| M5 Star | 0 |
| Discussion 浏览 | 待积累 |

## 4. 待用户执行的传播动作（我无凭据代发）

### Reddit 帖文案（r/ClaudeAI 或 r/mcp，直接可用）

> **标题**：We tested the most-installed TDD skill for Claude Code three times. The honest result: inconclusive.
>
> **正文**：
> We built an open-source evaluator for Agent Skills (SKILL.md folders) and ran it against tdd from mattpocock/skills (~759k installs) — three independent rounds, with/without baseline, LLM-judged with mandatory evidence citations.
>
> Result: the delta swung between −11pp and 0pp across identical runs. Below our noise band. So the verdict is INCONCLUSIVE — we can't distinguish its effect from run variance, and we won't make up a number.
>
> Interesting details: the judge caught the with-skill runs *missing* an empty-string edge case the baseline caught. Full evidence chain in the report.
>
> Everything is reproducible: method + command + raw artifacts at https://github.com/feng520go1978/AI-Skill-Evaluator (MIT)
>
> Curious whether others have seen popular skills do nothing in practice — how do you currently decide what to install?

**建议发帖时间**：欧美工作日上午（Reddit 流量高峰）。

### 其他可选
- X/Twitter 同文案 + 仓库链接
- HN Show HN（建议等有 2–3 篇报告后再投，避免单薄）

## 5. 有效信号判定（沿用 M1–M7 台账）

观察窗口从此刻起算。信号登记到 `docs/validation_metrics.md`。

## 6. Stop-Escalation 监控点

若 7 天后 Discussion 无任何非熟人互动且 Reddit 帖（如用户发布）无有效评论 → 提前触发定位复盘，不等 30 天满期。

---

## 下一步

1. **老板动作**：将 §4 文案发到 Reddit（或授权我用浏览器自动化在有登录态时操作）
2. 我持续监控 Discussion #1 与仓库信号，按周更新 metrics 台账
