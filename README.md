# LX Music Desktop (桌面增强版)

基于 Electron 与 Vue 3 开发的跨平台桌面音乐播放器。本项目为原作者 **lyswhut (落雪无痕)** 开源项目 [lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) 的增强分支 (Fork)，在完整保留原版优秀体验与稳定架构的基础上，深度拓展了多设备听歌统计、跨端 CRDT 数据同步以及私有云单曲 Web 分享单页等核心功能。

---

## 🌟 致敬原作者与开源致谢

本项目首先向原作者 **[lyswhut](https://github.com/lyswhut)** 致以崇高的敬意与感谢！原作者打造的落雪音乐系列以其极简优雅的 UI、轻量高效的架构和完全自由可控的设计，成为了广受喜爱的音乐工具。

- **原作者 GitHub**：[lyswhut](https://github.com/lyswhut)
- **上游官方仓库**：[lx-music-desktop](https://github.com/lyswhut/lx-music-desktop)
- **官方使用文档**：[LX Music Document](https://lyswhut.github.io/lx-music-doc/)
- **常见问题解答**：[桌面端 FAQ](https://lyswhut.github.io/lx-music-doc/desktop/faq)

本项目严格遵循开源社区规范与 Apache-2.0 开源协议，所有二次开发改动均公开透明，仅供技术研究、学习与个人交流使用。

---

## 🎧 落雪全家桶 (LX Music Suite) 生态架构

本项目属于“落雪全家桶”协同生态的核心客户端之一。全家桶由“双客户端 + 双服务端”组成，打通了桌面端、移动端与云端自建服务的完整链路：

```text
               ┌───────────────────────────────┐
               │    落雪全家桶 (LX Music Suite)   │
               └───────────────┬───────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────┐                               ┌──────────────┐
│  客户端集群   │                               │  服务端中枢   │
└──────┬───────┘                               └──────┬───────┘
       │                                               │
       ├─► LX Music Desktop (桌面端，本仓库)            ├─► LX Music Sync Server (多端数据同步服务)
       │   - 平台：Windows / macOS / Linux             │   - 协议：WebSocket 双向实时同步
       │   - 特性：大屏听歌统计、多端聚合、私有云分享     │   - 功能：歌单/黑名单同步 + CRDT 听歌统计
       │                                               │
       └─► LX Music Mobile (移动端客户端)               └─► LX Music Share Server (私有云音乐分享服务)
           - 平台：Android (React Native)              │   - 架构：FastAPI + APlayer + Nginx 206
           - 特性：后台播放、设备分桶、便捷分享          │   - 功能：单曲转存、沉浸单页、留言板、TTL 自动清理
```

1. **LX Music Desktop (桌面端客户端)**：
   - 基于 Electron + Vue 3 构建，运行于 Windows、macOS 与 Linux。
   - 内置听歌历史与可视化播放统计，支持按设备分桶的 CRDT 跨端聚合计算。
   - 歌曲操作菜单集成原生私有云分享弹窗，可自主选择有效期限，生成即开即播的专属单页。
2. **LX Music Mobile (移动端客户端)**：
   - 基于 React Native 构建，专注于 Android 生态的高保真播放体验。
   - 与桌面端共享同一套 CRDT 统计与同步逻辑，手机端点歌即时同步至云端。
   - 原生支持一键推送到私有分享服务，适配微信内置浏览器和手机系统分享。
3. **LX Music Sync Server (多端数据同步服务)**：
   - 基于 Node.js 与 WebSocket 开发的高性能同步中枢。
   - 负责实时双向同步用户的歌单、收藏、歌曲列表与 Dislike 黑名单。
   - 本套生态深度扩展了按设备分桶的状态型 CRDT 听歌统计数据结构，多端并发写入永不丢数。
4. **LX Music Share Server (私有云音乐分享服务)**：
   - 基于 Python FastAPI + APlayer 打造的免登录极简单页分享系统。
   - 客户端点击“分享歌曲”后，服务端全自动异步流式转存音频、专辑封面和 LRC 歌词。
   - 网页单页适配 220px 沉浸多行歌词视窗、MediaSession 系统通知栏控制、微信浮窗指引以及免登录听友互动留言板。
   - 支持设置 1天、3天、7天、30天或永久有效（TTL），后台守护协程定时自动销毁过期文件，释放云服务器磁盘。

---

## 🛠️ 落雪服务端保姆级部署教程

要发挥落雪全家桶的完整威力，建议在自己的 VPS 或家庭 NAS 服务器上部署 `Sync Server`（用于同步歌单和统计）和 `Share Server`（用于生成单曲试听网页）。以下提供经生产验证的完整部署指南。

### 一、部署 LX Music Sync Server (数据同步服务)

Sync Server 负责桌面端与手机端的歌单、黑名单和 CRDT 听歌统计实时同步。

#### 方式 1：Docker 一键部署 (推荐)

创建 `docker-compose.yml` 文件：

```yaml
version: "3.8"

services:
  lx-music-sync:
    image: lyswhut/lx-music-sync-server:latest
    container_name: lx-music-sync
    restart: unless-stopped
    ports:
      - "9527:9527"
    environment:
      - PORT=9527
      - BIND_IP=0.0.0.0
      - LX_USER_user1=YourStrongSyncPassword123
    volumes:
      - ./data:/server/data
      - ./logs:/server/logs
```

启动容器：

```bash
docker compose up -d
```

> **参数说明**：
> - `LX_USER_<用户名>`：指定用户的连接密钥，例如 `LX_USER_user1=YourStrongSyncPassword123`，客户端连接时填入该密码即可。
> - `PORT`：监听端口，默认为 `9527`。

#### 方式 2：Node.js 源码直接运行

```bash
git clone https://github.com/lyswhut/lx-music-sync-server.git
cd lx-music-sync-server
npm install
npm run build

# 启动服务 (默认端口 9527)
npm start
```

若需持久运行，可使用 PM2 进行进程守护：

```bash
npm install -g pm2
pm2 start dist/index.js --name "lx-sync"
```

#### 配置 Nginx 反向代理与 SSL (必看)

公网部署必须通过 Nginx 配置 HTTPS 与 WebSocket 转发，示例配置如下：

```nginx
server {
    listen 80;
    server_name sync.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sync.example.com;

    ssl_certificate     /etc/letsencrypt/live/sync.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sync.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:9527;
        proxy_http_version 1.1;
        
        # 核心：必须配置 WebSocket 握手升级，否则客户端实时同步会断连
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

#### 客户端连接步骤

1. 打开桌面端或移动端，进入“设置” -> “同步”；
2. 勾选“启用同步服务”；
3. 服务器地址填入：`https://sync.example.com`（若无域名且局域网调试，填 `http://服务器IP:9527`）；
4. 连接码输入配置的密钥（如 `YourStrongSyncPassword123`）；
5. 点击“连接”，状态变为“已连接”即表示实时多端同步生效。

---

### 二、部署 LX Music Share Server (私有云音乐分享服务)

Share Server 负责接收客户端推送的单曲信息并生成独立的免安装 Web 播放单页。

#### 1. 环境准备与源码安装

```bash
# 1. 准备目录与拉取代码
sudo mkdir -p /opt/lx-music-share
cd /opt/lx-music-share

# 2. 创建 Python 虚拟环境 (建议 Python 3.10+)
python3 -m venv venv
source venv/bin/activate

# 3. 安装后端核心依赖
pip install fastapi uvicorn httpx jinja2 python-multipart
```

在 `/opt/lx-music-share` 目录下放入服务主程序 `server.py` 与静态模板目录 `templates/player.html`。

#### 2. Systemd 守护进程配置

创建服务描述文件 `/etc/systemd/system/lx-music-share.service`：

```ini
[Unit]
Description=LX Music Share Web Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lx-music-share
ExecStart=/opt/lx-music-share/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8920 --workers 2
Restart=always
RestartSec=5

# 环境变量配置 (请修改为自己的真实域名与目录)
Environment="BASE_URL=https://music.example.com"
Environment="DATA_DIR=/opt/lx-music-share/data"
Environment="DEFAULT_TTL_DAYS=7"
# Environment="SHARE_TOKEN=YourCustomSecurityToken"  # 可选：如果希望限制只有自己能分享，可设置 Token

[Install]
WantedBy=multi-user.target
```

启动并设置开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lx-music-share
```

#### 3. Nginx 反向代理配置 (关键：Range 206 音频切片直出)

> **极度重要**：iOS Safari、微信内置浏览器与移动端网页播放音频时，强制要求服务端支持 HTTP 206 Partial Content (Range 请求)，否则会导致进度条无法拖动、歌曲无法从中间播放或直接静音。
> 配置中使用 Nginx 直接拦截 `/media/` 静态目录，利用 Nginx 原生性能实现超高速分片直出，极大减少 Python 进程的负载！

```nginx
# 80 端口自动重定向到 HTTPS
server {
    listen 80;
    server_name music.example.com;
    return 301 https://$host$request_uri;
}

# 443 端口：HTTPS 反向代理与媒体切片
server {
    listen 443 ssl http2;
    server_name music.example.com;

    ssl_certificate     /etc/letsencrypt/live/music.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/music.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 客户端上传歌曲限制 (单曲音频与媒体包最大允许 100M)
    client_max_body_size 100M;

    # 1. 媒体资源直出 (Nginx 原生极速 Range 206 分片响应，适配 iOS Safari、微信与移动端)
    location /media/ {
        alias /opt/lx-music-share/data/media/;
        expires 7d;
        add_header Accept-Ranges bytes;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        error_page 404 = @fastapi;
    }

    location @fastapi {
        proxy_pass http://127.0.0.1:8920;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. 动态 API、留言板与单页路由反代到 FastAPI
    location / {
        proxy_pass http://127.0.0.1:8920;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

检查并重载 Nginx：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

#### 客户端配置与使用

1. 打开桌面端，点击右上角齿轮进入“设置” -> “基本设置”；
2. 找到“分享方式”，选择“私有分享服务”；
3. “分享服务器地址”输入自己的服务域名，例如：`https://music.example.com`；
4. 若服务端配置了 `SHARE_TOKEN`，在“访问 Token”栏填入，否则留空；
5. 在歌曲列表或正在播放栏右键任意歌曲，点击“分享歌曲”，在弹出的浮窗中选择有效期限（1天、3天、7天、30天或永久），点击“生成分享链接”即可一键复制或在浏览器中打开试听！

---

## 💻 桌面端本地开发与构建

### 运行环境
- Node.js 22+
- npm 10+
- Git

### 安装依赖与启动调试

```bash
# 推荐使用 clean install 保证依赖树绝对一致
npm ci

# 启动本地开发热重载模式 (Electron + Vite)
npm run dev
```

### 代码质量门禁检查

在提交代码前，请确保通过以下静态检查：

```bash
# 代码风格校验
npm run lint

# 主进程与渲染进程 TypeScript 编译检查
npx tsc -p src/main/tsconfig.json --noEmit
npx tsc -p src/renderer/tsconfig.json --noEmit
```

### 打包客户端安装包

```bash
# 构建 Windows 平台便携包与安装程序
npm run pack:win

# 构建 Linux 平台安装包 (AppImage / deb)
npm run pack:linux

# 构建 macOS 平台安装包 (dmg / zip)
npm run pack:mac
```

---

## 📂 用户数据与安全规范

各操作系统默认数据目录如下：
- **Windows**: `%APPDATA%/lx-music-desktop`（若程序所在根目录存在名为 `portable` 的空文件夹，则会自动切换为便携绿色模式）
- **Linux**: `$XDG_CONFIG_HOME/lx-music-desktop` 或 `~/.config/lx-music-desktop`
- **macOS**: `~/Library/Application Support/lx-music-desktop`

> **安全提示**：个人配置文件、本地歌单数据库、自定义音源脚本、Cookie 以及多端同步连接码属于个人敏感凭据，严禁将其提交至公共 Git 仓库中。

---

## 📄 许可协议与免责声明

1. 本项目基于 [Apache License 2.0](LICENSE) 协议开源。
2. 本项目不提供、不储存任何受版权保护的音频或媒体资源。播放与分享功能所用音频直链均由用户本地配置的自定义规则或接口解析生成，内容的合法性与版权归属由相应原始来源及使用者自行承担，请自觉尊重版权并支持正版音乐。
3. 本项目为开源爱好者技术研究、架构演进与个人学习产物，严禁用于任何商业牟利、广告推广或违法违规场景。使用本项目即表示您已阅读并完全同意上述声明与上游软件条款。
