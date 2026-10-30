# Infra registry — máy chủ & vị trí env

Bảng tra cứu nhanh: dự án nào chạy ở đâu, env nằm ở file nào. Một dòng / một máy chủ.

| Dự án | Host | User SSH | Code | Env (SSOT) |
|---|---|---|---|---|
| Operon / Tuquet ecosystem | VPS chính `157.66.24.171` | `root` | `/root/tuquet/operon` | `/root/.hermes/.env` (agent) + `.env` cạnh compose (gitignored) |
| nhaateliertattoo | `103.249.201.142` ([chi tiết](nhaateliertattoo-vps.md)) | `tattoo` (sudo, key-only) | `~/launchpad-wp-stack` | `~/launchpad-wp-stack/.env` (tracked, repo private) |

## Quy ước

1. **Env của app ở trên máy chạy app** — không copy secret về VPS khác.
2. **Hermes `.env` (`/root/.hermes/.env`) chỉ chứa token cấp-agent**: OpenRouter, Telegram, Supabase access, GitHub, Cloudflare, Vercel, TokenPlus. Không nhét secret của từng dự án vào đây.
3. `.env.example` tracked, `.env` thật gitignored, `chmod 600` (plan 011 + `CONSTRAINTS.md`).
4. Tên biến theo techstack, **không prefix thương hiệu** (`TQ_`/`TUQUET_`/`SPECTER_` bị cấm).
5. Thêm dự án mới = thêm 1 dòng vào bảng trên + 1 file `<slug>-vps.md` cùng thư mục.
