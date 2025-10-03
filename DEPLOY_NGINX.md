## 使用 Nginx 为 Next-Gen Threat Modeler 配置同域反向代理（HTTPS）

本文档说明如何在一台 Ubuntu/Nginx 服务器上，将前端（Vite 预览或静态站点）与后端（FastAPI/uvicorn，HTTP 8890）通过同一个 HTTPS 域名对外提供，避免浏览器 Mixed Content 报错。

### 架构概览
- 浏览器访问 `https://ap.iotsploit.org`（示例域名，替换成你的域名）
- Nginx 监听 443 并终止 TLS
- Nginx 反代路径：
  - `/` → 前端（本机 5173，或你的静态站点）
  - `/api/`、`/analysis/` → 后端（本机 8890，纯 HTTP）

后端无需启用 HTTPS，也无需开放 8890 对外的 TLS；所有外部 HTTPS 流量都走 Nginx。

### 前置条件
- 已安装 Nginx（`sudo apt-get install nginx -y`）
- 已有 DNS A 记录指向服务器公网 IP（例如 `ap.iotsploit.org`）
- 机器上后端服务监听在本机 `127.0.0.1:8890`（或内网地址），前端监听在 `127.0.0.1:5173`（或替换为你的静态资源服务）
- 已安装 Certbot（可选）用于申请 Let’s Encrypt 证书

### Nginx 配置示例
文件路径（Debian/Ubuntu）：`/etc/nginx/sites-available/attackpathapp.conf`

```nginx
server {
  server_name ap.iotsploit.org;

  # 如有上传需求可调大
  client_max_body_size 20m;

  # 后端 API（转发到本机 8890）
  location /api/ {
    proxy_pass http://127.0.0.1:8890/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 75s;
  }

  # 后端分析接口（同样转发到本机 8890）
  location /analysis/ {
    proxy_pass http://127.0.0.1:8890/analysis/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 75s;
  }

  # 前端（Vite preview 或静态站点）
  location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 如需 ws（dev HMR 常用，静态站点通常不需要）
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  listen 443 ssl; # 使用 Certbot 管理证书
  ssl_certificate /etc/letsencrypt/live/ap.iotsploit.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ap.iotsploit.org/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
  listen 80;
  server_name ap.iotsploit.org;
  return 301 https://$host$request_uri;
}
```

> 注意：将 `ap.iotsploit.org` 替换成你的域名；如前端不是 5173 端口，请把 `proxy_pass` 的上游改为你的实际地址（例如静态目录或另一个服务）。

### 启用站点并重载
```bash
sudo ln -s /etc/nginx/sites-available/attackpathapp.conf /etc/nginx/sites-enabled/attackpathapp.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 申请/续期证书（可选）
使用 Certbot（nginx 插件）：
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ap.iotsploit.org
# 后续自动续期：/lib/systemd/system/certbot.timer 已默认启用
```

### 验证
```bash
# 后端直连（HTTP）：应返回 JSON
curl -sS http://127.0.0.1:8890/api/palette/plugins | head

# 通过 Nginx（HTTPS，同域，不再 Mixed Content）：应返回 JSON
curl -sS https://ap.iotsploit.org/api/palette/plugins | head

# 访问首页（返回 HTML）
curl -sS https://ap.iotsploit.org | head
```

### 前端与 CI 要点
- 推荐让前端在生产环境同源访问：`VITE_NEXTGEN_API=https://ap.yourdomain.example` 或直接不设置，让代码回退到 `window.location.origin`。
- 已有示例（CI 中）：将 `VITE_NEXTGEN_API` 设为 `https://ap.iotsploit.org`，配合上面的同域反代即可。

### 常见问题与排错
- 错误：`wrong version number` 或 `curl: (35)`
  - 原因：尝试用 HTTPS 直连后端 8890，但 8890 只提供 HTTP。
  - 解决：只通过 `https://ap.iotsploit.org/api/...` 访问，由 Nginx 转发到 8890。

- 返回 HTML 而不是 JSON
  - 原因：`/api/...` 被转发到前端上游（5173）而非后端 8890。
  - 解决：确认已添加 `/api/`、`/analysis/` 两个 `location` 且 `proxy_pass` 指向 8890。

- 502/504 网关错误
  - 查看后端是否在运行（监听 8890），检查 `proxy_read_timeout` 是否过短。
  - 查看 Nginx 错误日志：`/var/log/nginx/error.log`。

- CORS 相关
  - 本方案为“同域反代”，浏览器与后端同域，通常无需额外 CORS 设置。

- WebSocket/HMR
  - 开发环境需要 HMR 或 WebSocket 时，保留 `Upgrade/Connection` 头设置；生产静态站点一般不需要。

### 加固建议（可选）
- 开启 HSTS（谨慎）：
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  ```
- 适度的 `proxy_buffers`、`proxy_busy_buffers_size` 配置以缓解大响应场景
- 速率限制/基础 WAF（如有需要）

### 变更记录
- 2025-10-03 初版：增加同域反代 `/api`、`/analysis`，解决 Mixed Content


