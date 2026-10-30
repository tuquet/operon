# VPS TrumVPS — dự án nhaateliertattoo

**Provider:** TrumVPS (AS150873 THUONGCLOUD), Hanoi
**IP:** `103.249.201.142` · `trumvps-1775054041746`
**OS:** Debian 12 (OpenSSH 9.2p1) · 1 vCPU · ~1.9 GiB RAM · disk 25 GiB

## 1. Truy cập

| User | Quyền | Ghi chú |
|---|---|---|
| `tattoo` | `sudo`, `docker` | user chính; SSH key của Hermes **đã cài** trong `~/.ssh/authorized_keys` (30/10/2026) |
| `root` | — | password login bị chặn (`PermitRootLogin prohibit-password`) |

```bash
ssh tattoo@103.249.201.142          # key-only, đã hoạt động
```

`sudo` **có** hỏi password → agent không chạy được lệnh cần sudo; phải nhờ user chạy thủ công trong Termius.

## 2. Stacks (không có systemd app nào — tất cả là Docker)

**Chỉ còn 3 container** (plan 013, 30/10/2026 — đã bỏ nginx-ui, dozzle, registry, n8n):

| Container | Image | Port | Vai trò |
|---|---|---|---|
| `cloudflared` | `cloudflare/cloudflared` | — (outbound) | ingress duy nhất từ Cloudflare |
| `wordpress` | `wordpress:latest` (Apache + mod_php, đã tune) | không publish, `expose 80` | CMS (PHP 8.3) |
| `wp-db` | `mariadb:10.11` (đã tune) | internal 3306 | DB `wordpress` |

Tuning RAM: `config/apache/tuning.conf` (MaxRequestWorkers 20, KeepAlive Off), `config/php/uploads.ini` (memory_limit 192M, opcache 64M), `config/mysql/tuning.cnf` (max_connections 25, key_buffer 16M). RAM used **730 MB / 1967 MB**, available 1.2 GB → chi tiết `plans/013`.

`~/launchpad-registry-stack`: **đã ngưng dùng** — `data/` (1.5 G) chờ xoá bằng sudo.

## 3. Domain & ingress — **Cloudflare Tunnel làm cổng duy nhất** (plan 012, 30/10/2026)

```
Internet → Cloudflare edge → cloudflared (outbound-only) → wordpress:80 (không publish port)
```

| Tunnel | ID | Nguồn config |
|---|---|---|
| `wp-tattoo` | `e21ecbe0-2b1b-49bc-848f-065afba5cdc4` | remote-managed (Cloudflare dashboard/API) |

Container `cloudflared` (`cloudflare/cloudflared:latest`, network `wp-network`, token ở `proxy/tunnel.env` chmod 600, đã gitignore).

DNS (zone `nhaateliertattoo.com`, Free): `@`, `www`, `cms`, `admin` → CNAME `<tunnel-id>.cfargotunnel.com` proxied. Đã xoá: `nginx-ui`, `dozzle`, `cockpit`, `n8n`, `registry-ui` (service chết + không phơi admin UI). `always_use_https=on`.

**Port matrix (đo lại từ internet, 30/10/2026):** `80/443/8888/8080/9090` → **closed**; chỉ còn `22` open (user yêu cầu giữ SSH nguyên trạng).

## 3b. Truy cập quản trị (không phơi internet)

```bash
# nginx-ui (reverse proxy/SSL cũ, nay bind 127.0.0.1)
ssh -N -L 8081:127.0.0.1:80 tattoo@103.249.201.142     # → http://localhost:8081
# dozzle (log viewer)
ssh -N -L 8080:127.0.0.1:8080 tattoo@103.249.201.142   # → http://localhost:8080
```


## 4. Env — nguồn sự thật

| File | Vị trí | Trạng thái |
|---|---|---|
| `.env` | `~/launchpad-wp-stack/.env` | **tracked trong git** của repo private (commit `f5feb5d` "feat: force track .env") |
| `.env.example` | cùng thư mục | tracked, 18 key |

Key của `.env` (chỉ tên, không giá trị): `COMPOSE_FILE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `DB_PORT`, `WP_PORT`, `WP_TABLE_PREFIX`, `WP_AUTH_KEY`, `WP_SECURE_AUTH_KEY`, `WP_LOGGED_IN_KEY`, `WP_NONCE_KEY`, `WP_AUTH_SALT`, `WP_SECURE_AUTH_SALT`, `WP_LOGGED_IN_SALT`, `WP_NONCE_SALT`, `WP_DEBUG`.

Đã theo đúng chuẩn plan 011 (techstack naming, không prefix thương hiệu).

**Nợ kỹ thuật:** `.env` + `proxy/nginx-ui/` (SSL key, `registry.password`) bị bỏ khỏi `.gitignore` để "lưu trên private git" → secret nằm trong git history. Repo private nên không phải sự cố công khai, nhưng nên rotate `DB_PASSWORD`/`DB_ROOT_PASSWORD`/WP salts rồi đưa `.env` ra khỏi git.

## 5. Cảnh báo vận hành

- **Disk 96%** (`/dev/vda1` 25G, còn ~1G): `/var/log/journal` 2.0G, `btmp*` 124M (SSH brute-force), docker images reclaimable 4.3G.
- `wpcli` container không chạy (compose profile) → thao tác WP phải dùng `docker compose run --rm wpcli`.

## 6. Runbook

```bash
# WP CLI
cd ~/launchpad-wp-stack && docker compose run --rm wpcli wp <cmd> --allow-root

# Dọn disk (cần sudo)
sudo journalctl --vacuum-size=200M
docker image prune -a -f
sudo truncate -s 0 /var/log/btmp /var/log/btmp.1

# Unban IP bị fail2ban
sudo fail2ban-client set sshd unbanip <IP>
```
