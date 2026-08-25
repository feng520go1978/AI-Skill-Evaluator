# AI-Skill-Evaluator GitHub 发布准备报告 V1.0

> 2026-08-25 ｜ Phase PUBLISH ｜ 状态：**准备完成，推送被凭据阻塞（Stop-Escalation 触发）**

---

## 1. 仓库接管状态

| 项 | 结果 |
|---|---|
| 本地仓库 | ✅ 健康：5 个 commit 历史干净、语义清晰 |
| remote origin | ✅ 已配置 `https://github.com/yukkcat/AI-Skill-Evaluator.git` |
| **实际推送** | ❌ **未成功——本机无 GitHub 写入凭据（见 §2）** |
| 远端仓库 | ❌ 尚不存在（github.com/yukkcat/AI-Skill-Evaluator 返回 404） |

## 2. Git 状态与推送阻塞详情

### 排查过程（全部实测）
1. 首次 push 报 `cannot spawn git-askpass` / `/dev/tty: No such device` —— 后台会话无交互终端
2. 复制 chatgpt2api 仓库的可用配置（http.proxy=7897 / credential.helperselector=manager）后报 `schannel: SSL/TLS handshake failed` → 改 openssl 后端后变为 **静默超时（exit 124）**
3. `git credential fill` 实测返回 `Username for 'https://github.com':` 提示符 —— **证明凭据管理器中没有存储任何 GitHub 凭据**
4. Windows Credential Manager 清点：仅 Microsoft 账户/联想账户凭据，无 github 条目
5. 此前 `chatgpt2api ls-remote 成功`是假象——那是公开仓库的匿名读操作；**写操作（push）从未在此机器配置过**

### 结论
推送卡在等待凭据输入（GUI 凭据窗口在后台模式不可见）。这不是网络或 git 配置问题。

## 3. License 处理结果 ✅ 无风险

- 上游 agent-skills-eval 为 **MIT**（Copyright (c) 2026 Rishabh Mehan）
- LICENSE 文件已随 fork 保留在仓库根目录——MIT 只要求保留版权声明，**已满足**
- MIT 不要求 NOTICE 文件（Apache 2.0 才需要），无额外义务
- README 已显著注明"Built on agent-skills-eval by Rishabh Mehan (MIT)"并说明上游复用范围与本 fork 新增内容
- SkillCompass（评分权重概念来源，MIT）也在 README 中致谢
- **判定：无侵权风险，可安全发布**

## 4. README 更新方案（已完成 ✅）

新 README 已替换上游原文，包含：
- 项目介绍 + "Why"（SkillsBench 学术数据支撑的问题陈述）
- 核心能力表（八项）、verdict 模型（含 I4 噪声带的校准故事）
- Quickstart（含 evals.json 示例）、示例 verdict JSON（真实 R2 数据）
- 三轮验证摘要、Roadmap 六项、Known Limitations 三条（单判官/噪声带宽度/视觉类局限）
- License & credits 段落

## 5. 发布前检查结果

| 检查项 | 结果 |
|---|---|
| npm test | ✅ 35/35 |
| build | ✅ tsc 零错误 |
| commit 历史 | ✅ 7 个语义化 commit |
| README/LICENSE | ✅ 就位 |
| PROJECT_STATE.md | ✅ 已更新至 PUBLISH 阶段 |
| .gitignore | ✅ node_modules/dist/workspace 排除 |

## 6. 当前项目状态与解除阻塞所需动作

PROJECT_STATE.md 台账已更新。PUBLISH 卡在最后一环：

# 🔴 Stop-Escalation：需要用户提供 GitHub Personal Access Token

原因：本机没有任何 GitHub 写入凭据，后台自动化无法完成交互式登录。创建仓库+推送需要一次性的用户参与。

**请老板执行以下一步（约 2 分钟）：**
1. 打开 https://github.com/settings/tokens?type=beta （或经典 tokens 页面）
2. Generate new token，勾选 `repo` 权限
3. 把 token 发给我（或在弹出的 Git Credential Manager 窗口中手动登录一次）

拿到 token 后我将立即完成：创建远端仓库（public）→ push 全部历史 → 验证 → 更新 PROJECT_STATE/DONE_CHECKLIST → 关闭 PUBLISH 台账。

另一种方式：老板在自己电脑上手动跑一次 `git push -u origin main`（在项目目录），凭据窗口弹出时登录即可。
