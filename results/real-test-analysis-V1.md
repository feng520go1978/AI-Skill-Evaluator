# 第一批真实 Skill 测试结果与判读 V1.0

> 2026-08-25 ｜ 环境：V0.1 + chatgpt2api 网关（model=auto）｜ 每skill 3 eval × 双模式 × runs3
> 成本：0 元（本地网关）

## 一、四 skill 结果汇总

| Skill | capability | lift | cost | speed | stability | security | **overall** | verdict | Δpass_rate |
|---|---|---|---|---|---|---|---|---|---|
| writing-for-agents | 89 | **100** | 88 | 100 | 37 | 100 | **85.5** | PASS | **+22.2pp** |
| frontend-design | 100 | 40 | 91 | 99 | 100 | 100 | **83.6** | PASS | **±0pp** |
| research | 89 | 62 | 100 | 85 | 37 | 100 | **76.3** | PASS | +7.4pp |
| **tdd** | 78 | **0** | 100 | 97 | **0** | 100 | **53.1** | CAUTION | **−11.1pp** |

## 二、关键发现（对照预登记假设）

### 发现1：tdd 热门 skill 实测为负资产 → 工具抓到了真问题 ✅
75.9 万安装的热门 skill，实测 lift 为负。抽查 evidence 显示原因真实：
- with_skill 输出漏掉了空字符串测试（without 反而覆盖了）
- with_skill 的回答被 SKILL.md 流程模板带偏，反而少了"这些测试应先失败"的明确声明

**这不是工具误报，是 LLM 判官逐断言评出的真实差异。** "热门≠有效"假设得到证实——这正是本工具的核心卖点。

### 发现2：H1 成立一半——判官对结构化输出偏袒存在但可控 ⚠️
writing-for-agents lift=100 有偏袒嫌疑（skill 本身就教"结构化写作"，判官断言也偏爱结构）。但 evidence 引用具体，未发现无中生有。

### 发现3：H2 部分成立——frontend-design 测出"假满分" 🔴 最大问题
Δpass_rate = **0**（with/without 全部通过），但 lift 只给 40 分、capability 100。
- 判官 evidence 质量其实很好（引用了具体色值 #F5F0E6 等）
- 但**基线全过 → 天花板效应**：我的 evals 写得太容易，裸模型就能过，测不出增量
- 结论：**不是评分引擎错，是测试题设计缺陷**——好评测需要"裸模型会挂"的题目

### 发现4：H3 不成立但 stability 维度信号混杂 ⚠️
三个 skill stability 都是 37（stddev 0.16），tdd 是 0（0.31）。runs=3 下判官抖动确实显著拉低分数，但它同时抓住了 tdd 的真不稳定。**方向正确，阈值需校准**（0.16 的 stddev 是否该罚到 63 分存疑）。

## 三、Acceptance Criteria 回答

### 1. 当前评分体系是否可信？
**方向可信，数值需校准。** 它成功区分了：负资产(tdd, CAUTION) / 弱有效(research) / 强有效(writing)。evidence 抽查无敷衍。但 frontend-design 的假高分暴露天花板盲区。

### 2. 哪些评分维度需要调整？
| 维度 | 问题 | 建议 |
|---|---|---|
| lift | 基线全过时给 40 分中性分，掩盖"测不出"与"没提升"的区别 | Δ=0 且基线 pass_rate≥0.9 时应输出"INCONCLUSIVE（题目太易）"而非低分 |
| stability | stddev 0.16 → 扣 37 分过狠 | 归零阈值从 0.25 放宽到 0.35，或改用"3轮中位数一致性" |
| cost | token 计入的是 target 调用，judge 调用的成本没算进去（判官也是钱） | V0.2 把 judge tokens 并入总账 |

### 3. 是否需要修改权重？
微调而非重构：
- stability 15%→10%，把 5% 让给 capability（能力仍是用户最关心的）
- 其余维持。理由：tdd 案例证明 lift+stability 组合已能识别负资产，权重框架本身工作正常。

### 4. 是否可以进入公开测试阶段？
**不可以（Stop-Escalation 触发一项）。**
理由：frontend-design 案例证明当前题目设计流程会产生天花板盲区，公开后第一批用户若拿简单题自测会得到误导性满分。公开前置条件：
1. 实现 INCONCLUSIVE 标记（基线≥90% 通过时）
2. 种子题库按"裸模型通过率 30-70%"难度过滤
3. stability 权重调整 + 重跑本批验证排序不变

预计 1-2 人日可达成。

## 四、人工盲评 vs 机器分对照

| Skill | 我的预判 | 机器判定 | 一致? |
|---|---|---|---|
| tdd | 高有效（热门工程skill） | CAUTION 负lift | ❌ 我错机器对* |
| research | 中等 | PASS 76 弱lift | ✅ |
| writing-for-agents | 低-中（元技能难测） | PASS 85 强lift | ❌ 机器更乐观 |
| frontend-design | 测不出（视觉类） | PASS 84 但 Δ=0 | ✅ 方向一致（都认为测不出增量）|

*tdd 我预判失误恰好说明直觉不可靠、工具有价值；但也可能是判官偏差，需换 judge 模型复验。

## 五、下一步

1. 修 INCONCLUSIVE + stability 权重（1-2 人日）
2. 用第二个 judge 模型复跑 tdd，排除判官单点偏差
3. 重设计 frontend-design 题目（提高难度至裸模型会挂）
4. 以上完成后重跑本批，确认排序稳定 → 再进公开阶段
