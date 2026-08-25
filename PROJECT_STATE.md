# PROJECT_STATE — AI-Skill-Evaluator

> 本文件是项目的唯一状态入口（Single Source of Truth）。跨会话接手先读本文件。
> 维护规则：每完成一个阶段/工件立即更新本表；DONE 判定必须过 DONE_CHECKLIST.md。

## 基本信息

| 项 | 值 |
|---|---|
| 项目名称 | AI-Skill-Evaluator |
| 项目目标 | 用户可自测 AI Skill 质量的开源工具：六维评分（能力/提升/成本/速度/稳定/安全）+ PASS/CAUTION/FAIL/INCONCLUSIVE verdict + 成本三分账报告 |
| 技术底座 | Fork 自 darkrishabh/agent-skills-eval (699⭐, MIT, TypeScript) |
| 本地仓库 | C:\Users\Administrator\projects\AI-Skill-Evaluator |
| GitHub remote | ❌ **不存在**（仅本地 git，从未推送） |

## 当前阶段

**Phase 6.1 完成 → Phase 6.2（噪声带规则 I4 + 第三轮验证）待批**
**不可进入公开测试阶段。**

## 阶段台账

| 阶段 | 工件 | 路径/标识 | 状态 |
|---|---|---|---|
| P0 源码接管分析 | 接管分析报告 V1.0 | H:\AI_OS_Command_Center\08_Reports\AI-Skill-Evaluator_源码接管分析报告_V1.0_20260825.md | ✅ |
| P0 项目基线评审 | 基线评审报告 V1.0 | H:\AI_OS_Command_Center\08_Reports\AI-Skill-Evaluator_项目基线评审报告_V1.0_20260825.md | ✅ |
| P1-V0.1 MVP 开发 | pricing/scoring/security/--runs/CLI 集成 | 本地 commit d18704a；34 tests 全绿 | ✅（代码级） |
| P5 真实 Skill 测试 | 测试方案 + 结果分析 | docs/real-skill-test-plan-V1.md; results/real-test-analysis-V1.md; results/{tdd,research,writing,frontend} | ✅ |
| P6 校准设计 | 校准报告 V1.0 | docs/scoring-calibration-V1.md | ✅ |
| P6.1 规则落地+复测 | INCONCLUSIVE/新权重/judge成本入账 + 复测报告 | 本地 commit 41bda2e; docs/phase61-recalibration-report.md; results-r2/ | ⚠️ 代码✅ / 复测报告未 commit |
| **P6.2 噪声带规则 I4 + 第三轮验证** | 未开始 | — | ⬜ 阻塞公开测试 |
| **PUBLISH GitHub 正式接管** | remote 不存在 | — | ❌ **从未执行** |
| HANDOFF 公开发布准备 | README 重写/npm 包名/license 传递说明 | — | ⬜ 未开始 |

## 已完成工件清单（关键）

- 代码：src/{pricing,scoring,security}.ts 新增；{grade,run-eval,evaluate-skills,cli,artifacts,provider,config,index}.ts 改造
- 测试：test/ 共 34 条（含 inconclusive 校准专项），全绿
- 实测数据：results/（R1）+ results-r2/（R2）四 skill × 双模式 × runs3
- 报告链：08_Reports 下市场调研→选型→源码→评审 4 篇 + docs/ 下 4 篇

## 未完成事项（诚实清单）

1. ❌ **GitHub 仓库不存在，两个 commit 从未推送**——"GitHub 正式接管"阶段被遗漏
2. ❌ I4 噪声带规则（|Δ|≤10pp 且基线方差>0.05 → INCONCLUSIVE）未实现——边界 skill 统计功效不足的修复
3. ❌ 第三轮复测未跑——I1 在 R2 因基线随机跌破 0.90 线未触发，需三轮数据确认规则稳定
4. ⚠️ Phase 6.1 报告 + results-r2 数据未 commit（工作区 dirty）
5. ⬜ README 仍是上游原名内容，发布前须重写
6. ⬜ npm 包名 ai-skill-evaluator 未发布（属 PUBLISH 后动作）
7. ⬜ 上游 MIT license 合规传递检查未做（fork 保留 LICENSE 文件已就位，需确认 NOTICE 要求）

## 当前阻塞项

- **公开测试被 Phase 6.1 Stop-Escalation 阻塞**：通过标准 2/4 未满足（frontend-design 未判 INCONCLUSIVE、tdd 负向判断因统计功效不足翻为 INCONCLUSIVE）
- 解除条件：P6.2 完成（I4 落地 + 第三轮复测四条标准全过）

## 下一阶段进入条件

| 进入 | 必须满足 |
|---|---|
| → P6.2 | 用户批准 I4 方案（已在 phase61-recalibration-report.md §4 提出） |
| → 公开测试 | P6.2 三条通过标准全过 + DONE_CHECKLIST 全绿 |
| → PUBLISH | 公开测试通过 + README 重写 + DONE_CHECKLIST 全绿 |
| → HANDOFF | PUBLISH push 成功 + 本文件更新 |
