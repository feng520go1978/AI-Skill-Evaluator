# DONE_CHECKLIST — 阶段/项目完成门禁

> 用法：任何阶段宣告 DONE 前，逐项核对。任一 ❌ = 未完成。
> 机械项（可脚本验证）不允许凭记忆打勾。

## A. 代码类阶段

- [ ] 存在正式 commit（非工作区散落改动）：`git log --oneline` 可见且信息完整
- [ ] `npm run build` 通过（tsc 零错误）
- [ ] `npm test` 全绿（当前基线：34 条）
- [ ] 变更已包含在 commit 中（`git status --short` 无未跟踪的关键产物）

## B. 文档与报告

- [ ] 阶段报告落盘至 docs/ 或 08_Reports/
- [ ] PROJECT_STATE.md 台账已更新（阶段行状态、工件路径、日期）
- [ ] 报告结论与 PROJECT_STATE 状态一致（无"报告说完成、状态表说进行中"的矛盾）

## C. 发布类阶段（PUBLISH 专用）

- [ ] GitHub remote 已配置（`git remote -v` 非空）
- [ ] 所有分支/commit 已 push 成功（`git status` 显示 up to date）
- [ ] README 已重写为本项目内容（非上游 agent-skills-eval 原文）
- [ ] License 合规：上游 MIT 保留 + 本项目许可声明
- [ ] package.json 元数据正确（name: ai-skill-evaluator, repository 字段指向真实 remote）

## D. 验证与验收

- [ ] 验收标准逐条核对并有实测数据支撑（引用报告章节）
- [ ] Stop-Escalation 条件未被触发（或已解除并记录）
- [ ] 已知问题/遗留项列入 PROJECT_STATE「未完成事项」而非隐藏

## E. 交接

- [ ] 下一阶段进入条件在 PROJECT_STATE 中明确
- [ ] 跨会话恢复所需信息齐全（新会话只读 PROJECT_STATE 即可接手）
- [ ] 需要用户决策的事项已列出并等待批准

---

## 当前判定记录

| 日期 | 阶段 | 判定 | 未过项 |
|---|---|---|---|
| 2026-08-25 | P6.1 | ⚠️ 代码完成但阶段整体未 DONE | B(报告未commit)、公开测试标准2/4 |
| 2026-08-25 | 项目整体 | ❌ 远未 DONE | PUBLISH 全部、P6.2 全部 |
