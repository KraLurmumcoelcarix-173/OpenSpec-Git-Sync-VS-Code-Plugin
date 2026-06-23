# OpenSpec Skills Sync VS Code 插件 - 提案（重置版）

## 一、项目背景

### 1.1 痛点

在 OpenSpec 研发工作流中，团队默认使用 Lingma（通义灵码）配置 OpenSpec，规范 skills 文档存放于 `.lingma/skills/` 目录。非开发人员（产品经理、测试、技术负责人等）需要获取最新的 skills 文档进行查阅与评审，但由于不熟悉 Git 命令，无法方便地拉取远程更新。手动 `git pull`、配置 Git 凭证、处理冲突，对没接触过 Git 的人门槛过高。

### 1.2 目标

通过 VS Code 插件提供图形化按钮，让非开发者**一键拉取** `.lingma/skills/` 下的最新文档，无需任何 Git 命令知识。

**核心设计原则：**

- MVP 只做「拉取」，不做提交/推送，避免非开发者触碰复杂的 Git 写操作。
- 拉取前自动备份本地文件，冲突时优先「备份 + 强制拉取」，不让非开发者陷入手动解决冲突的泥潭。
- 帮非开发者一键完成 Git 身份与凭证配置，省去命令行步骤（凭证为用户级明文存储，见3.2风险说明）。

### 1.3 同步范围

仅同步 `.lingma/skills/` 目录（路径可配置）。其余目录暂不在 MVP 范围内。

> 路径来源：团队工作流默认在 Lingma 中配置 OpenSpec，skills 文档位于 `.lingma/skills/`。开发时以可配置常量 `opensync.syncPath` 体现，默认 `.lingma/skills`。

## 二、核心工作流程

### 场景 A：一键 Pull（主路径，面向非开发者）

```
用户点击「Pull」按钮
        ↓
检测本地 .lingma/skills/ 是否有未提交改动
        ↓
   ┌──────────────────┐
   │ 有本地改动？      │
   └────┬─────────────┘
     是 │ 否
   ┌────┘ └──────────┐
   ↓                 ↓
备份本地目录     直接 git pull
(yyyy-MM-dd-id) origin <branch>
   ↓                 ↓
强制拉取远程     更新 skills/
git fetch +          ↓
git reset --hard 刷新状态面板
origin/<branch>
   ↓
提示：本地原文件已备份至
.lingma/.backup/<yyyy-MM-dd-id>/
        ↓
   ┌──────────────────┐
   │ 拉取是否冲突/失败？│
   └────┬─────────────┘
        ↓ 是
   仅提示用户：「检测到冲突，
   已保留备份。如需手动处理，
   请联系开发或查看备份目录」
   （不强制用户处理）
```

### 备份策略

- 触发条件：本地 `.lingma/skills/` 存在未提交改动时，在执行强制拉取前先备份。（仅备份有改动的文件，非整个目录）
- 备份路径：`.lingma/.backup/<yyyy-MM-dd-id>/`
- 命名格式：`yyyy-MM-dd-id`，其中 `id` 为当天递增序号或短时间戳，避免同一天多次备份覆盖（如 `2026-06-23-01`、`2026-06-23-02`）。
- 备份目录加入 `.gitignore`，不污染仓库。

> 设计意图：非开发者没有 Git 冲突处理经验，强制让他们 rebase / merge 风险高、体验差。改为「先备份、再强制对齐远程」，用户的本地改动不会丢（在备份里），同时永远能拿到干净的最新版。冲突只提示、不阻塞。

## 三、插件功能设计                                                          

### 3.1 Side Panel 布局

```
┌────────────────────────────────────────┐
│ 🔧 OpenSpec Skills Sync                │
├────────────────────────────────────────┤
│  📊 状态                               │
│  ─────────────────                     │
│  分支：main                            │
│  远程：up to date ✓                    │
│  同步路径：.lingma/skills/              │
│  本地改动：无                           │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🔽 Pull (拉取最新 skills)        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🔄 Refresh (刷新状态)            │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ⚙️ 首次使用：                         │
│  ┌──────────────────────────────────┐  │
│  │ 🔑 配置 Git 身份与凭证            │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 3.2 按钮详细行为

#### 按钮 1：Pull（拉取最新 skills）

```
执行流程：
1. 解析仓库根与当前分支
2. 检测是否存在origin 远程
   - 无 origin → 提示「未检测到远程仓库 origin, 请联系开发配置」并终止
3. 检测 .lingma/skills/ 是否有未提交改动
   - 有 → 备份到 .lingma/.backup/<yyyy-MM-dd-id>/
4. git fetch origin <branch>
5. git reset --hard origin/<branch>   # 强制对齐远程，本地改动已备份
6. 刷新状态面板
7. 若有备份 → 提示「本地原文件已备份至 .backup/<...>」

异常处理（按失败环节区分）：
- fetch 阶段认证失败 → 「Git 认证失败，请点击『配置 Git 身份与凭证』」
- fetch 阶段网络错误 → 「无法连接远程仓库，请检查网络」
- reset 阶段失败（如远程分支不存在）→ 「远程分支不存在，请联系开发确认分支名」
- 任何失败都保留备份，不强制用户处理
```

#### 按钮 2：Refresh（刷新状态）

```
执行流程：
1. git fetch origin <branch>（静默）
2. git status --porcelain -- .lingma/skills/ 解析本地改动
3. git rev-list --count --left-right @{u}...HEAD 计算 ahead/behind
4. 更新状态面板
```

#### 按钮 3：配置 Git 身份与凭证（首次使用）

```
执行流程：
1. 弹出输入框，依次填写：
   - 用户名 (user.name)
   - 邮箱 (user.email)
2. 执行（局部配置，仅作用于当前仓库，非全局）：
   git config user.name "<输入>"
   git config user.email "<输入>"
3. 配置凭证存储（明文，用户级）：
   git config credential.helper store
   # 凭证将明文写入用户主目录 ~/.git-credentials，
   # 此为用户级配置（非局部），首次拉取输入后永久保存，免重复输入
4. 提示「配置完成，首次拉取输入凭证后将自动保存」
```

> 凭证存储说明（按团队要求采用明文存储）：
> - `user.name` / `user.email` 仅是提交身份信息。
> - 凭证（密码 / token）采用 `credential.helper store`，**明文写入用户主目录** `~/.git-credentials`，首次输入后永久保存、不过期。
> - 注意：`store` 为**用户级配置**，会影响该用户对所有仓库的凭证行为，无法限定为单仓库局部。
>
> ⚠️ 安全风险提示：`store` 方案下凭证以明文形式存储于本地磁盘，任何能访问该用户文件系统的人都可读取。建议：
> - 优先使用**有限权限的访问 Token**（如只读、仅限本仓库），而非账号主密码；
> - 在共享 / 公共设备上避免使用此方案；
> - 如后续安全要求提高，可切换为 `cache --timeout=N`（内存缓存、不落盘）方案。

### 3.3 状态面板字段

| 字段 | 说明 | 示例 |
|------|------|------|
| 分支 | 当前 Git 分支 | main |
| 远程状态 | 与远程的同步状态 | up to date ✓ / behind 2 / 拉取失败 ⚠️ |
| 同步路径 | 当前同步的目录 | .lingma/skills/ |
| 本地改动 | skills 目录是否有未提交改动 | 无 / 3 个文件 |

## 四、技术实现方案

### 4.1 技术栈与 package.json（节选）

```json
{
  "name": "openspec-skills-sync",
  "displayName": "OpenSpec Skills Sync",
  "version": "0.1.0",
  "engines": { "vscode": "^1.80.0" },
  "activationEvents": ["onView:opensync.panel"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      { "command": "opensync.pull",     "title": "Pull Latest Skills" },
      { "command": "opensync.refresh",  "title": "Refresh Status" },
      { "command": "opensync.setupGit", "title": "Configure Git Identity & Credential" }
    ],
    "viewsContainers": {
      "activitybar": [
        { "id": "opensync-sidebar", "title": "OpenSpec Skills Sync", "icon": "media/icon.svg" }
      ]
    },
    "views": {
      "opensync-sidebar": [
        { "type": "tree", "id": "opensync.panel", "name": "Sync Panel" }
      ]
    },
    "configuration": {
      "title": "OpenSpec Skills Sync",
      "properties": {
        "opensync.language": {
          "type": "string",
          "enum": ["zh-CN", "en"],
          "default": "zh-CN",
          "description": "界面与提示语言 / UI and prompt language"
        },
        "opensync.syncPath": {
          "type": "string",
          "default": ".lingma/skills",
          "description": "需要同步的目录（相对仓库根）"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "webpack",
    "watch": "webpack --watch"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0"
  }
}
```

> 注：MVP 使用 TreeView；`contributes` 为单一对象，`configuration` 与 `commands`/`views` 同级（切勿写成两个 `contributes`，JSON 重复键会相互覆盖）。

### 4.2 目录结构

```
openspec-skills-sync/
├── src/
│   ├── extension.ts          # 主入口，注册命令
│   ├── syncProvider.ts       # TreeView 数据提供者（状态面板）
│   ├── gitHandler.ts         # Git 操作封装（pull / status / 备份 / 配置）
│   ├── backup.ts             # 备份逻辑（yyyy-MM-dd-id）
│   └── i18n.ts               # 中英文文案
├── media/
│   └── icon.svg
├── package.json
└── README.md
```

### 4.3 实现注意事项

- **命令调用用 `execFile` 而非 `exec`**：以数组传参，避免 shell 对中文、引号、特殊字符的转义问题。
- **同步路径可配置**：`opensync.syncPath` 默认 `.lingma/skills`，开发时以常量读取，便于后续调整。
- **强制拉取前必须先备份**：`git reset --hard` 会丢弃本地改动，备份是唯一的安全网，顺序不能颠倒。
- **备份目录 `.gitignore`**：`.lingma/.backup/` 不纳入版本控制。
- **凭证方案**：按团队要求默认 `credential.helper store`（明文落盘、局部）。已在 3.2 标注安全风险与缓解建议。
- **ahead/behind 时效性**：Refresh 与 Pull 前先 `git fetch`，保证状态准确。

## 五、用户体验流程

### 5.1 首次使用

1. 安装插件，打开「OpenSpec Skills Sync」侧边栏
2. 点击「配置 Git 身份与凭证」，填写用户名、邮箱
3. 首次拉取时输入一次凭证，之后自动保存

### 5.2 日常拉取（非开发者评审场景）

1. 打开侧边栏，点击「Pull」
2. 若本地动过文件 → 插件自动备份后强制拉取，提示备份位置
3. 若本地干净 → 直接拉取最新 skills
4. 在编辑器中查阅最新 `.lingma/skills/` 文档
5. 全程无需任何 Git 命令

## 六、待办与未来规划（Phase 2+）

以下为本 MVP **不做**、留待后续评估的功能：

- **提交与推送（Commit / Push）**：让非开发者把评审意见写回远程。需配套更完善的冲突兜底。
- **完整 OpenSpec 同步**：MVP 仅同步 `.lingma/skills/`，后续扩展到 `changes/`、`specs/` 等其它目录。
- **分支命名规范与校验**：团队统一 `feat/`、`fix/` 等前缀约定，及一键创建规范分支。
- **提交消息模板**：约定式提交（Conventional Commits）中文模板。
- **一键初始化**：新任务一键生成 proposal.md / design.md / tasks.md。
- **状态颜色标识**：绿（最新）/ 黄（落后）/ 红（失败）。
- **凭证方案升级**：如安全要求提高，从 `store`（明文）切换为 `cache`（内存缓存）或系统凭证管理器（如 Windows Credential Manager / macOS Keychain）。
- **备份清理**：定期清理过期备份目录，避免堆积。
- **国际化升级**：从手动 `i18n.ts` 迁移到官方 `@vscode/l10n` API， 规范化字符串 bundle。

## 七、部署与使用

```bash
# 1. 安装依赖
npm install

# 2. 打包
npm run compile

# 3. 本地测试（F5 打开扩展开发宿主窗口）

# 4. 打包成 .vsix
npm install -g vsce
vsce package
```

安装方式：企业内部通过 VS Code 企业扩展市场部署；个人使用打包 .vsix 手动安装。

## 八、总结

**MVP 范围（极简）：**

- ✅ Pull 按钮：一键拉取 `.lingma/skills/`，拉取前自动备份本地改动
- ✅ 备份机制：`yyyy-MM-dd-id` 格式，强制拉取不丢本地文件
- ✅ Refresh 按钮：刷新分支 / 远程 / 本地改动状态
- ✅ 配置 Git 身份与凭证按钮：一键设好 user.name / user.email（局部）+ credential.helper store（明文）
- ✅ 中英文切换

**核心价值：** 把非开发者参与 OpenSpec 的门槛降到「点一个按钮」，冲突不再需要他们处理，凭证配置不再需要敲命令。