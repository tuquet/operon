---
id: ADR-0001
title: Canonical Tenant Terminology Across Ecosystem
status: accepted
date: 2026-11-19
apps: [core, operon, console]
---

# ADR-0001: Chốt sử dụng `tenant` làm thuật ngữ duy nhất thay cho `workspace`

## Bối cảnh (Context)

Trong giai đoạn phát triển trước, hệ thống tồn tại song song 2 thuật ngữ cho cùng một khái niệm cô lập dữ liệu đa người dùng:
- Cloud database (`public.tenants`, `tenant_members`), hệ thống constants (`TENANT_STATUS`, `STORAGE_KEYS.ACTIVE_TENANT_ID`), `apps/tenants`, và daemon API (`/api/v1/system/tenants`) sử dụng **`tenant`**.
- Một số phần UI (`WorkspaceSelector`, `useWorkspaceStore`), Drizzle local-db (`workspaces`), và migration nháp ban đầu lại sử dụng **`workspace`**.

Việc dùng song song hai thuật ngữ gây nhầm lẫn cho cả lập trình viên, AI agent, schema database và từ điển i18n, đồng thời vi phạm quy tắc Zero-Shim (`CONSTRAINTS.md §S2`).

## Quyết định (Decision)

**Chọn duy nhất thuật ngữ `tenant`** trên toàn bộ:
1. **Database & API:** `tenant_id`, `tenantId`, `DEFAULT_TENANT_ID = "local-default"`, bảng `tenants` / `tenant_members`.
2. **Kernel & Stores:** `KernelTenantContext` (`kernel.tenant`), `useTenantStore`, event `opn:tenant-changed`.
3. **UI & Preferences:** `TenantSelector`, `TenantCreateDialog`, `tenantSelectorButtonPosition`, key i18n `page.tenant.*` / `tenants.*`.

Không giữ alias tương thích ngược cho `workspace` trong code nghiệp vụ.

## Hệ quả (Consequences)

- **Tích cực:** 100% đồng bộ giữa Cloud Postgres, Local SQLite, Rust Daemon, Kernel và Console UI; dễ kiểm soát bằng `GLOSSARY.md`.
- **Ràng buộc:** Từ khóa `workspace` chỉ được dùng cho công cụ build (`pnpm-workspace.yaml`, `workspace:*`, Cargo workspace). Mọi spec mới phải dùng `tenant`.
