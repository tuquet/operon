# Spec: VXE Cell Renderers & Standard Form Reducers (SPEC-vxe-cell-renderers)

## Objective

Tối giản chi phí bảo trì mã nguồn tại tất cả các trang danh sách và tìm kiếm trong `apps/web-admin`. Thay thế hàng loạt `<template #slot-name>` thủ công lặp đi lặp lại bằng hệ thống **VXE Cell Renderers** và **Formatters** có sẵn được cấu hình tập trung tại [`apps/web-admin/src/adapter/vxe-table.ts`](apps/web-admin/src/adapter/vxe-table.ts).

Mục tiêu chính:

1. Xóa bỏ ít nhất 80% code boilerplate template slot (`#date-cell`, `#id-cell`, `#status-cell`, `#tag-cell`, `#price-cell`).
2. Khai báo cột dạng cấu hình declarative: `cellRender: { name: 'CellDate' }` hoặc `formatter: 'formatDate'`.
3. Giữ trọn vẹn thẩm mỹ Shadcn Slate/Zinc Design System và khả năng tương tác (Copy UUID, Dot status, Click detail sheet).

## Tech Stack

- Vue 3 + TypeScript
- `@operon/plugins/vxe-table` + `vxe-pc-ui` renderer API (`vxeUI.renderer.add`)
- `@operon/vue-ui` (Badge, Button, Tooltip) + `@operon/icons` (Lucide)
- Vitest cho Unit Tests

## Commands

- Build: `pnpm run build:admin`
- Typecheck: `pnpm --filter @operon/admin-web run typecheck`
- Test: `pnpm --filter @operon/admin-web run test`
- Lint: `npx oxlint apps/web-admin/src/`

## Project Structure

- `apps/web-admin/src/adapter/vxe-table.ts`: Đăng ký toàn bộ shared renderers và formatters qua `vxeUI.renderer.add`.
- `apps/web-admin/src/adapter/renderers/`: (Tùy chọn nếu cần tách module) các cell renderer logic thuần túy.
- `apps/web-admin/src/views/**/index.vue`: Áp dụng `cellRender` thay cho `<template #...>` slots.
- `apps/web-admin/src/adapter/__tests__/vxe-renderers.test.ts`: Kiểm thử renderer & formatters.

## Code Style & API Design

### Trước (Anti-pattern: Template Slot Explosion)

```vue
<!-- Column config -->
{ field: 'created_at', title: 'Ngày tạo', slots: { default: 'date-cell' } } {
field: 'id', title: 'ID', slots: { default: 'id-cell' } }

<!-- Template slots: Lặp lại ở 10+ màn hình -->
<template #date-cell="{ row }">
  <span class="text-xs text-muted-foreground">{{
    formatDate(row.created_at)
  }}</span>
</template>
<template #id-cell="{ row }">
  <code class="text-xs">{{ row.id.slice(0, 8) }}...</code>
  <Button @click="copy(row.id)"><Copy /></Button>
</template>
```

### Sau (Declarative Standard VXE Renderer)

```ts
// Column config - 1 dòng duy nhất, không cần bất kỳ <template> nào
{
  field: 'created_at',
  title: $t('common.createdAt'),
  cellRender: { name: 'CellDate' },
},
{
  field: 'id',
  title: 'ID',
  cellRender: { name: 'CellIdCopy' },
},
{
  field: 'status',
  title: $t('common.status'),
  cellRender: {
    name: 'CellStatus',
    props: {
      statusMap: {
        active: { variant: 'success', label: 'Hoạt động' },
        disabled: { variant: 'muted', label: 'Tắt' },
      }
    }
  }
}
```

### Bộ Renderers Cốt Lõi Được Đăng Ký Tập Trung:

1. `CellDate`: Tự format timestamp/ISO string sang `YYYY-MM-DD HH:mm:ss`, font mono, text-muted-foreground.
2. `CellIdCopy`: Hiển thị short UUID `xxxxxxxx...xxxx` kèm nút copy và tooltip 1 chạm.
3. `CellStatus`: Badge có dot trạng thái với semantic color tokens (`success`, `warning`, `destructive`, `muted`).
4. `CellPrice`: Format số tiền tệ `$X.XX/mo` hoặc VNĐ theo cấu hình chuẩn.
5. `CellTags`: Render mảng tags/roles dạng danh sách badges nhỏ gọn.

## Testing Strategy

- Unit test với Vitest kiểm tra output VNode của từng renderer (`CellDate`, `CellIdCopy`, `CellStatus`).
- Test kiểm tra clipboard write text cho `CellIdCopy`.
- Chạy toàn bộ bộ test hiện có để đảm bảo không hồi quy: `pnpm check:type`.

## Boundaries

- **Always do**:
  - Tận dụng `vxeUI.renderer.add` và `vxeUI.formats.add` chuẩn của VXE Table.
  - Giữ lại `<template #slot>` chỉ cho những cell đặc thù phức tạp không thể tái sử dụng (như Avatar + Email đa tầng của User).
  - Đảm bảo tương thích hoàn toàn với Mobile Detail Sheet (`VxeRowDetailSheet`).
- **Ask first**:
  - Xóa bỏ hoặc thay đổi cấu trúc data model trả về từ Supabase queries.
- **Never do**:
  - Không bọc thêm 1 wrapper component nặng nề quanh VXE Grid.
  - Không phá vỡ quy chuẩn Semantic Design Tokens và Lucide Icons.

## Success Criteria

1. Đăng ký thành công các Cell Renderers dùng chung vào `apps/web-admin/src/adapter/vxe-table.ts`.
2. Áp dụng chuyển đổi thành công trên ít nhất 2 trang tiêu biểu (`system/plugins` và `system/users` hoặc `system/subscriptions`), loại bỏ thành công hơn 100 dòng template slot dư thừa.
3. `pnpm check:type` đạt 0 lỗi.
4. `pnpm run build:admin` hoàn thành thành công.

## Open Questions

1. Có muốn chuẩn hóa luôn cả `CellPrice` và `CellBadgeList` ngay trong đợt này, hay tập trung trước vào 3 renderer phổ biến nhất (`CellDate`, `CellIdCopy`, `CellStatus`)?
