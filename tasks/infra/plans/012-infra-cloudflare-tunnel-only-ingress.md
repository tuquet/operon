# 012 — Cloudflare Tunnel làm ingress duy nhất (zero port công khai)

**Status**
- Priority: P0 (bề mặt tấn công: 3 port public + SSH password + docker.sock phơi ra internet)
- Effort: M (~2.5h, 5 phase có verify riêng)
- Risk: trung bình — DNS cutover + đóng port. Downtime mục tiêu **0** (cutover từng hostname, giữ đường lui đến phase cuối)
- Depends on: key SSH của Hermes đã cài ở `tattoo` (xong 30/10), backup DB + `.env` (xong 30/10)
- Category: infra
- Host: `103.249.201.142` (TrumVPS, dự án nhaateliertattoo)

## Why this matters

Hiện origin lộ trực tiếp ra internet ở nhiều lớp, Cloudflare chỉ là lớp trang trí — bỏ qua được bằng IP gốc:

| Đo thật 30/10/2026 | Kết quả |
|---|---|
| `curl http://103.249.201.142:8888` | **200 OK**, `Apache/2.4.68`, `PHP/8.3.33` → **bypass Cloudflare hoàn toàn** |
| `nmap` port 80 | mở, trả `nginx/1.31.3` (nginx-ui) |
| `nmap` port 22 | mở, **PasswordAuthentication = default yes**, `btmp` từng 124 MB lần fail |
| `/var/run/docker.sock` | mount vào `registry-nginx-ui` (đang phơi 80/443) → 1 CVE container = root host |
| Bản vá bảo mật thiếu | **38 gói**; `unattended-upgrades` chưa bật |
| Bản ghi DNS | 9 bản ghi A → `103.249.201.142` (apex, www, cms, admin, cockpit, dozzle, n8n, nginx-ui, registry-ui) |
| `always_use_https` | **off** |

Mục tiêu user chốt: **không phơi gì ra internet; chỉ Cloudflare quản lý đúng 1 cổng WordPress.**

## Kiến trúc đích

```
Internet ──► Cloudflare edge (TLS, WAF, challenge)
                    │  (outbound-only, không mở port nào)
                    ▼
            cloudflared (container, network wp-network)
                    ▼
            wordpress:80 (không publish port ra host)

Quản trị (nginx-ui / dozzle / cockpit / SSH) ──► Tailscale tailnet 100.x (không qua internet)
```

**Nguyên tắc:** origin không có port nào lắng nghe từ internet. `ss -lntu` chỉ còn loopback + `tailscale0` + docker bridge nội bộ.

## Port matrix

| Port | Hiện tại | Đích |
|---|---|---|
| 22/tcp SSH | 🌐 public | 🔒 chỉ `tailscale0` (+ IP nhà nếu cần) |
| 80/tcp | 🌐 public (nginx-ui) | ❌ đóng — Cloudflare tunnel lo |
| 443/tcp | filtered (CF-only) | ❌ đóng |
| 8888/tcp WP | 🌐 **public** | ❌ bỏ publish, chỉ `wordpress:80` nội bộ |
| 9090 cockpit | 🌐 filtered | 🔒 chỉ `tailscale0` (hoặc tắt) |
| 8080 dozzle | 127.0.0.1 | 🔒 giữ loopback + tailnet |
| 25/tcp smtp | 127.0.0.1 | giữ nguyên |
| 3306 MariaDB | internal | giữ nguyên |

## Scope

**In:** cloudflared container + tunnel `wp-tattoo`; repoint DNS apex/www (và cms/admin nếu cần) sang tunnel; bỏ publish port của `wordpress` + `registry-nginx-ui`; ufw default-deny + allow tailscale0; Tailscale trên VPS; tắt SSH password; dedupe key; unattended-upgrades + 38 bản vá; dọn vhost chết (n8n, registry-ui, cockpit).

**Out:** đổi nội dung/theme WordPress; rotate `DB_ROOT_PASSWORD` (việc riêng); `git filter-repo` history của repo wp-stack; migration hosting.

## Phase

### Phase 0 — Baseline & đường lui (20 phút)
- Snapshot DNS zone ra file: `cf-dns-backup-20261030.json` (9 bản ghi) — nguồn để rollback.
- Xác nhận đã có: dump DB (`backups/db-20261030123030.sql.gz`), `.env` backup, 4 key SSH hoạt động.
- Ghi lại `docker ps`, `compose.prod.yml` hiện tại (để khôi phục publish port nếu rollback).
- **Verify:** file backup tồn tại; `ssh -i` vào được; site 200.

### Phase 1 — Tailscale trên VPS tattoo (15 phút)
Mở đường quản trị thứ hai **trước khi** đóng port 22 công khai (thứ tự này là bắt buộc, tránh tự khoá mình).
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=tattoo-vps --accept-routes=false
tailscale status                      # thấy tattoo-vps 100.x
ssh tattoo@100.x.y.z                  # test từ máy khác
```
- **Verify:** SSH qua tailnet IP OK với cả `tattoo` và `root` (nếu cần); `tailscale ping` < 30 ms.
- **Rollback:** `sudo tailscale down` (không ảnh hưởng SSH public hiện tại).

### Phase 2 — Dựng cloudflared + tunnel `wp-tattoo` (40 phút)
Tạo tunnel qua API (remote-managed config, không cần file `config.yml`):
```bash
# tạo tunnel
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"wp-tattoo","config_src":"cloudflare"}'
# lấy token: GET /accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/token
```
Ingress (remote config):
```json
{"ingress":[
  {"hostname":"nhaateliertattoo.com","service":"http://wordpress:80"},
  {"hostname":"www.nhaateliertattoo.com","service":"http://wordpress:80"},
  {"service":"http_status:404"}
]}
```
Container trên VPS (attach `wp-network`, `TUNNEL_TOKEN` qua `.env` file riêng `proxy/tunnel.env` chmod 600):
```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: cloudflared
  restart: unless-stopped
  command: tunnel --no-autoupdate run
  environment: [ "TUNNEL_TOKEN=${TUNNEL_TOKEN}" ]
  networks: [ wp-network ]
```
- Test **chưa đụng domain thật**: thêm CNAME `test.nhaateliertattoo.com` → `<tunnel-id>.cfargotunnel.com` (proxied).
- **Verify:** `curl -I https://test.nhaateliertattoo.com` → 200, title “Nhà Atelier”; `docker logs cloudflared` có 4 connection `hkg`/`sin` registered.
- **Rollback:** xoá CNAME test + `docker rm -f cloudflared`. Domain thật chưa bị chạm.

### Phase 3 — Cutover DNS (20 phút)
- Đổi `nhaateliertattoo.com` + `www` từ `A 103.249.201.142` → `CNAME <tunnel-id>.cfargotunnel.com` (proxied, TTL auto).
- Bật `always_use_https = on` toàn zone.
- **Verify (bắt buộc đủ 5 mục):**
  1. `curl -I https://nhaateliertattoo.com` → 200
  2. `https://nhaateliertattoo.com/wp-admin` → trang login (hoặc 302 wp-login)
  3. Login admin bằng 1 tài khoản thật, tạo/xoá 1 draft
  4. Submit 1 form CF7 (nonce mới)
  5. `curl -I https://www.nhaateliertattoo.com` → 200/301
- **Rollback:** đổi lại 2 bản ghi A về `103.249.201.142` (proxied) — hiệu lực ~giây vì zone do CF quản.

### Phase 4 — Đóng toàn bộ port công khai (20 phút)
1. `compose.prod.yml`: bỏ `ports:` của `wordpress` (chỉ còn `expose: 80`); `registry-nginx-ui` → `127.0.0.1:80:80` + `127.0.0.1:443:443` (hoặc bind `tailscale0` 100.x).
2. `docker compose up -d` (recreate wordpress + nginx-ui).
3. ufw:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0
sudo ufw allow in on docker0    # nội bộ
sudo ufw enable
```
4. `cockpit.socket` → chỉ listen tailscale (hoặc `systemctl disable --now cockpit.socket` nếu không dùng).
- **Verify từ ngoài (VPS chính):** `nc -zv 103.249.201.142 22 80 443 8888 9090` → **tất cả phải fail**; riêng 80/443 vẫn phục vụ qua domain (đi qua tunnel, không phải port host).
- **Rollback:** `sudo ufw disable` + khôi phục khối `ports:` từ file backup Phase 0.

### Phase 5 — Siết SSH + dọn quản trị (25 phút)
```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
MaxAuthTries 3
EOF
sudo sshd -t && sudo systemctl restart ssh
```
- Dedupe key của Hermes trong `~/.ssh/authorized_keys` (đang 2 dòng trùng fingerprint `uCMcI8vezQO3nWzoHnmoDFApSiJFxNw756rZeChQaa8`).
- Xác nhận user `deploy` (uid 1001, trong group `sudo`, tạo 14/5/2026) — giữ thì đặt key + bỏ khỏi sudo, không dùng thì `sudo usermod -L -s /usr/sbin/nologin deploy`.
- **Verify:** mở **2 phiên** Tailscale SSH từ 2 máy; 1 phiên cũ vẫn mở khi restart; thử password login từ ngoài → phải `Permission denied (publickey)`.

### Phase 6 — Vá bảo mật & vệ sinh (40 phút)
- `sudo apt update && sudo apt upgrade -y` (38 gói security) → reboot nếu kernel đổi (`6.1.0-47`), làm trong cửa sổ ít traffic.
- Bật unattended-upgrades:
```bash
sudo dpkg-reconfigure -plow unattended-upgrades   # hoặc sửa 20auto-upgrades
```
- Dọn DNS/vhost chết: `n8n.`, `registry-ui.`, `cockpit.` không có service đang chạy → xoá bản ghi hoặc trỏ tunnel + CF Access nếu còn dùng.
- Bỏ mount `docker.sock` khỏi `registry-dozzle` (đọc log file thay thế) nếu không cần thiết.
- wp real IP: bật `mod_remoteip` + trust CF ranges trong container WordPress để log/Burst statistics thấy IP khách thật (nếu cần số liệu).

### Phase 7 — Tài liệu & chốt (15 phút)
- Cập nhật `tasks/infra/nhaateliertattoo-vps.md`: port matrix mới, cách vào quản trị (Tailscale), tunnel id, rollback.
- Commit + push `tuquet/operon` (private).
- **Verify:** `ss -lntu` chỉ còn loopback/tailscale/docker; scan ngoài sạch; site 200.

## Done criteria

1. `nc -zv 103.249.201.142` trên `22, 80, 443, 8888, 9090` → **fail toàn bộ** từ internet.
2. `https://nhaateliertattoo.com` 200 qua Cloudflare tunnel; `wp-admin` login được; CF7 submit OK.
3. `ss -lntup` trên host: không còn `0.0.0.0:(80|443|8888|9090)`.
4. SSH chỉ vào được qua Tailscale (hoặc IP whitelist), `PasswordAuthentication no`.
5. `0` gói security chờ cài; unattended-upgrades enabled.
6. `authorized_keys` không còn dòng trùng; user lạ không còn trong group `sudo`.
7. Docs `tasks/infra/` khớp thực tế, đã push.

## STOP conditions

- Phase 1 fail (Tailscale không lên) → **dừng**, không đóng port 22.
- Phase 3 verify thiếu bất kỳ mục nào → rollback DNS ngay, không sang Phase 4.
- Sau Phase 4 mất đường vào Tailscale → dùng VNC console TrumVPS để `ufw disable` (đường lui khẩn cấp, đã có sẵn).
- Bất kỳ bước nào cần sửa quá 2 file cấu hình ngoài scope → dừng, báo lại.

## Risks

| Risk | Xử lý |
|---|---|
| cloudflared chết → site down (single ingress) | `restart: unless-stopped` + uptime check từ CF/UptimeRobot + alert Telegram; rollback = repoint A record 1 bước |
| Tự khoá SSH khi tắt password | Tailscale đã verify ở Phase 1 + VNC console của TrumVPS là cứu hộ cuối |
| UFW chặn luôn docker publish | Phase 4 kiểm từ ngoài bằng IP thật, không chỉ `curl` nội bộ |
| CF Free plan giới hạn | Tunnel không giới hạn; CF Access free ≤50 user nếu muốn thay Tailscale |
| WordPress sai IP client (CF-Connecting-IP) | Phase 6 `mod_remoteip` + trust CF ranges |
| Google Search Console/SEO | Không đổi: domain, DNS zone, TLS tại CF giữ nguyên |

## Commands you will need

```bash
# từ VPS chính — kiểm tra bề mặt tấn công
for p in 22 80 443 8888 9090; do timeout 4 bash -c "echo > /dev/tcp/103.249.201.142/$p" 2>/dev/null && echo "$p OPEN" || echo "$p closed"; done

# trên tattoo
ss -lntup | grep -vE '127.0.0.1|::1|100\.'
docker ps --format '{{.Names}}|{{.Ports}}'
docker logs --tail 30 cloudflared
tailscale status
```
