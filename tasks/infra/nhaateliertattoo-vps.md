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

`~/launchpad-wp-stack` (repo private `tuquet/nhaateliertattoo-wp-stack`, upstream `tuquet/launchpad-wp-stack`):

| Container | Image | Port | Vai trò |
|---|---|---|---|
| `registry-nginx-ui` | `uozi/nginx-ui` | 80, 443 | reverse proxy + quản lý SSL |
| `wordpress` | `wordpress:latest` | 8888 | CMS (PHP 8.3), healthy |
| `wp-db` | `mariadb:10.11` | 3306 (internal) | DB `wordpress` |
| `registry-dozzle` | `amir20/dozzle` | 127.0.0.1:8080 | xem log |

`~/launchpad-registry-stack`: `data/` (1.5G), `n8n-data/`, `nginx-ui/`, `registry/` — n8n + registry.

## 3. Domain (Cloudflare → nginx-ui → WP)

`nhaateliertattoo.com` · `cms.` · `admin.` · `nginx-ui.` · `dozzle.` · `cockpit.nhaateliertattoo.com`

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
