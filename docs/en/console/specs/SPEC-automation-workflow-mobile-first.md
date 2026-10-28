# Spec: Giao Diện Mobile-First Cho Quản Trị Quy Trình & Phiên Chạy (`workflow-mobile-first`)

> **Mã đặc tả:** `SPEC-workflow-mobile-first`  
> **Module id:** `workflow-mobile-first` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`SPEC-automation-jobs.md`](SPEC-automation-jobs.md), [`SPEC-core-enum-constants-ssot.md`](SPEC-core-enum-constants-ssot.md), [`SPEC-cross-i18n-en-vi.md`](SPEC-cross-i18n-en-vi.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (ACCEPTED & IMPLEMENTED)**

---

## 1. Assumptions (Các Giả Định Đã Xác Nhận Với Người Dùng)

1. **Phạm vi áp dụng (`Scope`):** Tập trung vào phân hệ Quản trị Quy trình & Phiên chạy trong Admin Console (`apps/web-admin`):
   - Danh sách Quy trình: `/automation/workflows` (`views/automation/workflows/index.vue`).
   - Danh sách Phiên chạy: `/automation/jobs` (`views/automation/jobs/index.vue`).
   - Chi tiết Phiên chạy & Nhật ký: `/automation/jobs/:id` (`views/automation/jobs/detail.vue`).
2. **Chiến lược thu gọn bảng `VxeGrid` trên Mobile (`< 640px` / `isMobile`):**
   - Giữ nguyên nền tảng `useVbenVxeGrid` đồng nhất trên cả Mobile và Desktop (không tách 2 cây DOM bảng/thẻ riêng biệt).
   - Tự động ẩn các cột phụ (`visible: !isMobile.value`) khi ở màn hình điện thoại (`< 640px`) và gộp thông tin quan trọng (`version`, `status`, `updated_at` đối với Workflow; `status`, `progress`, `runner`, `created_at` đối với Run) trực tiếp vào ô chính (`name-cell`) để bảng vừa khít chiều ngang `375px`, **không phát sinh thanh cuộn ngang (`overflow-x: 0`)**.
   - Thu gọn thanh lọc `VbenForm` trên mobile (`hideLabel: isMobile.value`, `compact: true`) để ô lọc Trạng thái và Tìm kiếm nằm gọn trên 1 hàng ngang.
3. **Xem chi tiết Quy trình theo chuẩn Baseline (`WorkflowDetailModal`):**
   - Trong ngữ cảnh `/automation/workflows`, thao tác xem chi tiết mở hộp thoại **Chi tiết quy trình (`WorkflowDetailModal`)** ngay tại chỗ (tương tự chuẩn baseline `NodeDetailModal` của trang Thiết bị), hiển thị đầy đủ thông tin quy trình (`name`, `id` kèm nút sao chép, `version`, `status`, `description`, `tenant_id`, `created_at`, `updated_at`) qua `VxeForm` readonly.
   - Giữ nguyên ranh giới ngữ cảnh: tại `/automation/workflows` chỉ xem chi tiết quy trình; việc tra cứu phiên chạy thực hiện tại trang `/automation/jobs`.

---

## 2. Objective (Mục Tiêu & Giá Trị Mang Lại)

Giải quyết triệt để tình trạng tràn chiều ngang (`minWidth: 850px–930px` trên màn hình `375px`), bộ lọc chiếm quá nhiều diện tích dọc, và thiếu màn hình xem chi tiết quy trình trên `/automation/workflows`, `/automation/jobs`, và `/automation/jobs/:id`:

1. **Bảng Quy Trình Mobile-First (`/automation/workflows`):**
   - **Trên Mobile (`isMobile === true`):**
     - Ẩn 4 cột phụ (`version`, `status`, `created_at`, `updated_at`), giữ lại cột chính `name` (`minWidth: 200`) và cột `actions` (`width: 68`).
     - Trong `name-cell`, hiển thị bố cục đa dòng gọn gàng: Tên quy trình + dòng meta dưới gồm `Badge` phiên bản (`v1.x.x`), `Badge` trạng thái (`published / draft / archived`), và thời gian cập nhật.
     - Hỗ trợ chạm vào dòng (`cellClick` trên mobile) hoặc nhấn nút `Chi tiết` (`Eye` icon) để mở `WorkflowDetailModal`.
   - **Trên Desktop (`isMobile === false`):**
     - Hiển thị đầy đủ các cột (`name`, `version`, `status`, `created_at`, `updated_at`, `actions`) kèm nút mở `WorkflowDetailModal`.
2. **Hộp Thoại Chi Tiết Quy Trình Chuẩn Baseline (`WorkflowDetailModal`):**
   - Xây dựng `views/automation/workflows/components/modals/workflow-detail-modal.vue` sử dụng `Dialog` (`@operon/vue-ui`) + `VxeForm` / `VxeFormItem` (`readonly`, `custom-layout`):
     - Khối Header tóm tắt: Icon `GitBranch`, Tên quy trình, Phiên bản (`v...`), và Huy hiệu trạng thái từ `WORKFLOW_STATUS_META`.
     - Lưới thuộc tính `VxeForm`: Mã quy trình (`id` kèm nút copy clipboard), Phiên bản (`version`), Mã Workspace (`tenant_id` kèm nút copy), Ngày tạo (`created_at`), Ngày cập nhật (`updated_at`), và Mô tả chi tiết (`description`).
     - Tối ưu hiển thị trên cả màn hình điện thoại (`max-h-[85vh] overflow-y-auto p-4 sm:max-w-lg`) và máy tính.
3. **Bảng Phiên Chạy Mobile-First (`/automation/jobs`):**
   - **Trên Mobile (`isMobile === true`):**
     - Ẩn 4 cột phụ (`runner`, `progress`, `status`, `created_at`), chỉ giữ cột chính `name` (`minWidth: 210`) và cột `actions` (`width: 68`).
     - Trong `name-cell` trên mobile, tích hợp tên phiên chạy, tên quy trình, huy hiệu trạng thái (`CAMPAIGN_STATUS_META`), tên thiết bị runner và thanh tiến độ mini (`completed_tasks / total_tasks` — `%`) ngay bên dưới để người vận hành nắm bắt toàn bộ trạng thái mà không cần cuộn ngang.
4. **Chi Tiết Phiên Chạy & Nhật Ký Mobile-First (`/automation/jobs/:id`):**
   - Thu gọn Header điều hướng trên mobile: nút `Back`, tiêu đề `truncate`, `Badge` trạng thái và nút `Refresh` / `Cancel` nằm gọn, không bị vỡ dòng.
   - Bảng thông số `VxeForm` hiển thị 2 cột (`span="12"`) cho các chỉ số ngắn (Quy trình, Thiết bị, Thời lượng, Tiến độ) để tiết kiệm chiều dọc trên điện thoại.
   - Khung `Terminal Output Window` (`execution_logs`): trên mobile tự động rút gọn định dạng thời gian (`HH:mm:ss`) hoặc cho phép xuống dòng thông minh (`flex-wrap sm:flex-nowrap`) để nội dung `log.message` luôn có tối đa không gian đọc.

---

## 3. Tech Stack

- **Framework:** Vue 3.5 (`<script setup lang="ts">`), Vue Router 4, TypeScript 5, `vue-i18n` (`@operon/locales`).
- **Responsive State:** `usePreferences()` (`isMobile` reactive computed từ `@operon/preferences`).
- **Data Grid & Form Engine:** `useVbenVxeGrid`, `VxeForm`, `VxeFormItem` từ `src/adapter/vxe-table.ts`.
- **SSOT Constants & Status Metadata:** `WORKFLOW_STATUS_META`, `CAMPAIGN_STATUS_META`, `getStatusMeta`, `buildEnumFilterOptions` từ `src/constants/index.ts`.
- **UI Components & Icons:** `@operon/vue-ui` (`Badge`, `Button`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`), `@lucide/vue`.

---

## 4. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho các helper và trang Automation
pnpm exec vitest run apps/web-admin/src/api/core/__tests__/automation.test.ts

# 2. Kiểm tra đối xứng từ điển đa ngôn ngữ en-US / vi-VN
pnpm run check:i18n

# 3. Kiểm tra kiểu dữ liệu TypeScript và Linter
pnpm --filter @operon/admin-web run typecheck
pnpm run lint

# 4. Đóng gói bản dựng cục bộ và cập nhật Nginx preview (Zero Git Push)
pnpm run build:local
```

---

## 5. Project Structure (Cấu Trúc Tệp Tác Động)

```text
apps/web-admin/src/
├── locales/langs/
│   ├── en-US/page.json                                                   # Bổ sung khóa từ điển cho WorkflowDetailModal
│   └── vi-VN/page.json                                                   # Bổ sung khóa từ điển tiếng Việt (Sentence case)
└── views/automation/
    ├── workflows/
    │   ├── index.vue                                                     # Cột VxeGrid thích ứng isMobile, bộ lọc compact 1 hàng, mở WorkflowDetailModal
    │   └── components/
    │       └── modals/
    │           └── workflow-detail-modal.vue                             # [NEW] Hộp thoại xem chi tiết quy trình theo chuẩn baseline VxeForm
    └── runs/
        ├── index.vue                                                     # Cột VxeGrid thích ứng isMobile, tích hợp progress & status vào ô chính trên mobile
        └── detail.vue                                                    # Tối ưu Header, VxeForm 2 cột và cửa sổ log terminal trên màn hình < 640px
```

---

## 6. Code Style & Kiến Trúc Chi Tiết

### 6.1. Cấu Hình Cột `VxeGrid` Thích Ứng Theo `isMobile` (`workflows/index.vue`)

```ts
import { usePreferences } from '@operon/preferences';

const { isMobile } = usePreferences();

function getColumns() {
  const mobile = isMobile.value;
  return [
    {
      field: 'name',
      title: $t('page.workflows_view.col_name'),
      minWidth: mobile ? 200 : 260,
      slots: { default: 'name-cell' },
    },
    {
      field: 'version',
      title: $t('page.workflows_view.col_version'),
      width: 120,
      visible: !mobile,
      slots: { default: 'version-cell' },
    },
    {
      field: 'status',
      title: $t('page.workflows_view.col_status'),
      width: 140,
      visible: !mobile,
      slots: { default: 'status-cell' },
    },
    {
      field: 'created_at',
      title: $t('page.workflows_view.col_created_at'),
      minWidth: 145,
      visible: !mobile,
      slots: { default: 'created-cell' },
    },
    {
      field: 'updated_at',
      title: $t('page.workflows_view.col_updated_at'),
      minWidth: 145,
      visible: !mobile,
      slots: { default: 'updated-cell' },
    },
    {
      field: 'actions',
      title: $t('common.actions'),
      width: mobile ? 64 : 110,
      align: 'right' as const,
      showOverflow: false,
      slots: { default: 'actions-cell' },
    },
  ];
}

watch([() => $t('page.workflows_view.col_name'), isMobile], () => {
  gridApi.setGridOptions({ columns: getColumns() });
});
```

### 6.2. Ô Chính Đa Tầng Thông Tin Trên Mobile (`#name-cell`)

```vue
<template #name-cell="{ row }">
  <div
    class="flex items-start gap-2.5 py-1 sm:items-center"
    :class="{ 'cursor-pointer': isMobile }"
    @click="isMobile && handleOpenDetail(row)"
  >
    <div
      class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:mt-0"
    >
      <GitBranch class="size-4" />
    </div>
    <div class="min-w-0 flex-1 text-left">
      <div class="truncate font-medium text-foreground">
        {{ row.name }}
      </div>
      <div class="line-clamp-1 max-w-md text-xs text-muted-foreground">
        {{ row.description || $t('page.workflows_view.no_description') }}
      </div>
      <!-- Mobile-only inline metadata row -->
      <div v-if="isMobile" class="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" class="px-1.5 py-0 text-2xs">
          v{{ row.version }}
        </Badge>
        <Badge variant="outline" class="px-1.5 py-0 text-2xs font-normal">
          <span
            class="mr-1 size-1.5 rounded-full"
            :class="getWorkflowStatusDotClass(row.status)"
          ></span>
          {{ getWorkflowStatusLabel(row.status) }}
        </Badge>
        <span class="text-2xs text-muted-foreground">
          {{ formatDate(row.updated_at) }}
        </span>
      </div>
    </div>
  </div>
</template>
```

---

## 7. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests:**
   - Kiểm tra các hàm helper định dạng và trạng thái trong `automation.test.ts` hoạt động chính xác 100%.
2. **Kiểm Định Đa Ngôn Ngữ (`check:i18n`):**
   - `pnpm run check:i18n` đạt `0` khóa thiếu, đối xứng 100% giữa `en-US` và `vi-VN`, `0` chuỗi tiếng Việt hardcode.
3. **Typecheck & Lint Gate:**
   - `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.
4. **Kiểm Thử Giao Diện Thực Tế (`build:local`):**
   - Kiểm tra trên khung nhìn Mobile (`375x667`) và Desktop (`1440x900`) tại `http://100.68.217.61/`: không xuất hiện thanh cuộn ngang bảng trên mobile, mở `WorkflowDetailModal` mượt mà.

---

## 8. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Sử dụng `usePreferences().isMobile` để đồng bộ trạng thái mobile nhất quán với toàn bộ hệ thống Layout và `useVbenVxeGrid`.
  - Sử dụng `WORKFLOW_STATUS_META` và `CAMPAIGN_STATUS_META` từ `#/constants` thay vì chuỗi trạng thái hardcode.
  - Tuân thủ chuẩn `Sentence case` tiếng Việt và hệ thống 7 bậc chữ (`text-2xs` đến `text-2xl`, cấm `text-[13px]`).
  - Chạy `pnpm run build:local` để kiểm thử trực tiếp trên Tailscale (`http://100.68.217.61/`).
- **Ask first:**
  - Thêm các thao tác ghi dữ liệu (như xóa kịch bản, chỉnh sửa JSON kịch bản trực tiếp trên Admin Console).
- **Never:**
  - Không tự ý điều hướng sang `/automation/jobs` khi người dùng bấm xem chi tiết quy trình tại `/automation/workflows`.
  - Không chạy `git push` hoặc kích hoạt GitHub Actions CI/CD khi chưa có yêu cầu.

---

## 9. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1:** Trên màn hình điện thoại (`< 640px`), bảng `/automation/workflows` và `/automation/jobs` tự động ẩn các cột phụ và gộp thông tin cần thiết vào ô chính + cột thao tác gọn nhẹ, vừa khít chiều ngang `375px` (không cuộn ngang).
- [x] **SC2:** Thanh lọc tìm kiếm của `/automation/workflows` và `/automation/jobs` được thu gọn trên mobile (`hideLabel` khi `isMobile`), giúp danh sách dữ liệu xuất hiện ngay trong vùng nhìn đầu tiên (above the fold).
- [x] **SC3:** Trang `/automation/workflows` có chức năng xem chi tiết quy trình (`WorkflowDetailModal` dùng `Dialog` + lưới thông số Mobile-First + sao chép ID) theo đúng chuẩn baseline của hệ thống.
- [x] **SC4:** Trang `/automation/jobs/:id` hiển thị thông tin phiên chạy và cửa sổ log terminal gọn gàng trên màn hình dọc điện thoại.
- [x] **SC5:** `pnpm run check:i18n`, `typecheck`, `lint`, `test:unit`, và `build:local` pass 100% với `0 errors`.
