# 013 — Chỉ giữ WordPress + tối ưu RAM (VPS 1 vCPU / 1.9 GB)

**Status: ✅ DONE 30/10/2026** · Priority: P1 (swap đã bị ăn 168 MB, trần prefork 150 worker = OOM chắc chắn)
**Host:** `103.249.201.142` · Repo wp-stack commit `c45b3e6`

## Vấn đề đo được (trước)

| Hạng mục | Số đo |
|---|---|
| RAM used / available | **979 MB / 987 MB** (total 1967 MB) |
| Swap đã dùng | **168 MB** (đang thrash) |
| `wordpress` (Apache `mpm_prefork` + mod_php) | **237 MB**, 11 worker × ~90 MB RSS |
| `wp-db` (MariaDB) | 137 MB — `max_connections=151`, `key_buffer_size=128M` |
| `registry-nginx-ui` | 75 MB (container) / 123 MB process |
| `registry-dozzle` | 13 MB |
| `cloudflared` | 18 MB (ingress duy nhất — giữ) |

**Bom hẹn giờ:** `MaxRequestWorkers 150` × 90 MB ≈ **13 GB trần** trên máy 1.9 GB → ~20 request đồng thời (bot quét) là OOM-kill. `memory_limit 512M` + `max_execution_time 300` làm mỗi request nặng có thể chiếm 0.5 GB.

## Thay đổi

1. **Bỏ dịch vụ thừa:** `docker compose -f proxy/compose.yml down` → xoá `registry-nginx-ui` + `registry-dozzle`; prune image `uozi/nginx-ui` + `amir20/dozzle` (−542 MB disk). Chỉ còn **cloudflared + wordpress + wp-db**.
2. **Apache** (`config/apache/tuning.conf` → `/etc/apache2/conf-enabled/zz-tuning.conf`): `ServerLimit 20`, `MaxRequestWorkers 20`, `StartServers 3`, `MaxSpareServers 6`, `MaxConnectionsPerChild 500`, `KeepAlive Off`.
3. **PHP** (`config/php/uploads.ini`): `memory_limit 512M → 192M`, `max_execution_time 300 → 120`, `opcache.memory_consumption 128 → 64`, `interned_strings_buffer 16`, `max_accelerated_files 10000`.
4. **MariaDB** (`config/mysql/tuning.cnf` → `/etc/mysql/conf.d/zz-tuning.cnf`): `max_connections 151 → 25`, `thread_cache_size 8`, `table_open_cache 200`, `key_buffer_size 128M → 16M`, `innodb_log_buffer_size 8M`, `innodb_flush_method O_DIRECT`, `innodb_flush_log_at_trx_commit 2`, `skip-name-resolve`, `performance_schema OFF`.

## Kết quả đo lại (sau)

| Hạng mục | Trước | Sau | Δ |
|---|---|---|---|
| RAM used | 979 MB | **730 MB** | **−249 MB (−25%)** |
| RAM available | 987 MB | **1236 MB** | **+249 MB** |
| `wordpress` | 237 MB | **117 MB** | −120 MB |
| `wp-db` | 137 MB | **110 MB** | −27 MB |
| `nginx-ui` + `dozzle` | 88 MB | 0 | −88 MB |
| Container chạy | 5 | **3** | −2 |
| Trần worker Apache | 150 (≈13 GB) | **20 (≈1.8 GB)** | chặn OOM |
| Disk | 66% (8.0 G free) | **65% (8.4 G free)** | +0.4 G (prune image) |

**Verify:** `https://nhaateliertattoo.com` → 200 (đo 3 lần), `wordpress` healthy, `wp-db` healthy, `cloudflared` up, `docker exec wordpress ps -eo comm | grep -c apache2` = 4 worker, `@@max_connections` = 25.

## Còn lại (cần sudo — chưa chạy)

```bash
# 1. Dọn rác disk (~4.8 G)
rm -rf /home/tattoo/.vscode-server                 # 3.3 G, không còn dùng
rm -rf /home/tattoo/launchpad-registry-stack/data  # 1.5 G, registry đã bỏ
journalctl --vacuum-size=150M

# 2. zram 512 MB (swap nén, lớp 2 vẫn là swapfile 2 G)
apt install -y zram-tools && sed -i 's/^#\?PERCENT=.*/PERCENT=25/' /etc/default/zramswap && systemctl restart zramswap

# 3. Tắt cockpit (đang listen *:9090, không dùng)
systemctl disable --now cockpit.socket
```

## Không làm (đã cân nhắc, loại)

- **Chuyển nginx + PHP-FPM** (tiết kiệm thêm ~90 MB): phải viết lại toàn bộ rewrite `.htaccess` của WP + LiteSpeed/AIOS hook Apache → rủi ro 404 permalink, không đáng khi đã còn 1.2 GB trống.
- **Redis object cache** (+30 MB): chưa cần ở mức traffic hiện tại.
- **Bật page cache LiteSpeed** (plugin đã cài): nên làm khi traffic tăng — giảm PHP hit, không giảm RAM.
