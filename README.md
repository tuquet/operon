# Operon Ecosystem — Architecture & Product Specs (`specs-operon`)

> **Single Source of Truth (SSOT)** cho đặc tả kỹ thuật (Specs), quyết định kiến trúc (ADRs), từ điển thuật ngữ (`GLOSSARY.md`), và lộ trình triển khai (`roadmaps/`) trên toàn bộ các app thuộc hệ sinh thái **Operon**.

---

## Cấu trúc thư mục

```text
specs-operon/
├── README.md                              # Mục lục tổng & quy ước viết spec
├── GLOSSARY.md                            # Từ điển thuật ngữ bắt buộc (SSOT)
├── templates/                             # Mẫu chuẩn để tạo Spec / ADR mới
│   ├── SPEC-TEMPLATE.md
│   └── ADR-TEMPLATE.md
├── adr/                                   # Architecture Decision Records
│   └── ADR-0001-canonical-tenant-terminology.md
├── specs/                                 # Đặc tả kỹ thuật chia theo app / domain
│   ├── core/                              # Cross-repo specs (dùng chung nhiều app)
│   ├── operon/                            # Rust CLI, Daemon (:8765), Stealth Browser
│   ├── console/                           # Workstation UI (Vue 3, Tauri v2, Micro-apps)
│   ├── bot/                               # Alert & Telegram ChatOps hub
│   ├── id/                                # Identity / Auth portal
│   └── store/                             # Storefront & Commerce backend
└── roadmaps/                              # Lộ trình thực thi theo phase
```

---

## Quy ước đặt tên & Quản lý vòng đời

### 1. Đặt tên file
- **Cross-repo Spec:** `specs/core/SPEC-<NNN>-<kebab-case-slug>.md`
- **App Spec:** `specs/<app>/SPEC-<NNN>-<kebab-case-slug>.md` (đánh số riêng hoặc nối tiếp toàn hệ thống)
- **ADR (Quyết định kiến trúc):** `adr/ADR-<NNNN>-<kebab-case-slug>.md`
- **Roadmap:** `roadmaps/ROADMAP-<NNN>-<kebab-case-slug>.md`

### 2. Trạng thái Spec (Frontmatter)
Mỗi spec bắt đầu bằng YAML frontmatter để dễ lọc/render bằng VitePress/Obsidian:
- `draft` — Đang soạn thảo, chưa chốt.
- `review` — Đang chờ review/chốt kiến trúc.
- `approved` — Đã duyệt, sẵn sàng implement.
- `implemented` — Đã triển khai xong và đồng bộ với code.
- `deprecated` — Đã thay thế bởi spec mới hơn.

---

## Danh mục hiện có

### Glossary & ADRs
- [GLOSSARY.md](./GLOSSARY.md) — Chuẩn hóa thuật ngữ toàn hệ sinh thái
- [ADR-0001](./adr/ADR-0001-canonical-tenant-terminology.md) — Chốt dùng `tenant` làm thuật ngữ duy nhất thay cho `workspace`

### Core Specs (Cross-Repo)
| ID | Tài liệu | Phạm vi | Trạng thái |
| --- | --- | --- | --- |
| SPEC-001 | [Tenant Management & Selector Widget](./specs/core/SPEC-001-tenant-and-widget.md) | `console` + `operon` + Supabase | `implemented` |
| SPEC-002 | [Browser Management — Full CRUD & Lifecycle](./specs/core/SPEC-002-browser-management-crud.md) | `operon` + `console` + Cloud | `implemented` |

### Roadmaps
| ID | Tài liệu | Trạng thái |
| --- | --- | --- |
| ROADMAP-001 | [Tenant & Browser Management Phased Roadmap](./roadmaps/ROADMAP-001-tenant-and-browser.md) | `implemented` |
