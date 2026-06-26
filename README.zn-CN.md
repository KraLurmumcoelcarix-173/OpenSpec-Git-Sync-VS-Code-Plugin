## 中文

> 一个面向非开发者的 VS Code 插件，把"拉取最新 OpenSpec skills 文档"简化成点一个按钮——无需任何 Git 命令知识。

### 一、概述

团队默认使用 Lingma（通义灵码）配置 OpenSpec，规范 skills 文档存放于 `.lingma/skills/`。产品、测试、技术负责人等非开发人员需要查阅最新的 skills 文档，但手动 `git pull`、配置凭证、处理冲突门槛过高。本插件在 VS Code 侧边栏提供图形化面板，让这些角色一键拉取最新文档。

设计原则：

- **只读取，不写回**：MVP 只做拉取，不让非开发者触碰复杂写操作。
- **冲突即备份**：拉取前自动备份本地改动，再强制对齐远程，用户永远拿到干净的最新版，本地改动也不丢。
- **省去命令行**：一键配置 Git 身份与凭证。

### 二、适用人员

| 角色 | 典型用途 |
|------|----------|
| 产品经理 | 拉取最新规范文档进行需求评审 |
| 测试人员 | 查阅最新的 skills 约定与验收标准 |
| 技术负责人 | 同步规范、对照实现进行审查 |
| 任何不熟悉 Git 的协作者 | 安全、零门槛地获取最新 skills |

### 三、典型团队流程

本插件配合标准的「main + feature 分支 + PR」协作模型：

- **main 是唯一的同步来源**。所有人按需通过插件 **Pull**，把 `origin/main` 的最新 skills 同步到本地。Pull 只能在 main 分支进行（插件会拦截非 main 分支的拉取，避免误操作毁掉分支工作）。
- **修改 skills 走 feature 分支 + PR**。需要改 skills 时，创建一个 feature 分支（如 `feat/update-review-spec`），在分支上修改，推送后在 GitHub/GitLab 上发起 Pull Request。
- **合并后回到 main 拉取**。PR 合并进 main 后，协作者切回 main、点 Pull，即可获得最新 skills。


### 四、已实现功能

- **一键 Pull**：从 `origin/main` 同步最新 skills（`fetch` + `reset --hard origin/main`）。拉取后工作区干净、内容处于已提交状态。
- **自动备份**：本地有改动时，拉取前仅备份有改动的文件，命名为 `yyyy-MM-dd-id`（同一天多次备份序号递增，互不覆盖），存于 `.lingma/.backup/`。
- **同步状态判断**：通过对比工作区与 `origin/main` 的差异（`git diff`）判断"已是最新"或"有更新可拉取"，状态图标随情况变化。
- **分支保护**：非 main 分支点 Pull 时拦截并提示，避免 `reset --hard` 毁掉 feature 分支工作。
- **网络感知**：拉取/刷新时若无法连接远程，明确标注"无法连接远程，状态可能过时"，不静默失败。
- **未保存拦截**：Pull 前检测编辑器未保存文件，提示先保存或一键保存并继续。
- **进度与防重复点击**：Pull/Refresh 显示进度提示，操作进行中忽略重复点击。
- **自动刷新**：插件启动时、面板每次变为可见时、以及每次 Pull 完成后，自动刷新状态。
- **一键配置 Git 身份与凭证**：一键设置 `user.name`、`user.email` 并启用凭证存储；已配置时显示当前身份、不重复打扰。
- **中英文切换**：通过设置项 `opensync.language`（`zh-CN` / `en`）切换界面语言。

### 五、核心用法

**首次配置**：点击活动栏插件图标打开面板 → 点「配置 Git 身份与凭证」→ 依次输入用户名、邮箱 → 首次拉取输入一次凭证后自动保存。

**日常拉取**（确保在 main 分支）：打开面板 → 点 **Pull** → 本地若有改动会先自动备份并提示位置 → 拉取完成后状态自动刷新。

**查看状态**：点 **Refresh**，或直接切回插件面板即自动刷新。绿色对勾＝已是最新；下载图标＝有更新可拉取；⚠️＝无法连接远程。

**修改 skills**：切到 feature 分支修改 → 推送 → 在平台发起 PR → 合并后切回 main 点 Pull。

**切换语言**：`Ctrl+,` 打开设置，搜 `opensync`，将 **Opensync: Language** 改为 `en` 或 `zh-CN`，回面板点一次 Refresh 即可。

### 六、未来开发功能（待定）

- 分支切换 / 新建分支 / 推送 feature 分支按钮（轻量开发者支持）
- Push 后一键跳转 PR 页面
- 同步路径配置化（当前固定 `.lingma/skills`）
- 改设置即时生效、备份自动清理
- 凭证方案可选（明文 / 系统凭证管理器）

### 七、开发与调试

```bash
cd .\openspec-skills-sync\
npm install        # 安装依赖
npm test           # 运行测试
npm run compile    # 编译
```

调试：用 VS Code 打开本项目（`openspec-skills-sync`）→「运行和调试」面板选 **Run Extension** → 启动扩展宿主窗口 → 在其中打开一个含 `.lingma/skills/` 的 Git 仓库测试。调试配置见 `.vscode/launch.json`。

### 八、打包与内部分发

本插件通过 `.vsix` 文件在团队内部分发。

打包步骤：

```bash
cd openspec-skills-sync
npm install -g @vscode/vsce   # 首次需安装打包工具
npm run compile               # 编译出最新 dist
vsce package                  # 生成 openspec-skills-sync-<version>.vsix
```

安装步骤（接收方）：

在 VS Code 扩展面板右上角 `...` 菜单 → **Install from VSIX...** → 选择 `.vsix` 文件即可。

更新版本：修改 `package.json` 的 `version`，重新 `vsce package` 生成新包分发即可。

---
