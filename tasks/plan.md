# Kế Hoạch Triển Khai Docker Compose Đa Submodules Dùng Profiles (Plan & Tasks)

## 1. Mục Tiêu Triển Khai
Xây dựng file `docker-compose.yml` duy nhất tại root Operonvà các `Dockerfile` chuyên biệt cho các submodule `console`, `cli`, `bot`, `operon.com` theo đúng đặc tả đã duyệt tại `spec-docker-compose-submodules.md`.

---

## 2. Danh Sách Tasks Chi Tiết

### Task 1: Dockerfile Cho `console` (Workstation Admin SPA)
- **Tập tin**: `console/deploy/Dockerfile` và `console/deploy/nginx.conf`.
- **Nội dung**: Multi-stage build (Node 22-slim + pnpm build -> Nginx Alpine phục vụ trên cổng nội bộ 80, map ra ngoài `:5666`).
- **Xác minh**: Dockerfile có cấu hình BuildKit cache và hỗ trợ SPA routing (`try_files $uri $uri/ /index.html;`).

### Task 2: Dockerfile Cho `cli` (Rust Daemon API)
- **Tập tin**: `cli/deploy/Dockerfile`.
- **Nội dung**: Multi-stage build (Rust 1.85 debian-slim build binary `cargo build --release` -> debian bookworm-slim tối giản với OpenSSL và ca-certificates, expose port `:8765`).
- **Xác minh**: Dockerfile cấu hình user non-root và thư mục state `~/.opn`.

### Task 3: Dockerfile Cho `bot` (Telegram ChatOps Bot)
- **Tập tin**: `bot/deploy/Dockerfile`.
- **Nội dung**: Lightweight Node 20 Alpine chạy `pnpm install --prod` và `node src/index.js`.
- **Xác minh**: Non-root user `node`, không expose port nào (chạy long-polling outbound).

### Task 4: Dockerfile Cho `operon.com` (Marketing & Docs Portal)
- **Tập tin**: `operon.com/deploy/Dockerfile` và `operon.com/deploy/nginx.conf`.
- **Nội dung**: Multi-stage build (Node 22-slim chạy `pnpm build` (vite-ssg) -> Nginx Alpine phục vụ trên cổng nội bộ 80, map ra ngoài `:3333`).
- **Xác minh**: Nginx hỗ trợ gzip/brotli và HTML5 static routing.

### Task 5: Root `docker-compose.yml` (Compose Profiles SSOT)
- **Tập tin**: `docker-compose.yml` tại root repository.
- **Nội dung**: Định nghĩa 4 services:
  - `opn-cli-daemon` (mặc định)
  - `opn-workstation` (mặc định)
  - `opn-landing` (profile: `web`, `all`)
  - `opn-bot` (profile: `ops`, `all`)
  - Custom bridge network `operon-net`.
  - Đọc biến môi trường từ `.env` với fallback an toàn.
- **Xác minh**: Lệnh `docker compose config` kiểm tra cú pháp hợp lệ 100%.
