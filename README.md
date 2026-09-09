# LX Music Desktop Fork

Electron/Vue 桌面客户端的本地二开仓。当前 fork 在上游基础上加入听歌统计与跨设备 statistics 同步，并停用私有分支的自动更新检查。版本、脚本与依赖以 `package.json` 为准；上游发行说明不代表本 fork 已发布。

本机家族入口：`D:\ClaudeSpace\Project\lx-music\docx\README.md`。`gitea` 保存当前 fork，`deploy` 是既有部署分支，`origin` 仅作上游基线；开始前分别检查分支、状态和 remote。

## 开发与验证

需要 Node.js 22+ 和 npm：

```powershell
npm.cmd ci
npm.cmd run dev
```

基本门禁：

```powershell
npm.cmd run lint
npx.cmd tsc -p src/main/tsconfig.json --noEmit
npx.cmd tsc -p src/renderer/tsconfig.json --noEmit
```

主题、主进程、渲染进程、歌词窗口和打包路径相互独立；按变更范围增加对应 TypeScript/构建检查。打包前递增版本并更新 CHANGELOG，产物只按工作区规范归档；`publish:*` 脚本会产生外部发布副作用，不得在无明确授权时运行。

## Fork 边界

- statistics 使用按设备分桶的状态型 CRDT：同设备逐键取 `max`，跨设备展示时求和。
- 改 feature version、同步握手、备份字段或列表格式时，同步核对 Mobile、Sync Server、Mineradio 和 Mineradio Mobile。
- 私有 fork 禁用自动更新不等于删除上游更新代码；恢复前必须确认不会把用户导向不兼容上游包。
- 本地开放 API 和自定义音源都可能处理用户数据或第三方链接，只在用户授权与平台规则范围内使用。

## 用户数据

默认数据目录：Linux 使用 `$XDG_CONFIG_HOME/lx-music-desktop` 或 `~/.config/lx-music-desktop`，macOS 使用 `~/Library/Application Support/lx-music-desktop`，Windows 使用 `%APPDATA%/lx-music-desktop`。Windows 程序目录存在 `portable` 时可使用便携数据目录。配置、歌单、Cookie 和同步凭据不得提交到仓库。

## 文档

- [CHANGELOG](CHANGELOG.md)：fork 变更位于 `Unreleased`，其后为上游历史。
- [上游源码使用说明](https://lyswhut.github.io/lx-music-doc/desktop/use-source-code)与[常见问题](https://lyswhut.github.io/lx-music-doc/desktop/faq)。
- [LICENSE](LICENSE)：Apache-2.0；以下使用限制沿用上游 README 的补充说明。

## 许可与使用限制

本项目不拥有使用过程中产生的第三方版权数据。在线平台数据、自定义音源返回内容和用户同步数据的合法性、准确性与可用性由相应来源和使用者负责；请尊重版权并支持正版。

本项目免费开源，仅用于技术学习与研究。禁止在违反当地法律法规的情况下使用，不接受商业合作或广告。使用本项目即表示接受仓库许可证及上游补充条款；如需完整历史措辞，可从 Git 上游 README 版本核对。
