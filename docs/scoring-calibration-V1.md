# AI-Skill-Evaluator 评分体系校准报告 V1.0

> 2026-08-25 ｜ 依据：Phase 5 四 skill 实测数据（基线通过率 0.667–1.000，Δlift −11.1pp ~ +22.2pp）
> 性质：规则校准设计，不含代码改动。所有规则以 Phase 5 实测值为标定依据。

---

## 1. 当前问题分析

### 实测数据复盘

| Skill | 基线 pass_rate | Δ lift | tokens(with/without) | 现行判定 | 问题 |
|---|---|---|---|---|---|
| frontend-design | **1.000** | ±0 | 2671/997 | PASS 83.6 | 🔴 天花板盲区：假高分 |
| tdd | 0.889 | −11.1pp | 1607/742 | CAUTION 53.1 | ✅ 抓到负资产；但 stability=0 有夸大 |
| research | 0.815 | +7.4pp | 1391/1210 | PASS 76.3 | ✅ 正常 |
| writing-for-agents | 0.667 | +22.2pp | 2984/793 | PASS 85.5 | ✅ 正常 |

### 问题清单

**P1｜天花板盲区（frontend-design）**
基线 100% 通过 → Δ=0 → lift 只得 40 分，但 capability 满分撑出 83.6 的误导性高分。**本质：题目无区分度时，整个评测不可判，而当前体系仍输出分数。**

**P2｜stability 过罚**
runs=3、temperature 0 下，LLM 判官天然抖动使 stddev≈0.16 成为常见值，现行公式 `1−stddev/0.25` 把它打到 37 分——三个正常 skill 全部因"不稳定"被扣。tdd 的 0.31 被抓是对的，但 0.16 和 0.31 不该差 63 分。

**P3｜成本口径不全**
timing.json 只记 target 调用（实测 1357 tokens / $0.003）。judge 每条 eval 也调一次模型，tokens 未入账。用户视角的"测一次这个 skill 花多少钱" = target + judge 总账，当前缺一半。

**P4｜缺少"无法判断"出口**
PASS/CAUTION/FAIL 三档隐含"数据足以判断"的前提，但没有任何机制检查这个前提。

---

## 2. INCONCLUSIVE 规则设计

### 判定规则（按顺序检查，任一命中即 INCONCLUSIVE）

| # | 条件 | 阈值与依据 | 覆盖问题 |
|---|---|---|---|
| I1 | **基线天花板**：without_skill 基线 pass_rate ≥ **0.90** 且 Δpass_rate ≤ **+0.05** | 0.90 标定自实测：frontend 基线 1.0（盲区）、tdd 0.889（可判，恰好低于线）；0.05 容忍带避免把 +5pp 内的真实微弱提升误杀——此时即使有提升也无实用价值 | P1 |
| I2 | **区分度不足**：所有 eval 的 with/throughout 通过率完全相同（Δ=0 且方差=0），无论基线高低 | 说明题目对被测 skill 完全不敏感 | P1 变体 |
| I3 | **样本不足**：runs×evals < 6（如 runs=2 × evals=2）或 runs<2 且用户要求稳定性结论 | 统计上无法区分真效果与抖动 | 数据可信度 |

### 输出形态

- verdict 字段新增第四态 `INCONCLUSIVE`
- **同时必须给出 reason**，三选一："baseline near-perfect — task too easy for this skill"（I1）/ "task shows no sensitivity to the skill"（I2）/ "insufficient sample size"（I3）
- INCONCLUSIVE 时**仍然输出六维分数**，但 overall 分数标注 `reliability: low`，报告/UI 层弱化显示——分数仍有参考价值，只是不能作为结论
- 六维中 lift 维在 I1 命中时显示为 `n/a` 而非 40 分中性值

### 关键取舍说明

不做"自动加难题重跑"——那是新功能（越界）。INCONCLUSIVE 是诚实地说"这题测不出"，把压力放回测试任务设计端。

---

## 3. 推荐评分权重

### 调整方案

| 维度 | 现行 | **建议** | 理由 |
|---|---|---|---|
| capability | 30% | **35%** | 用户第一问永远是"它本身好不好"；且 capability 是最稳定的度量（判官逐断言，受抖动影响小于跨 run 差值） |
| lift | 25% | **25%** | 保持。Phase 5 证明它能抓负资产（tdd），是差异化核心 |
| cost | 15% | **10%** | 成本是次要决策因素；且口径修复（见 §4）前其精度撑不起 15% |
| speed | 10% | **10%** | 保持 |
| stability | 15% | **10%** | P2 实证过罚；降权而非放宽阈值——阈值放宽会放过 tdd 那种真不稳定 |
| security | 5% | **10%** | 它是**门控维度**（critical 直接 FAIL），权重 5% 与门控地位不匹配；提到 10% 让"有安全嫌疑但未达 critical"的 skill 得到应有惩罚 |
| 合计 | 100% | **100%** | |

### 明确不改的东西

- lift 的打分曲线（−10pp→0 / +20pp→100）保持：tdd 案例验证了它的区分力
- stability 归零点 0.25 保持：靠降权解决过罚，不动阈值——若同时动两者会让 tdd 这类案例重新溜走
- security 门控规则（critical → FAIL）保持

---

## 4. 成本计算规则

### 口径定义（三分账）

| 科目 | 内容 | 用途 |
|---|---|---|
| **skill_cost** | with_skill 模式下 target 调用成本 × runs | "装这个 skill 后每次使用的开销"——对应真实使用场景 |
| **eval_overhead** | judge 全部调用 + without_skill 基线调用的成本 | "为了得出结论付出的测量成本"——一次性沉没成本 |
| **total_eval_cost** | skill_cost(全部 runs) + eval_overhead | "这次测评总共花多少钱" |

### 记录规则

1. timing.json 增加 `judge_tokens` / `judge_cost_usd` 字段（gradeOutputs 返回的 ProviderResult 已有数据，只是当前被丢弃——接线即可，非新功能）
2. benchmark.json 的 AggStats 增加 `cost_usd`（已实现）之外，新增顶层 `evaluation_cost: {target_with, target_without, judge, total}`
3. score.json 的 cost 维度打分**只用 skill_cost**（衡量 skill 本身贵不贵）；报告展示三层全列
4. pricing 表未知模型的 `estimated: true` 必须透传到最终报告，估算值不得伪装成实价

---

## 5. 测试有效性前置检查（流程设计）

```
测试任务 (evals.json)
   ↓
【前置检查】运行 without_skill 基线（现有 baseline 流程已产出该数据）
   ↓
有效性判断：
   ├─ I1 基线 ≥90% 且 Δ≤5%？ ──是──► INCONCLUSIVE(too easy)
   ├─ I2 全程零差异零方差？ ──是──► INCONCLUSIVE(no sensitivity)
   └─ I3 runs×evals<6？      ──是──► INCONCLUSIVE(undersampled)
   ↓ 否
正常评分（六维加权，新权重）
   ↓
Verdict: PASS / CAUTION / FAIL（security critical 强制 FAIL）
```

实现要点：I1/I2 只依赖 benchmark.json 已有字段（基线 mean、delta、stddev），是纯后置判定逻辑，无需改执行流程——**属于评分规则范畴，不是新模块**。建议落点在 scoring.ts 入口处做前置分支。

---

## 6. 第二轮验证方案

### 目的

验证校准后的规则能修正 Phase 5 的三个偏差，且不引入新偏差。

### 复测矩阵（同一批 testbed，零代码外改动）

| Skill | 预期变化 | 验证点 |
|---|---|---|
| **frontend-design** | PASS 83.6 → **INCONCLUSIVE**(I1: 基线1.0, Δ=0) | 天花板盲区被正确拦截 |
| **tdd** | CAUTION 53.1 → FAIL 或低分 CAUTION（lift 0 分不变、stability 扣分从 15% 降至 10% 权重后总分微升，但负资产性质不变） | 校准不放过负资产 |
| **writing-for-agents** | 保持 PASS（预计 ~87，capability 权重上升小幅抬分） | 好skill不被误伤 |
| **research** | 保持 PASS（预计 ~78） | 排序稳定 |

### 额外对照实验

- **换 judge 复验 tdd**：用第二个 judge 模型复跑 tdd 一组，确认负 lift 不是单一判官的偏见（Phase 5 遗留项）
- **难度过滤验证**：人工将 frontend-design 的 evals 改难（要求裸模型大概率失败的约束性任务），确认能从 INCONCLUSIVE 翻转为可判——证明 I1 规则引导正确的题目设计行为

### 通过标准（全部满足才算校准成功）

1. frontend-design 判 INCONCLUSIVE，reason 含 "baseline"
2. tdd verdict ∈ {FAIL, CAUTION} 且 reasons 含负面 lift 描述
3. writing/research 维持 PASS 且排序不变
4. score.json 中出现 evaluation_cost 三层分账

---

## 7. 是否达到公开测试标准？

# 结论：暂缓 —— 本阶段只完成规则设计，需第二轮实测通过后方可公开

- 本报告的规则（INCONCLUSIVE 三条件、新权重、成本三分账）尚未经过实测验证，**规则未经数据检验就公开等于用用户当测试员**。
- 第二轮复测满足 §6 全部四条通过标准后，即达到公开标准。
- 预计工作量：规则落地 0.5–1 人日（均为 scoring.ts 内逻辑调整）+ 复测半天。

### Stop-Escalation 检查

触发"继续修正"分支：当前体系可以可靠识别**有效/无效**，但尚不能可靠拒绝**不可判**的场景。修正路径明确（本报告 §2/§3/§4），无方向性问题，不需要推翻重来。
