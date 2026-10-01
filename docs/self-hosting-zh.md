# AFFiNE 中文二次开发与自部署说明

## 当前中文改动

- 新安装默认使用简体中文 `zh-Hans`。
- 已保存过语言偏好的用户继续使用原来的语言，不会被强制覆盖。
- 文档编辑器的 `/` 菜单、分组标题、搜索匹配、常用 AI 操作和日期操作会按中文界面显示。
- 无界画布素材面板的搜索框和素材分类也会按中文界面显示。
- 英文名称仍保留为内部标识，避免快捷键、遥测、测试和插件配置发生冲突。

## 本地二次开发

项目要求 Node.js 22.12.x、Yarn 4 和 Rust。Windows 开发前建议开启开发者模式，以便 Git 创建符号链接。

```powershell
corepack enable
yarn install
yarn dev -p @affine/web
```

只改编辑器和界面时，直接运行 Web 客户端即可，数据保存在浏览器本地。需要账号、同步、协作或 AI 时，再启动本地服务：

```powershell
Copy-Item .docker/dev/compose.yml.example .docker/dev/compose.yml
Copy-Item .docker/dev/.env.example .docker/dev/.env
docker compose -f .docker/dev/compose.yml up -d
yarn affine @affine/server-native build
Copy-Item packages/backend/server/.env.example packages/backend/server/.env
yarn affine server init
yarn affine server dev
```

## Docker 自部署

### 1Panel 快速安装

在 **1Panel 终端**粘贴这一行。脚本会自动检测公网 IP、拉取已发布的中文镜像、生成数据库密码、写入配置并启动服务：

~~~bash
curl -fsSL https://raw.githubusercontent.com/iszkq/AFFiNE/canary/.docker/selfhost/install-1panel.sh -o /tmp/affine-install.sh && bash /tmp/affine-install.sh
~~~

完成后打开终端打印的地址。如果无法访问，在 **1Panel → 防火墙** 放行 TCP 3010。脚本不会覆盖已有的 /opt/affine 部署；镜像拉取中断时可再次运行同一命令继续启动。

如果已经有 HTTPS 域名，则把域名传给脚本，再在 1Panel 网站中反向代理到 http://127.0.0.1:3010：

~~~bash
curl -fsSL https://raw.githubusercontent.com/iszkq/AFFiNE/canary/.docker/selfhost/install-1panel.sh -o /tmp/affine-install.sh && bash /tmp/affine-install.sh https://notes.example.com
~~~

脚本源码见 [install-1panel.sh](../.docker/selfhost/install-1panel.sh)。下面保留手动部署步骤，供需要自定义配置时使用。

`.docker/selfhost/compose.yml` 默认拉取上游镜像 `ghcr.io/toeverything/affine:stable`，不会包含本仓库的中文化和自定义模型发现改动。部署二次开发版本时，先构建自己的镜像，再设置 `AFFINE_IMAGE`；服务容器和迁移容器必须使用同一镜像版本。

### 在 GitHub 构建镜像（推荐给 1Panel）

在仓库的 **Actions → Build Self-hosted Image → Run workflow** 中选择 `canary` 并启动。工作流会复用项目原有的前端、Rust Native、服务端和多架构 Docker 构建流程，成功后发布到 GitHub Container Registry（GHCR）：

- `ghcr.io/iszkq/affine:zh-byok`：便于日常更新，会被下一次成功构建覆盖。
- `ghcr.io/iszkq/affine:sha-<完整提交 SHA>`：固定版本，适合生产部署和回滚。

首次发布后到 GitHub 仓库的 **Packages → affine → Package settings** 将镜像设为 Public，1Panel 才能免登录拉取。如果保持 Private，则在 1Panel 中添加 `ghcr.io` 仓库凭据。GitHub 登录令牌不要写入 Compose 文件。工作流成功只表示镜像已发布，还需要在 1Panel 上部署；不要使用上游 `stable` 镜像。

在 1Panel 服务器的文件管理器中创建 `/opt/affine`，将本仓库 `.docker/selfhost/compose.yml` 上传为 `/opt/affine/compose.yml`，将 `.docker/selfhost/config.json.example` 上传为 `/opt/affine/config/config.json`。创建 `/opt/affine/.env`：

```dotenv
AFFINE_IMAGE=ghcr.io/iszkq/affine:sha-<完整提交 SHA>
```

把 `config/config.json` 中的 `server.externalUrl` 改为最终访问的 `https://你的域名`。然后在 **1Panel → 容器 → 编排** 中从 `/opt/affine/compose.yml` 创建并启动编排。如果 1Panel 的编排编辑器未加载同目录 `.env`，就在编排内容里把两处 `image: ${AFFINE_IMAGE:-...}` 都改成相同的 `ghcr.io/iszkq/affine:sha-<完整提交 SHA>`。

如果你的 1Panel 版本不提供从文件导入，可在 1Panel 终端运行：

```bash
cd /opt/affine
mkdir -p data/storage data/postgres
docker compose -f compose.yml pull
docker compose -f compose.yml up -d
docker compose -f compose.yml ps
docker compose -f compose.yml logs --tail=100 affine_migration affine
```

随后在 1Panel 的网站管理中为该域名配置 HTTPS 和反向代理，目标为 `http://127.0.0.1:3010`。首次安装应先确认迁移任务成功，再访问站点。更新时先备份 `/opt/affine/data` 与 `/opt/affine/config`，修改 `.env` 中的固定镜像标签后重新拉取并启动。

### 注册、访客和存储配置

`config/config.json` 控制注册和访客入口。示例配置已经关闭未登录访客的本地 Demo 工作区：

```json
{
  "auth": {
    "allowSignup": true,
    "allowSignupForOauth": true
  },
  "flags": {
    "allowGuestDemoWorkspace": false
  }
}
```

把 `auth.allowSignup` 改成 `false` 会关闭邮箱注册，把 `auth.allowSignupForOauth` 改成 `false` 会阻止 OAuth 自动注册新账号；已有账号仍可登录。修改后重启 `affine` 容器。`flags.allowGuestDemoWorkspace=false` 后，未登录访问根路径会进入登录页，登录后才进入自己的工作区，不再自动创建 Demo 工作区。已有浏览器本地 Demo 工作区不会被服务器删除，可在工作区列表中手动删除一次。

附件和头像默认保存到宿主机 `/opt/affine/data/storage`，PostgreSQL 数据保存到 `/opt/affine/data/postgres`，配置保存到 `/opt/affine/config`。这些目录来自 Compose 的挂载：

```yaml
./data/storage:/root/.affine/storage
./data/postgres:/var/lib/postgresql/data
./config:/root/.affine/config
```

可以把左侧的宿主机路径改成其他磁盘目录，例如 `/volume1/docker/affine/storage:/root/.affine/storage`；迁移前先停服务并完整复制原目录，确保新目录权限可被 Docker 访问。

自托管免费计划的单文件大小、总存储和 Copilot 次数来自内置 entitlement 配额，不是 `config.json` 中的开关；改宿主机目录只会改变可用磁盘位置，不会提高应用层配额。需要更高配额时使用对应的自托管授权/计划，或在源码的 `affine_core` access-control 配额实现中调整后重新构建镜像。BYOK 使用你自己的模型接口时，不消耗 AFFiNE 云端套餐次数，但仍受自托管实例的访问控制和存储配额约束。

在 Linux amd64 构建机上，可按本仓库的 `.github/workflows/build-images.yml` 顺序构建单架构镜像（需要 Node 22、Yarn 4、Rust 和 Docker）：

```bash
corepack enable
yarn install
yarn workspace @affine/server-native build --target x86_64-unknown-linux-gnu
mv packages/backend/native/server-native.node packages/backend/native/server-native.x64.node
yarn affine @affine/web build
yarn affine @affine/admin build
yarn affine @affine/mobile build
yarn workspace @affine/server build
yarn config set --json supportedArchitectures.cpu '["x64"]'
yarn config set --json supportedArchitectures.libc '["glibc"]'
yarn workspaces focus @affine/server --production
yarn workspace @affine/server prisma generate
mv node_modules packages/backend/server/
docker build -f .github/deployment/node/Dockerfile -t affine-custom:zh-byok .
export AFFINE_IMAGE=affine-custom:zh-byok
```

如果在另一台服务器运行 Compose，先把镜像推送到你自己的镜像仓库，并在服务器上设置 `AFFINE_IMAGE` 为实际标签。PowerShell 设置方式：`$env:AFFINE_IMAGE = 'ghcr.io/iszkq/affine:zh-byok'`。单独启动上游 `stable` 镜像只能验证原版，不会验证这次代码改动。

先准备持久化目录和配置文件：

```powershell
New-Item -ItemType Directory -Force .docker/selfhost/config, .docker/selfhost/data/storage, .docker/selfhost/data/postgres
Copy-Item .docker/selfhost/config.json.example .docker/selfhost/config/config.json
```

编辑 `.docker/selfhost/config/config.json`，至少把 `server.externalUrl` 改成用户实际访问的 HTTPS 地址。然后启动：

```powershell
docker compose -f .docker/selfhost/compose.yml pull redis postgres
docker compose -f .docker/selfhost/compose.yml up -d
docker compose -f .docker/selfhost/compose.yml logs -f affine
```

生产环境建议在前面放 Nginx、Caddy 或 Traefik，负责 TLS 和域名访问；不要把 Postgres 或 Redis 端口直接暴露到公网。升级前先备份 `.docker/selfhost/data/postgres`、`.docker/selfhost/data/storage` 和 `.docker/selfhost/config`，升级后检查迁移容器日志。

## 自定义 AI 服务商（BYOK）

自托管版本可以直接使用你自己的 API，不需要 AFFiNE 的商业套餐。复制示例配置后，确认以下配置已经开启：

```json
{
  "copilot": {
    "enabled": true,
    "byok": {
      "enabled": true,
      "allowCustomEndpoint": true,
      "allowPrivateEndpoint": false,
      "allowedProviders": ["openai", "anthropic", "gemini", "fal"]
    }
  }
}
```

启动后进入“设置 → 工作区 → AI 自带密钥（BYOK）”，填写服务商、API Key 和 API Base URL。支持 OpenAI 兼容的中转站、代理网关和自建网关；通常把地址填写到 `/v1`，例如 `https://api.example.com/v1`，并选择“Chat Completions API”或“Responses API”与中转站实际协议一致。点击“获取模型列表”批量选择，或手动添加任意模型 ID，按模型实际能力调整用途，再点击“测试连接”。连接和模型检查通过后才能保存。API Key 只会按你选择的“服务端”或“本地”存储方式保存。

中转站需要至少兼容对应的 OpenAI 接口，并允许服务端发起请求。模型名称要填写中转站实际支持的模型 ID；如果中转站只支持 Chat Completions，请不要选择 Responses API。Anthropic、Gemini 和 FAL 默认使用各自服务商协议，自定义 API Base URL 目前主要用于 OpenAI 兼容服务。

当前服务商支持情况：

| 服务商 | API Base URL | 模型选择 |
| --- | --- | --- |
| OpenAI | 官方地址或 OpenAI 兼容中转站 | 官方目录；自定义端点可从 `/models` 获取，也可手动填写模型 ID |
| Anthropic | 官方 Anthropic 接口 | 内置模型目录 |
| Gemini | 官方 Gemini 接口 | 内置模型目录 |
| FAL | 官方 FAL 接口 | 内置模型目录 |

自定义端点支持点击“获取模型列表”请求 `<API Base URL>/models`，例如 `https://api.example.com/v1/models`。请求由 AFFiNE 服务端使用当前填写的 API Key 发起，只把模型 ID 和名称返回到界面。返回的模型不会按 AFFiNE 内置目录筛选，也不会只显示前几个；可以搜索、批量勾选加入，并按实际能力选择用途。也可以手动填写任意模型 ID。中转站如果不提供 `/models`、需要特殊请求头或返回格式不兼容，界面会保留手动添加入口。保存前仍需点击“测试连接”，验证实际协议和模型能力。

如果 AI 服务部署在内网或本机，`allowPrivateEndpoint` 必须为 `true`。公开部署时建议只允许可信的 API 地址，并在反向代理和防火墙层限制出站访问。

## 功能冲突和部署注意事项

| 功能组合 | 可能的问题 | 建议 |
| --- | --- | --- |
| 本地优先 + 云端同步 | 离线编辑会在恢复连接后合并；同一段内容同时修改时可能出现合并结果与预期不同。 | 重要升级前先导出或备份，避免同时修改同一块内容。 |
| Copilot + BYOK 自定义端点 | AI 菜单可能正常显示，但密钥、模型或端点不兼容时请求会失败。 | 不使用 AI 时关闭 `copilot.enabled`；使用时统一配置可用模型和端点。 |
| Embedded indexer + 大数据量 | 内置索引器会消耗应用容器 CPU、内存和磁盘。 | 小团队可保留；数据量增长后监控资源并单独规划索引服务。 |
| `stable` 镜像标签 + 数据库迁移 | 镜像更新可能带来不可逆迁移或配置变化。 | 生产环境固定具体版本或 digest，升级前完整备份并先在测试环境验证。 |
| `externalUrl` + 反向代理 | 地址、协议或子路径不一致会导致 OAuth 回调、分享链接和附件地址错误。 | 让 `externalUrl` 与浏览器最终访问地址完全一致。 |
| 未配置 SMTP / OAuth | 密码重置、邀请邮件或第三方登录不可用。 | 上线前按需配置 SMTP 和 OAuth，并使用真实域名测试回调。 |
| 默认 Compose 数据库认证 | 示例 Compose 使用 `POSTGRES_HOST_AUTH_METHOD=trust`，适合本地快速启动，不适合直接作为公网生产配置。 | 生产环境设置 `POSTGRES_PASSWORD`，把应用的 `DATABASE_URL` 改成带密码的连接串，并只允许应用网络访问数据库。 |

## 升级顺序

1. 固定当前 AFFiNE 镜像版本并备份三个持久化目录。
2. 在测试环境启动新版本，等待迁移任务成功。
3. 验证登录、文档读写、附件、分享链接、同步和 AI。
4. 再切换生产流量，并保留旧镜像用于回滚判断。
