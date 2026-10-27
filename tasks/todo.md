# Task List: Docker Compose Cho Submodules (Profiles Architecture)

- [x] Task 1: Tạo Dockerfile và Nginx conf cho `console` (Workstation)
  - Acceptance: `console/deploy/Dockerfile` và `console/deploy/nginx.conf` hoàn thành, hỗ trợ SPA routing.
  - Verify: Kiểm tra cú pháp Dockerfile và Nginx config.
  - Files: `console/deploy/Dockerfile`, `console/deploy/nginx.conf`

- [x] Task 2: Tạo Dockerfile cho `cli` (Rust Daemon API)
  - Acceptance: `cli/deploy/Dockerfile` multi-stage build Rust release binary, expose port 8765.
  - Verify: Kiểm tra cú pháp Dockerfile.
  - Files: `cli/deploy/Dockerfile`

- [x] Task 3: Tạo Dockerfile cho `bot` (Telegram ChatOps Bot)
  - Acceptance: `bot/deploy/Dockerfile` Node.js container hỗ trợ long-polling.
  - Verify: Kiểm tra cú pháp Dockerfile.
  - Files: `bot/deploy/Dockerfile`

- [x] Task 4: Tạo Dockerfile và Nginx conf cho `operon.com` (Portal Docs)
  - Acceptance: `operon.com/deploy/Dockerfile` và `operon.com/deploy/nginx.conf` hoàn thành.
  - Verify: Kiểm tra cú pháp Dockerfile và Nginx config.
  - Files: `operon.com/deploy/Dockerfile`, `operon.com/deploy/nginx.conf`

- [x] Task 5: Tạo root `docker-compose.yml` điều phối Profiles
  - Acceptance: `docker-compose.yml` tại root map đúng các profiles `web`, `ops`, `all` và networks.
  - Verify: Chạy `docker compose config` và `docker compose --profile all config` thành công 100%.
  - Files: `docker-compose.yml`
