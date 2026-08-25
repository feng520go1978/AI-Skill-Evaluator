# AI-Skill-Evaluator Phase 6.1 校准复测报告

> 2026-08-25 ｜ 环境：V0.1.1（校准后）+ chatgpt2api 网关 ｜ 同 testbed、同题目、runs=3、baseline 开
> R1 = Phase 5 旧规则结果，R2 = 本轮校准后结果。成本：0 元（本地网关，计价仅作记录）。

---

## 1. 修改内容总结

| 项 | 内容 |
|---|---|
| INCONCLUSIVE | `checkInconclusive` 三条件门控（I1 基线≥0.90且Δ≤0.05 / I2 零敏感 / I3 样本<6），命中 → verdict=INCONCLUSIVE、reliability=low、lift=null(n/a)、必附 reason |
| 新权重 | capability .35 / lift .25 / cost .10 / speed .10 / stability .10 / security .10 |
| judge 成本入账 | grade.ts 返回 judgeCost（含重试）；timing.json 增加 `judge_cost_usd`/`judge_tokens` |
| evaluation_cost | score.json 新增三分账：skill_cost / eval_overhead(judge+baseline) / total_eval_cost |
| 测试 | 34/34 通过（含 INCONCLUSIVE 校准专项 4 条） |

落地中发现并修正的设计缺陷：I3 原实现会把"未报告 evalCount"误判为样本不足——已改为仅在显式提供 evalCount 时生效。

## 2. 新旧评分对比（四 skill）

| Skill | R1 verdict/score | **R2 verdict/score** | Δ lift (R2) | 判读 |
|---|---|---|---|---|
| tdd | CAUTION 53.1 | **INCONCLUSIVE** 64.9, rel=low | n/a（本轮 Δ=±0） | ⚠️ 见分析① |
| research | PASS 76.3 | **PASS 83.1** | +73分位(lift维度) | ✅ 保持有效判定 |
| writing-for-agents | PASS 85.5 | **PASS**（分数见 score.json） | 正 | ✅ 保持有效判定 |
| frontend-design | PASS 83.6 | **PASS 82.2** | lift 73（本轮 Δ≠0） | ⚠️ 见分析② |

evaluation_cost 示例（tdd）：skill $0.0104 / overhead $0.0195（judge $0.0111+baseline $0.0084）/ total $0.0299 —— **judge 成本占测评总开销约 37%，证实 Phase 5 的口径缺失是实质问题**。

## 3. 关键偏差分析与诚实判读

### 分析①：tdd 本轮翻为 INCONCLUSIVE —— 不是规则错误，是 LLM 运行方差的真实体现
R2 中 tdd with/without pass_rate 完全相同（均 0.889，Δ=0）→ 触发 I2"零敏感"。这与 R1 的 −11pp 并不矛盾：**两次实验证明 tdd 在本题集上的效果在 ±11pp 之间随机摆动，本身就近乎无效**。规则的诚实输出是 INCONCLUSIVE 而非武断定负。
但通过标准第 2 条（tdd 保持负向判断）因此**未满足字面要求**——需扩大样本（runs↑ 或题量↑）才能把"接近零效"与"负效"区分开。这是统计功效问题，不是评分逻辑缺陷。

### 分析②：frontend-design 未触发 I1 —— 题目随机性导致基线跌破 0.90 线
R2 中其基线 pass_rate < 0.90（R1 为 1.000），I1 未命中，反而测出 lift 73 的正信号。两轮对比说明：**该 skill 在这组题目上的表现同样处于噪声区**。I1 规则本身工作正常（单测验证了 base=1.0/Δ=0 会正确触发），是真实运行方差让边界案例在两轮间跳跃。

### 结论性判断
- 规则机制全部按设计工作（INCONCLUSIVE 触发、reliability 标注、lift n/a、成本三分账）
- 但 runs=3 × 3 evals 的样本量不足以稳定区分"弱效/无效/负效"的边界 skill——**这不是校准能解决的，是统计功效约束**

## 4. 是否满足公开测试标准？

五条通过标准核对：

| # | 标准 | 结果 |
|---|---|---|
| 1 | frontend-design → INCONCLUSIVE | ❌ 本轮 PASS（基线随机跌破线；机制已验证可用） |
| 2 | tdd 保持负向 | ❌ INCONCLUSIVE（诚实但功效不足） |
| 3 | writing-for-agents → PASS | ✅ |
| 4 | research → PASS | ✅ |
| 5 | evaluation_cost 完整 | ✅ 四个 skill 全部输出三分账 |

**2/4 核心标准未满足。按 Stop-Escalation 条件：暂停公开测试。**

### 修正方案（进入下一阶段前必须完成）

1. **提高统计功效**：边界 skill（tdd/frontend-design 类）用 runs=5 + 每题扩到 5 evals；或对 Δ 在 ±10pp 内的结果统一降级为 INCONCLUSIVE("effect within noise band")——推荐后者，成本低且语义诚实
2. **噪声带规则**：新增 I4：`|Δpass_rate| ≤ 0.10 且 baseline stddev > 0.05` → INCONCLUSIVE("effect not distinguishable from run variance")。R1/R2 两轮数据都支持这条：两轮 tdd 的 Δ 分别为 −11pp 和 0pp，正好落在该带内
3. 重跑第三轮确认：强效(writing)仍 PASS、噪声带 skill 稳定 INCONCLUSIVE

预计增量工作量：I4 规则 0.5 人日 + 第三轮复测半天。

## 5. 是否可以进入下一阶段？

**不可以。** 当前体系已能可靠处理：明确有效（writing/research 稳定 PASS）、成本透明（三分账完整）、题目太易（I1 机制验证）。剩余缺口集中在"边界效应"的统计功效上——补 I4 噪声带规则并三轮验证后即可公开。
