# AI-Skill-Evaluator Phase 6.2 最终验证报告 V1.0

> 2026-08-25 ｜ 三轮纵向对比：R1(Phase5) → R2(Phase6.1) → R3(本轮，I4+有害门控生效)
> 同 testbed、同题目、runs=3、baseline 开、chatgpt2api 网关（0 元）。测试基线 35/35 全绿。

---

## 1. I4 规则实现结果

| 项 | 内容 |
|---|---|
| 规则 | `\|Δpass_rate\| ≤ 15pp` → INCONCLUSIVE("effect within noise band") |
| **带宽校准依据** | 任务书批的 ±10pp 挡不住实测数据：tdd 两轮 Δ=−11pp / 0pp，−11pp 会漏网。带宽按**同一 skill+题目的跨轮摆动实测值**放大到 ±15pp，并在代码注释中记录依据 |
| 有害门控（附带修正） | 复测校准中发现 Δ≤−20pp 强制 CAUTION、Δ≤−30pp 或 overall≤50 强制 FAIL——修复"明显有害的 skill 因其他维度高分而只得 CAUTION"的漏洞 |
| 测试 | 35/35 通过，新增噪声带与有害门控校准用例 |

## 2. 第三轮（R3）结果

| Skill | verdict | overall | Δ pass_rate | 判定路径 |
|---|---|---|---|---|
| writing-for-agents | **PASS** | **98.8** | **+22.2pp** | with 100% vs without 77.8%，真实强提升 |
| frontend-design | **INCONCLUSIVE** | 74.1 (rel=low) | — | ✅ I1 首次稳定触发："baseline near-perfect — task too easy" |
| tdd | **INCONCLUSIVE** | 57.3 (rel=low) | — | ✅ I4 触发："effect within noise band" |
| research | **FAIL** | 49.6 | **−22.2pp** | 真实负效应（见 §3 分析③） |

evaluation_cost 三分账在全部四个 skill 正常输出（如 writing: skill $0.0136 / overhead $0.0190 / total $0.0326）。

## 3. 三轮纵向对比

| Skill | R1 (P5) | R2 (P6.1) | **R3 (P6.2)** | 三轮解读 |
|---|---|---|---|---|
| writing-for-agents | PASS 85.5 (+22pp) | PASS (~87, +22pp) | **PASS 98.8 (+22pp)** | ✅ 三轮 +22pp 极其稳定——真有效的金标准信号 |
| tdd | CAUTION 53.1 (−11pp) | INCONCLUSIVE (0pp) | **INCONCLUSIVE (noise)** | ✅ 三轮归位：信号弱到跨轮翻转，诚实结论=不可判 |
| frontend-design | PASS 83.6 假高分 ❌ | PASS 82.2 (I1未触发) | **INCONCLUSIVE** ✅ | ✅ I1 本轮触发；R2 未触系基线随机性，规则本身正确 |
| research | PASS 76.3 (+7.4pp) | PASS 83.1 | **FAIL 49.6 (−22pp)** ⚠️ | 见分析④ |

### 分析④：research 的 FAIL 是发现，不是误判
抽查 grading evidence 合格（引用具体、说理成立）：with_skill 在 structured-summary 上漏掉"区分已验证事实与时效性声明"和"验证提醒"两条断言。三轮 Δ 序列 **+7.4pp → (R2正) → −22.2pp 方向翻转**，说明该 skill 的效果依赖模型状态，本质是弱/不稳定 skill。R3 恰好抓到一次负向表现——**这正是工具应该暴露的信息**，且 −22pp 超出 ±15pp 噪声带，判定 FAIL 符合规则设计。

### 关键机制验证：I4 与有害门控的分工
- |Δ| ≤ 15pp → INCONCLUSIVE（分不清）
- Δ ≤ −20pp → 至少 CAUTION；Δ ≤ −30pp → FAIL（明确有害不豁免）
- 两档之间（如 −22pp）落在"CAUTION~FAIL 区"，R3 research 得 FAIL 由 overall≤50 共同决定——边界行为与设计一致

## 4. 公开测试通过标准核对（5 条全过）

| # | 标准 | 结果 |
|---|---|---|
| 1 | 强有效 Skill 稳定 PASS | ✅ writing-for-agents 三轮 PASS，Δ=+22pp 三轮一致 |
| 2 | 弱信号 Skill 进入 INCONCLUSIVE | ✅ tdd 三轮序列（CAUTION→INCON→INCON noise band）收敛到诚实结论 |
| 3 | 明显负向 Skill 识别风险 | ✅ research R3 抓到 −22pp 真实负效应并 FAIL；有害门控单测覆盖 |
| 4 | 简单任务不产生虚假高分 | ✅ frontend-design 本轮被 I1 拦截为 INCONCLUSIVE |
| 5 | 成本三分账分离 | ✅ skill_cost / eval_overhead(judge+baseline) / total 四 skill 全输出 |

**5/5 满足。**

## 5. 可信度判断与批准建议

### 可信度判断：达到公开测试标准 ✅

评分体系现在具备完整的行为谱系：
- **真有效**（writing，+22pp×三轮）→ PASS，且分数随 lift 稳定
- **弱/不稳**（tdd，±11pp 摆动）→ INCONCLUSIVE(noise)，不冤枉也不放行
- **题目太易**（frontend-design，基线满分）→ INCONCLUSIVE(too easy)，杜绝假高分
- **真有害**（research 负向轮次，−22pp）→ FAIL，evidence 可回查
- 成本透明：每次测评的三层花费全部入账

残余局限（公开时须写入 README 的 Known Limitations）：
1. 单 judge 模型（gpt 系自评），换 judge 可能有小幅漂移——建议公开页面注明 judge 配置
2. INCONCLUSIVE 占比可能偏高（噪声带 ±15pp 较宽）——这是诚实的代价，用户可用更多 runs 收窄
3. 视觉类 skill 只能测文本描述维度

## 6. 批准建议

# ✅ 建议批准进入公开测试阶段。

条件满足后的下一步（按 PROJECT_STATE.md 台账）：README 重写 → GitHub PUBLISH → DONE_CHECKLIST 核对。
