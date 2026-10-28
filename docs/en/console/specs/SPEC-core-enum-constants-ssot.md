# Spec: Kiến Trúc Enum & Hằng Số Đơn Nguồn Sự Thật (`enum-constants-ssot`)

> **Mã đặc tả:** `SPEC-enum-constants-ssot`  
> **Module id:** `enum-constants-ssot` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`SPEC-cross-i18n-en-vi.md`](SPEC-cross-i18n-en-vi.md), [`SPEC-core-data-access.md`](SPEC-core-data-access.md)  
> **Trạng thái:** **ĐÃ PHÊ DUYỆT & HOÀN TẤT TRIỂN KHAI (ACCEPTED & IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Thiết lập hệ thống **Enum & Constants Single Source of Truth (SSOT)** chuẩn công nghiệp cho toàn bộ Admin (`@operon/constants` và `@operon/admin-web`), chấm dứt tình trạng phân mảnh kiểu union (`'published' | 'draft'`) và chuỗi tĩnh rời rạc (_magic strings_) trong các tầng API, Store, Form Filter và Bảng dữ liệu (`VxeGrid`):

1. **Chuẩn Hóa Pattern `as const` Object + Derived Union Type (Zero Runtime Overhead):**
   - Thay thế toàn bộ kiểu union rời rạc và chuỗi literal lặp lại bằng cặp **Const Object (`UPPER_SNAKE_CASE`)** + **Derived Type (`PascalCase`)** có khả năng tự suy diễn kiểu tuyệt đối, tương thích 100% với `isolatedDeclarations`, `vue-tsc`, `oxlint` và trình đóng gói `Rolldown`.
   - Nghiêm cấm sử dụng từ khóa `enum` truyền thống của TypeScript (vốn sinh mã IIFE runtime dư thừa và xung đột với `erasableSyntaxOnly` / `isolatedDeclarations`).
2. **Tập Trung Hóa 5 Miền Nghiệp Vụ Cốt Lõi (5 Canonical Domain Pillars):**
   - **Core & Storage (`core.ts`, `storage.ts`):** `SUPABASE_SCHEMA`, `FILTER_ALL` (`'all'`), `STORAGE_KEYS` (`OPERON_ACTIVE_TENANT_ID`, `operon:auth-banner-mode`...).
   - **Tenant & Workspace (`tenant.ts`):** `TENANT_STATUS`, `TENANT_PLAN`, `INVITATION_STATUS`.
   - **Automation & Fleet (`automation.ts`):** `WORKFLOW_STATUS`, `CAMPAIGN_STATUS`, `LOG_LEVEL`, `DEVICE_STATUS`, `BROWSER_STATUS`, `PROXY_STATUS`, `PROXY_PROTOCOL`.
   - **Commerce & Billing (`commerce.ts`, `billing.ts`):** `COMMERCE_PRODUCT_TYPE`, `COMMERCE_ORDER_STATUS`, `COMMERCE_STOCK_STATUS`, `PAYMENT_CHANNEL`, `PAYMENT_INTENT_STATUS`, `WALLET_TX_TYPE`, `SUBSCRIPTION_STATUS`.
   - **System Governance (`system.ts`):** `SYSTEM_PLUGIN_STATUS`.
3. **Chuẩn Hóa Siêu Dữ Liệu Giao Diện (Declarative Badge Tone & Reactive i18n Select Options):**
   - Cung cấp bộ ánh xạ ngữ nghĩa màu sắc (`StatusTone`: `'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'primary'`) và hàm dựng danh sách tùy chọn bộ lọc (`buildEnumFilterOptions`) tự động kết nối với khóa dịch `$t(...)`.
   - Loại bỏ các khối lệnh `if/else` hoặc `switch/case` lặp lại hàng chục lần trong các tệp `.vue` khi hiển thị huy hiệu trạng thái (`Status Badge`) và thanh lọc (`VbenForm` Select).

---

## 2. Tech Stack

- **Ngôn ngữ & Trình kiểm tra kiểu:** TypeScript 5.x (`strict: true`, `vue-tsc`).
- **Bundler & Linter:** Vite / Rolldown, `oxlint`, ESLint, Prettier.
- **Tầng Gói Chia Sẻ (`Shared Package`):** `@operon/constants` (`packages/constants/src/`).
- **Tầng Ứng Dụng (`App Layer`):** `@operon/admin-web` (`apps/web-admin/src/constants/`, `apps/web-admin/src/api/core/`, `apps/web-admin/src/views/`).
- **Tầng Đa Ngôn Ngữ (`i18n`):** `vue-i18n` (`$t('common.*')`, `$t('term.*')`, `$t('page.*')`).
- **Kiểm Thử (`Unit Test`):** `Vitest` (`pnpm --filter @operon/constants test`, `pnpm --filter @operon/admin-web test:unit`).

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests kiểm định tính toàn vẹn của hệ thống Enum & Constants
pnpm --filter @operon/admin-web run test:unit

# 2. Kiểm tra đối xứng khóa dịch i18n giữa en-US và vi-VN
pnpm run check:i18n

# 3. Kiểm tra kiểu dữ liệu TypeScript toàn cục (0 errors)
pnpm --filter @operon/admin-web run typecheck

# 4. Kiểm tra linter (oxlint + eslint)
pnpm run lint

# 5. Đóng gói kiểm thử cục bộ trên Nginx / Tailscale (http://100.68.217.61/)
pnpm run build:local
```

---

## 4. Project Structure (Cấu Trúc Tệp Tác Động)

```text
admin/
├── packages/
│   └── constants/src/
│       ├── index.ts                            # Re-export toàn bộ hằng số cốt lõi và miền nghiệp vụ
│       ├── core.ts                             # SUPPORT_LANGUAGES, LOGIN_PATH, DEFAULT_HOME_PATH, FILTER_ALL
│       └── domains/                            # [MỚI] Hằng số & kiểu Enum dùng chung toàn monorepo
│           ├── index.ts                        # Barrel export cho toàn bộ domain enums
│           ├── schema.ts                       # SUPABASE_SCHEMA, STORAGE_KEYS
│           ├── tenant.ts                       # TENANT_STATUS, TENANT_PLAN, INVITATION_STATUS
│           ├── automation.ts                   # WORKFLOW_STATUS, CAMPAIGN_STATUS, LOG_LEVEL, DEVICE_STATUS, BROWSER_STATUS, PROXY_STATUS, PROXY_PROTOCOL
│           ├── commerce.ts                     # COMMERCE_PRODUCT_TYPE, COMMERCE_ORDER_STATUS, COMMERCE_STOCK_STATUS
│           ├── billing.ts                      # PAYMENT_CHANNEL, PAYMENT_INTENT_STATUS, WALLET_TX_TYPE, SUBSCRIPTION_STATUS
│           └── system.ts                       # SYSTEM_PLUGIN_STATUS
└── apps/web-admin/src/
    ├── constants/                              # [MỚI] Tầng cầu nối Enum UI Metadata (Badge Tones & i18n Option Builders)
    │   ├── index.ts                            # Re-export @operon/constants + UI helpers
    │   ├── enum-helper.ts                      # StatusTone, getStatusToneMeta(), buildEnumOptions(), buildEnumFilterOptions()
    │   └── status-meta.ts                      # Bảng ánh xạ Status -> { tone, labelKey } cho từng miền
    ├── api/core/
    │   ├── supabase-client.ts                  # Import SupabaseSchema từ @operon/constants
    │   ├── tenant.ts                           # Import TenantStatus, TenantPlan, STORAGE_KEYS từ @operon/constants
    │   ├── automation.ts                       # Import & re-export WorkflowStatus, CampaignStatus, DeviceStatus... từ @operon/constants
    │   ├── commerce.ts                         # Import & re-export CommerceProductType, CommerceOrderStatus... từ @operon/constants
    │   ├── billing.ts                          # Import & re-export PaymentChannelType, PaymentIntentStatusType... từ @operon/constants
    │   └── system.ts                           # Import & re-export SystemPluginStatus, SubscriptionStatus từ @operon/constants
    └── views/
        ├── tenants/index.vue                   # Thay magic strings bằng TENANT_STATUS, TENANT_PLAN & helper
        ├── automation/
        │   ├── workflows/index.vue             # Thay 'published'|'draft'|'archived'|'all' bằng WORKFLOW_STATUS, FILTER_ALL
        │   ├── runs/index.vue                  # Thay chuỗi trạng thái bằng CAMPAIGN_STATUS, LOG_LEVEL
        │   ├── devices/index.vue               # Thay chuỗi trạng thái bằng DEVICE_STATUS
        │   ├── browsers/index.vue              # Thay chuỗi trạng thái bằng BROWSER_STATUS
        │   └── proxies/index.vue               # Thay chuỗi trạng thái bằng PROXY_STATUS, PROXY_PROTOCOL
        ├── commerce/                           # Đồng bộ COMMERCE_PRODUCT_TYPE, COMMERCE_ORDER_STATUS, PAYMENT_CHANNEL
        └── system/                             # Đồng bộ SYSTEM_PLUGIN_STATUS, SUBSCRIPTION_STATUS
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Chuẩn Khai Báo `as const` Object & Derived Type (`@operon/constants`)

Mỗi Enum miền bao gồm 3 phần: (1) Đối tượng hằng số đóng băng `as const`, (2) Kiểu Union dẫn xuất tự động, và (3) Mảng giá trị hợp lệ `VALUES` phục vụ kiểm tra runtime (type guard) hoặc khởi tạo vòng lặp:

```typescript
// packages/constants/src/domains/automation.ts

export const WORKFLOW_STATUS = {
  ARCHIVED: 'archived',
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export type WorkflowStatus =
  (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

export const WORKFLOW_STATUS_VALUES = Object.values(
  WORKFLOW_STATUS,
) as readonly WorkflowStatus[];

export const CAMPAIGN_STATUS = {
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
  QUEUED: 'queued',
  RUNNING: 'running',
} as const;

export type CampaignStatus =
  (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];
```

### 5.2. Chuẩn Hóa Bộ Lọc Tất Cả (`FILTER_ALL`)

Thay vì mỗi màn hình tự quy ước chuỗi `'all'` hoặc `''` rời rạc:

```typescript
// packages/constants/src/core.ts
export const FILTER_ALL = 'all' as const;
export type FilterAll = typeof FILTER_ALL;
export type WithFilterAll<T extends string> = FilterAll | T;
```

### 5.3. Chuẩn Hóa Siêu Dữ Liệu Huy Hiệu & Bộ Lọc Đa Ngôn Ngữ (`apps/web-admin/src/constants/enum-helper.ts`)

Cung cấp bảng màu ngữ nghĩa chuẩn Shadcn Slate (`StatusTone`) tuân thủ nghiêm ngặt quy tắc `Sentence case` (không dùng `uppercase` trên Status Badge):

```typescript
// apps/web-admin/src/constants/enum-helper.ts

export const STATUS_TONE = {
  DANGER: 'danger',
  INFO: 'info',
  NEUTRAL: 'neutral',
  PRIMARY: 'primary',
  SUCCESS: 'success',
  WARNING: 'warning',
} as const;

export type StatusTone = (typeof STATUS_TONE)[keyof typeof STATUS_TONE];

export interface StatusToneClasses {
  badgeClass: string;
  dotClass: string;
  pulse?: boolean;
}

export const STATUS_TONE_CLASS_MAP: Record<StatusTone, StatusToneClasses> = {
  danger: {
    badgeClass:
      'border-destructive/30 bg-destructive/15 text-destructive dark:text-red-400',
    dotClass: 'bg-destructive dark:bg-red-400',
  },
  info: {
    badgeClass:
      'border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    pulse: true,
  },
  neutral: {
    badgeClass: 'border-border bg-muted text-muted-foreground',
    dotClass: 'bg-muted-foreground/60',
  },
  primary: {
    badgeClass: 'border-primary/30 bg-primary/15 text-primary',
    dotClass: 'bg-primary',
  },
  success: {
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  warning: {
    badgeClass:
      'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
};

export interface EnumItemMeta {
  /** Khóa dịch i18n chuẩn (ví dụ: 'page.automation.workflows_view.status_published') */
  labelKey: string;
  /** Ngữ nghĩa màu sắc của huy hiệu */
  tone: StatusTone;
}

/**
 * Dựng mảng options cho VbenForm Select, tự động dịch theo ngôn ngữ hiện hành
 */
export function buildEnumFilterOptions<T extends string>(
  metaMap: Record<T, EnumItemMeta>,
  translate: (key: string) => string,
  options?: {
    allLabelKey?: string;
    includeAll?: boolean;
    order?: readonly T[];
  },
): Array<{ label: string; value: FilterAll | T }> {
  const keys = options?.order ?? (Object.keys(metaMap) as T[]);
  const items = keys.map((value) => ({
    label: translate(metaMap[value].labelKey),
    value,
  }));

  if (options?.includeAll !== false) {
    return [
      {
        label: translate(options?.allLabelKey ?? 'common.all'),
        value: FILTER_ALL,
      },
      ...items,
    ];
  }
  return items;
}
```

### 5.4. Mẫu Áp Dụng Trong View (`workflows/index.vue`)

```typescript
import { computed } from 'vue';
import { FILTER_ALL, WORKFLOW_STATUS } from '@operon/constants';
import {
  buildEnumFilterOptions,
  getWorkflowStatusMeta,
  WORKFLOW_STATUS_META,
} from '#/constants';
import { $t } from '#/locales';

const statusFilterOptions = computed(() =>
  buildEnumFilterOptions(WORKFLOW_STATUS_META, $t, {
    allLabelKey: 'page.automation.workflows_view.status_all',
    order: [
      WORKFLOW_STATUS.PUBLISHED,
      WORKFLOW_STATUS.DRAFT,
      WORKFLOW_STATUS.ARCHIVED,
    ],
  }),
);

// Trong truy vấn API:
if (formValues.status && formValues.status !== FILTER_ALL) {
  list = list.filter((w) => w.status === formValues.status);
}
```

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests cho `@operon/constants` và `apps/web-admin/src/constants` (`Vitest`):**
   - Kiểm tra mọi hằng số miền (`WORKFLOW_STATUS`, `CAMPAIGN_STATUS`, `DEVICE_STATUS`, `BROWSER_STATUS`, `PROXY_STATUS`, `TENANT_STATUS`, `COMMERCE_PRODUCT_TYPE`, `COMMERCE_ORDER_STATUS`, `PAYMENT_CHANNEL`, `PAYMENT_INTENT_STATUS`, `WALLET_TX_TYPE`, `SUPABASE_SCHEMA`) có giá trị chuỗi khớp 100% với ràng buộc `CHECK` trong cơ sở dữ liệu PostgreSQL/Supabase (`operon/cloud`).
   - Kiểm tra `buildEnumFilterOptions` sinh đúng phần tử đầu tiên `FILTER_ALL` (`'all'`) và dịch nhãn động khi đổi ngôn ngữ `en-US` $\leftrightarrow$ `vi-VN`.
   - Kiểm tra `getStatusToneMeta` luôn trả về cấu hình fallback an toàn (`neutral`) nếu gặp giá trị chuỗi lạ từ DB.
2. **Kiểm Định Tương Thích Ngược التầng API (`Backward Re-export Verification`):**
   - Các tệp `src/api/core/*.ts` vẫn re-export đầy đủ các kiểu `WorkflowStatus`, `CampaignStatus`, `CommerceOrderStatus`... để không làm gãy bất kỳ import hiện hữu nào.
3. **Cổng Chất Lượng Toàn Cục:**
   - `pnpm run check:i18n`, `pnpm --filter @operon/admin-web run typecheck`, `pnpm run lint`, và `pnpm run build:local` đạt `0 errors`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always (Luôn thực hiện):**
  - Khai báo hằng số bằng `as const` object (`UPPER_SNAKE_CASE`) và trích xuất kiểu union (`PascalCase`) từ chính object đó.
  - Giữ các giá trị chuỗi hằng số khớp chính xác tuyệt đối 1:1 với cột `status` / `type` trong schema PostgreSQL của `operon/cloud`.
  - Re-export đầy đủ các kiểu dữ liệu tại `apps/web-admin/src/api/core/*.ts` để bảo toàn tính tương thích ngược cho toàn bộ codebase.
  - Tuân thủ quy tắc Typography: Huy hiệu trạng thái (`Status Badge`) luôn dùng `Sentence case`, nghiêm cấm `uppercase`.
- **Ask first (Hỏi ý kiến trước khi làm):**
  - Thêm hoặc đổi tên bất kỳ giá trị trạng thái nào có ảnh hưởng tới ràng buộc `CHECK` dưới cơ sở dữ liệu Supabase (`operon/cloud`).
  - Thay đổi giá trị khóa `STORAGE_KEYS` đang lưu trong `localStorage` của người dùng cuối.
- **Never (Tuyệt đối nghiêm cấm):**
  - Không dùng `enum` hoặc `const enum` của TypeScript.
  - Không viết chuỗi trạng thái rời rạc (`'published'`, `'running'`, `'manual_review'`, `'all'`) trực tiếp trong logic lọc hoặc template của `.vue` sau khi đã có hằng số chuẩn.
  - Không chạy `git push` hoặc kích hoạt GitHub Actions CI/CD khi chưa có lệnh rõ ràng từ người dùng.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1 — Đơn Nguồn Sự Thật Tại `@operon/constants`:** Toàn bộ 18+ bộ Enum/Constants thuộc 5 miền (`schema/storage`, `tenant`, `automation/fleet`, `commerce`, `billing/system`) được định nghĩa chuẩn hóa theo mẫu `as const` tại `packages/constants/src/domains/` và xuất qua `@operon/constants`.
- [x] **SC2 — Đồng Bộ 100% Tầng API (`src/api/core/*.ts`):** Các tệp `supabase-client.ts`, `tenant.ts`, `automation.ts`, `commerce.ts`, `billing.ts`, `system.ts` chuyển sang dùng hằng số và kiểu từ `@operon/constants` (kèm re-export giữ tương thích ngược).
- [x] **SC3 — Helper Giao Diện & Đa Ngôn Ngữ (`src/constants/`):** Cung cấp `STATUS_TONE`, `buildEnumFilterOptions` và bảng metadata trạng thái giúp loại bỏ mã lặp `if/else` tạo class màu sắc và mảng select options thủ công.
- [x] **SC4 — Refactor Sạch Magic Strings Trên Các Màn Hình Quản Trị:** Toàn bộ các trang sử dụng `useVbenVxeGrid` (`/tenants`, `/automation/workflows`, `/automation/jobs`, `/automation/devices`, `/automation/browsers`, `/automation/proxies`, `/commerce/*`, `/system/*`) sử dụng hằng số chuẩn (`WORKFLOW_STATUS`, `FILTER_ALL`, v.v.) thay cho chuỗi literal.
- [x] **SC5 — Kiểm Định Tự Động & Build Local Xanh 100%:** Có bộ Unit Test (`Vitest`) bảo vệ toàn bộ Enum & Helpers; `pnpm run check:i18n`, `pnpm --filter @operon/admin-web run typecheck`, `pnpm run lint`, và `pnpm run build:local` hoàn tất với `0 errors`.

---

## 9. Resolved Decisions (Các Quyết Định Đã Chốt)

1. **Kiến trúc phân tách 2 tầng (`@operon/constants` vs `#/constants`):** Toàn bộ định nghĩa hằng số miền thuần túy (`as const` object + derived union type + mảng `*_VALUES`) được đặt tại `packages/constants/src/domains/` và xuất qua `@operon/constants`; các helper gắn với giao diện và đa ngôn ngữ (`STATUS_TONE`, `getStatusToneMeta`, `buildEnumFilterOptions`, `status-meta.ts`) được đặt tại `apps/web-admin/src/constants/` (`#/constants`).
2. **Triển khai đồng bộ toàn bộ 4 phân hệ nghiệp vụ theo lát cắt dọc (Vertical Slices):** Thực hiện tuần tự từ nền tảng Core/Tenant $\rightarrow$ UI Helpers & Unit Tests $\rightarrow$ Automation & Fleet $\rightarrow$ Commerce & Billing $\rightarrow$ System Governance, đảm bảo 100% tương thích ngược tại `src/api/core/*.ts`.
