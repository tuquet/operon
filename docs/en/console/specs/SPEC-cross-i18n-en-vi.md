# Spec: Kiến Trúc Đa Ngôn Ngữ 3 Tầng & Áp Dụng 100% Toàn Hệ Thống (`i18n-en-vi`)

> **Mã đặc tả:** `SPEC-i18n-en-vi`  
> **Module id:** `i18n-en-vi` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md)  
> **Trạng thái:** **ĐÃ NGHIỆM THU & TRIỂN KHAI 100% (ACCEPTED & IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Đạt độ phủ quốc tế hóa **100% (`0` chuỗi văn bản tĩnh hardcode)** cho toàn bộ Admin (`@operon/admin-web`, `@operon/locales`, `@operon/plugins`) trên cả 2 ngôn ngữ **`en-US`** và **`vi-VN`**, bao gồm toàn bộ tiêu đề trang, cột bảng `VxeGrid`, bộ lọc `VbenForm`, hộp thoại Modal, tab chi tiết, biểu đồ Analytics, trang xác thực/hồ sơ, trạng thái rỗng (Empty state) và thông báo `toast`:

1. **Loại Bỏ Triệt Để 100% Chuỗi Hardcode (46 Tệp / 992 Dòng Hiện Còn Tồn Đọng):**
   - Chuyển đổi toàn bộ văn bản tĩnh tiếng Việt/tiếng Anh còn nằm trong 46 tệp `.vue` và `.ts` tại `apps/web-admin/src/` sang sử dụng hệ thống từ điển 3 tầng (`$t('common.*')`, `$t('term.*')`, `$t('page.*')`).
2. **Cơ Chế Dịch Động Phản Ứng Tức Thì (`Reactive VxeGrid & VbenForm i18n`):**
   - **Cột bảng `VxeGrid`:** Cấu hình `VxeUI.setConfig({ translate })` kết hợp truyền khóa dịch/hàm dịch để khi người dùng bấm `LanguageToggle` (`en-US` $\leftrightarrow$ `vi-VN`), toàn bộ tiêu đề cột (`columns[].title`), phân trang (`VxePager`) và trạng thái rỗng đổi ngôn ngữ tức thì mà không cần tải lại trang (F5).
   - **Bộ lọc `VbenForm` (`formOptions.schema`):** Chuẩn hóa `label: () => $t('...')` và `componentProps: () => ({ placeholder: $t('...'), options: [...] })` để nhãn trường lọc, placeholder và danh sách tùy chọn Select tự động cập nhật theo `preferences.app.locale`.
3. **Kiến Trúc Từ Điển 3 Tầng (Three-Tier Dictionary SSOT):**
   - **Tầng 1 — Hành động & Trạng thái phổ quát (`packages/locales/src/langs/*/common.json`):** Động từ thao tác (`create`, `add`, `edit`, `delete`, `save`, `cancel`, `confirm`, `close`, `back`, `copy`, `copied`, `search`, `filter`, `reset`, `refresh`, `export`, `import`, `connect`, `detail`), trạng thái (`status`, `all`, `active`, `inactive`, `online`, `offline`, `pending`, `completed`, `failed`, `suspended`) và nhãn cột phổ biến (`name`, `description`, `createdAt`, `updatedAt`, `action`).
   - **Tầng 2 — Thuật ngữ miền chuẩn (`packages/locales/src/langs/*/term.json`):** Danh mục 50+ thuật ngữ cốt lõi của hệ sinh thái (`workspace`, `workflow`, `run`, `device`, `runner`, `browser`, `browserProfile`, `proxy`, `proxyPool`, `plugin`, `plan`, `subscription`, `role`, `permission`, `auditLog`, `user`, `member`, `job`, `task`, `order`, `wallet`, `product`).
   - **Tầng 3 — Nhãn ngữ cảnh màn hình (`apps/web-admin/src/locales/langs/*/page.json`):** Chỉ chứa tiêu đề, mô tả phụ, thông báo `toast` và câu hướng dẫn đặc thù của 6 phân hệ (`dashboard`, `workspace`, `automation`, `commerce`, `system`, `auth`, `profile`).
4. **Chuẩn Ngữ Pháp `Sentence case` & Nhãn Tối Giản (`Brevity Standard`):**
   - Văn bản tiếng Việt tuân thủ nghiêm ngặt **Sentence case** (chỉ viết hoa chữ cái đầu câu và danh từ riêng/viết tắt kỹ thuật $\le 4$ ký tự như `API`, `CLI`, `SSO`, `UUID`, `IP`, `RBAC`, `IAM`).
   - Nút hành động trong ngữ cảnh đã rõ chỉ dùng động từ ngắn gọn (`Tạo` / `Create`, `Mời` / `Invite`, `Lưu` / `Save`).

---

## 2. Tech Stack

- **Framework i18n:** `vue-i18n@^11.4.10` (`legacy: false`, `globalInjection: true`).
- **Workspace Packages:** `@operon/locales`, `@operon/preferences`, `@operon/plugins` (`vxe-table`), `@operon-core/form-ui`.
- **Static Analysis & Verification:** `vue-i18n-extract` + trình quét AST/Regex kiểm tra `0` chuỗi tiếng Việt hardcode trong `apps/web-admin/src/`.

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Kiểm tra đối xứng khóa dịch giữa en-US và vi-VN
pnpm run check:i18n

# 2. Quét phát hiện chuỗi tiếng Việt hardcode còn sót trong apps/web-admin/src (ngoài thư mục locales/)
node -e '
const fs = require("node:fs"), path = require("node:path");
const vn = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((f) => {
    const p = path.join(d, f.name);
    return f.isDirectory() ? (f.name === "locales" || f.name === "__tests__" ? [] : walk(p)) : /\.(vue|ts)$/.test(f.name) ? [p] : [];
  });
}
let leaks = 0;
for (const file of walk("apps/web-admin/src")) {
  fs.readFileSync(file, "utf8").split("\n").forEach((line, idx) => {
    const t = line.trim();
    if (!t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*") && !t.startsWith("<!--") && vn.test(t)) {
      console.error(`${file}:${idx + 1}: ${t}`);
      leaks++;
    }
  });
}
if (leaks > 0) process.exit(1);
console.log("PASS: 0 hardcoded Vietnamese lines found.");
'

# 3. Kiểm tra kiểu dữ liệu TypeScript & Linter
pnpm run check:type
pnpm run lint

# 4. Build cục bộ và cập nhật Nginx preview (Zero Git Push)
pnpm run build:local
```

---

## 4. Project Structure & Phạm Vi 46 Tệp Cần Chuẩn Hóa 100%

```text
admin/
├── packages/
│   ├── locales/src/langs/{en-US,vi-VN}/
│   │   ├── common.json                         # Tầng 1: Mở rộng các khóa trạng thái, cột chung & thao tác
│   │   ├── term.json                           # Tầng 2: Từ điển thuật ngữ chuẩn (bổ sung commerce/wallet/order)
│   │   ├── authentication.json                 # Chuỗi xác thực dùng chung
│   │   └── profile.json                        # Chuỗi hồ sơ cá nhân
│   └── effects/plugins/src/vxe-table/
│       └── init.ts                             # Tích hợp VxeUI.setConfig({ translate }) & đồng bộ locale
└── apps/web-admin/src/
    ├── adapter/vxe-table.ts                    # Cấu hình translate i18n tự động cho VxeTable
    ├── locales/langs/{en-US,vi-VN}/page.json   # Tầng 3: Từ điển nghiệp vụ 100% đối xứng
    ├── api/core/                               # [4 files] access.ts, supabase-client.ts, system.ts, workspace-detail.ts
    ├── composables/use-clipboard.ts            # [1 file] Thông báo sao chép clipboard đa ngôn ngữ
    ├── components/
    │   ├── common/                             # [2 files] cli-snippet-card.vue, danger-zone-card.vue
    │   └── iam/role-badge.vue                  # [1 file] Nhãn vai trò theo i18n
    └── views/
        ├── _core/
        │   ├── authentication/                 # [5 files] login, forget-password, reset-password, callback, desktop-gateway
        │   └── profile/index.vue               # [1 file] Hồ sơ cá nhân & bảo mật tài khoản
        ├── dashboard/analytics/                # [4 files] index, growth-chart, plans-chart, plugins-chart
        ├── tenants/                            # [12 files] index, detail + 5 tabs + 5 modals
        ├── automation/                         # [8 files] workflows, runs (index/detail), devices (+2 modals), browsers, proxies
        ├── system/                             # [6 files] plugins, plans, subscriptions, users, roles, audit-logs
        └── commerce/                           # [5 files] store, orders, wallet, admin, public-store
```

---

## 5. Code Style & Mẫu Thiết Kế Reactive i18n

### 5.1. Dịch Động Cho `VxeGrid` & `VbenForm` (Không Cần Reload Trang)

```ts
import { $t } from '#/locales';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

const [Grid, gridApi] = useVbenVxeGrid<TenantItem>({
  formOptions: {
    schema: [
      {
        component: 'Select',
        fieldName: 'plan',
        label: () => $t('term.plan'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('common.all'),
          options: [
            { label: $t('common.all'), value: 'all' },
            { label: $t('page.workspace.plan_free'), value: 'free' },
            { label: $t('page.workspace.plan_pro'), value: 'pro' },
            {
              label: $t('page.workspace.plan_enterprise'),
              value: 'enterprise',
            },
          ],
        }),
      },
      {
        component: 'Select',
        fieldName: 'status',
        label: () => $t('common.status'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('common.all'),
          options: [
            { label: $t('common.all'), value: 'all' },
            { label: $t('common.active'), value: 'active' },
            { label: $t('common.suspended'), value: 'suspended' },
          ],
        }),
      },
    ],
  },
  gridOptions: {
    columns: [
      {
        field: 'name',
        title: 'term.workspace',
        minWidth: 220,
        slots: { default: 'name-cell' },
      },
      {
        field: 'plan',
        title: 'term.plan',
        width: 130,
        slots: { default: 'plan-cell' },
      },
      {
        field: 'status',
        title: 'common.status',
        width: 140,
        slots: { default: 'status-cell' },
      },
      {
        field: 'created_at',
        title: 'common.createdAt',
        width: 150,
        slots: { default: 'date-cell' },
      },
      {
        field: 'actions',
        title: 'common.action',
        width: 220,
        align: 'right',
        slots: { default: 'actions-cell' },
      },
    ],
  },
});
```

### 5.2. Cấu Hình `translate` Trong `src/adapter/vxe-table.ts`

```ts
import { $t, i18n } from '#/locales';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      translate(key, args) {
        if (key && typeof key === 'string' && i18n.global.te(key)) {
          return $t(key, args);
        }
        return key;
      },
      grid: {
        // ...
      },
    });
  },
  useVbenForm,
});
```

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Static Hardcode Scanner Gate:** Chạy trình quét toàn bộ `apps/web-admin/src/**/*.{vue,ts}` (loại trừ `src/locales/**` và comment) đảm bảo **`0` dòng** chứa ký tự tiếng Việt có dấu hardcode.
2. **Key Parity Gate (`pnpm run check:i18n`):** Đối chiếu 100% khóa dịch giữa `en-US` và `vi-VN` trên cả `packages/locales` và `apps/web-admin/src/locales`.
3. **Reactive Locale Switch Verification:** Kiểm tra chuyển đổi `en-US` $\leftrightarrow$ `vi-VN` trực tiếp trên trình duyệt đảm bảo tiêu đề trang, cột bảng `VxeGrid`, nhãn lọc `VbenForm`, biểu đồ và modal đổi ngôn ngữ tức thì.
4. **Typecheck, Lint & Local Build:** Đạt `0 errors` khi chạy `pnpm run check:type`, `pnpm run lint`, và `pnpm run build:local`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Tra cứu và tái sử dụng `$t('common.*')` và `$t('term.*')` trước khi tạo khóa mới trong `page.json`.
  - Dùng hàm getter `() => $t('...')` cho `formOptions.schema` (`label`, `componentProps`) và khóa i18n cho `columns[].title` để đảm bảo tính reactive khi chuyển đổi ngôn ngữ.
  - Tuân thủ tuyệt đối `Sentence case` cho tiếng Việt và giữ nguyên các thuật ngữ chuẩn trong `term.json` (`Workspace`, `Runner`, `Proxy`, `Plugin`, `Webhook`).
- **Ask first:**
  - Thêm ngôn ngữ mới ngoài `en-US` và `vi-VN`.
  - Thay đổi tên định danh kỹ thuật trong `term.json`.
- **Never:**
  - Không để sót bất kỳ chuỗi tiếng Việt hoặc tiếng Anh hiển thị người dùng nào dạng hardcode trong `.vue` / `.ts`.
  - Không dùng Title Case trong tiếng Việt (ví dụ: cấm viết `"Thêm Thành Viên Mới"`, phải viết `"Thêm thành viên"`).
  - Không chạy `git push` khi chưa có yêu cầu rõ ràng từ người dùng.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1 (Zero Hardcoded Strings):** Trình quét toàn bộ 46 tệp trong `apps/web-admin/src/**/*.{vue,ts}` trả về **`0` dòng** chứa chuỗi tiếng Việt hardcode; các biểu đồ Analytics và badge cũng dùng `$t(...)` 100%.
- [x] **SC2 (100% Key Parity):** Tất cả các tệp JSON trong `packages/locales/src/langs/{en-US,vi-VN}/` và `apps/web-admin/src/locales/langs/{en-US,vi-VN}/page.json` khớp 100% số lượng khóa và cấu trúc (1,418 khóa phẳng đối xứng 100%, `pnpm run check:i18n` pass).
- [x] **SC3 (Reactive Grid & Form Localization):** Chuyển đổi ngôn ngữ qua `LanguageToggle` cập nhật tức thì cả tiêu đề cột `VxeGrid`, nhãn/placeholder/options của `VbenForm`, biểu đồ và Modal mà không cần tải lại trang.
- [x] **SC4 (Sentence Case & Terminology Compliance):** 100% giá trị dịch trong `vi-VN/*.json` tuân thủ Sentence case và đồng nhất thuật ngữ với `term.json`.
- [x] **SC5 (Quality & Local Build Gate):** Vượt qua `pnpm run check:type`, `pnpm run lint` (`0 errors`), 109/109 unit tests (`vitest`) và `pnpm run build:local` phục vụ kiểm thử trực tiếp trên `http://100.68.217.61/`.

---

## 9. Open Questions (Câu Hỏi Mở)

Đã hoàn tất triển khai và nghiệm thu toàn bộ 5 tiêu chí SC1–SC5.
