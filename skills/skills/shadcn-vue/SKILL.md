---
name: shadcn-vue
description: Official and standardized Shadcn-Vue conventions for Operon Console, Workstation, and UI kit. Use when creating or refactoring UI components, pages, dialogs, forms, badges, buttons, cards, toasts, or sheets. Enforces strict compound component structure, clean import paths, consistent design tokens, and Reka UI headless standards.
metadata:
  author: Operon Engineering Team
  version: "2.0.0"
  framework: Vue 3 + Tailwind CSS + Shadcn-Vue (Reka UI)
---

# UI Component & Shadcn-Vue Architecture Standards

Standardized architecture, imports, and component conventions for `@operon/workstation` (`apps/workstation`, `packages/@core/ui-kit`, and `packages/effects`).

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Tuyệt đối KHÔNG tự sáng tác/bịa component hoặc props:**
   - Trong `@operon-core/shadcn-ui` (`packages/@core/ui-kit/shadcn-ui/src/ui/`), chỉ sử dụng các component và props đã được định nghĩa theo chuẩn Reka UI / Shadcn.
   - Không bịa đặt các prop kiểu monolithic như `isOpen`, `content`, `actions`, `footer`, `title` trực tiếp lên component Root.

2. **Single Source of Truth (SSOT) cho Imports:**
   - **UI Primitives:** Import từ `@operon-core/shadcn-ui` (e.g. `Button`, `Badge`, `Card`, `Dialog`, `Sheet`, `Select`, `Input`, `Tooltip`).
   - **Composite Layouts & Schema Forms:** Import từ `@operon/common-ui`, `@operon/layouts`.
   - **Utility Merging:** Luôn dùng `cn(...)` từ `@operon-core/shared/utils`.

3. **Cài đặt component mới qua CLI chuẩn:**
   - Nếu cần component mới chưa có trong `@operon-core/shadcn-ui`, sử dụng lệnh chuẩn:
     ```bash
     npx shadcn-vue@latest add <component-name>
     ```
     Tuyệt đối không tự gõ lại wrapper thủ công từ đầu.

---

## 2. Quy Tắc Compound Component (Headless Composability)

Luôn tuân thủ cấu trúc phân cấp ngữ nghĩa của **Reka UI / Shadcn**:

### 2.1. Dialog Component
```vue
<Dialog :open="open" @update:open="(val) => (open = val)">
  <DialogTrigger as-child>
    <Button variant="outline">Mở Dialog</Button>
  </DialogTrigger>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Xác nhận xóa</DialogTitle>
      <DialogDescription>Hành động này không thể hoàn tác.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose as-child>
        <Button variant="outline">Hủy</Button>
      </DialogClose>
      <Button variant="destructive" @click="handleConfirm">Xác nhận</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 2.2. Sheet Component (Drawer)
```vue
<Sheet :open="isOpen" @update:open="(val) => (isOpen = val)">
  <SheetTrigger as-child>
    <Button variant="ghost" size="icon"><Menu class="size-4" /></Button>
  </SheetTrigger>
  <SheetContent side="right" class="sm:max-w-xl">
    <SheetHeader>
      <SheetTitle>Chi tiết bản ghi</SheetTitle>
      <SheetDescription>Xem và chỉnh sửa cấu hình hệ thống.</SheetDescription>
    </SheetHeader>
    <div class="py-4">
      <!-- Nội dung body -->
    </div>
    <SheetFooter>
      <SheetClose as-child>
        <Button variant="outline">Đóng</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### 2.3. Select Component
```vue
<Select v-model="selectedValue" @update:model-value="handleSelectChange">
  <SelectTrigger class="w-[180px]">
    <SelectValue placeholder="Chọn môi trường" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="production">Production</SelectItem>
    <SelectItem value="staging">Staging</SelectItem>
    <SelectItem value="development">Development</SelectItem>
  </SelectContent>
</Select>
```

### 2.4. DropdownMenu Component
```vue
<DropdownMenu>
  <DropdownMenuTrigger as-child>
    <Button variant="ghost" size="icon"><MoreHorizontal class="size-4" /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem @click="handleEdit">Chỉnh sửa</DropdownMenuItem>
    <DropdownMenuItem class="text-destructive" @click="handleDelete">Xóa</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 3. Quản Lý Style, Variants & Events

### 3.1. Phân cấp Style đúng vị trí
- Không bọc `class` tùy tiện vào component gốc nếu component đó cung cấp slot riêng (ví dụ: style kích thước trên `<DialogContent class="sm:max-w-lg">`, không style kích thước lên `<Dialog>`).
- Sử dụng tiện ích `cn(...)` từ `@operon-core/shared/utils` khi merge Tailwind classes.

### 3.2. Ưu tiên Variants First qua CVA Props
- Không viết đè CSS màu sắc/kích thước thủ công:
  - ❌ *Anti-Pattern:* `<Button class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs">Xóa</Button>`
  - ✅ *Chuẩn:* `<Button variant="destructive" size="sm">Xóa</Button>`
  - ❌ *Anti-Pattern:* `<span class="border border-green-500 bg-green-50 text-green-700 font-mono text-xs px-2 py-0.5 rounded">Active</span>`
  - ✅ *Chuẩn:* `<Badge variant="outline" class="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">Active</Badge>`

### 3.3. Chuẩn hóa Event Primitives (Reka UI Event Contracts)
- **Trạng thái đóng/mở:** Luôn dùng `v-model:open="isOpen"` hoặc `@update:open="(val: boolean) => ..."` (Không tự chế `@change`, `@toggle`, `@visible-change`).
- **Trạng thái chọn giá trị:** Luôn dùng `v-model="modelValue"` hoặc `@update:model-value="(val: string) => ..."`.
- **Slot Passthrough (`as-child`):** Khi bọc Trigger hoặc Close quanh custom Button/IconButton, luôn thêm thuộc tính `as-child` để tránh lồng 2 thẻ `<button>` vào nhau.

---

## 4. Bảng Tra Cứu Nhanh Đối Soát Codebase

| UI Primitive | Import Path | Sub-Components Bắt Buộc | Event Binding Chuẩn |
| :--- | :--- | :--- | :--- |
| **Dialog** | `@operon-core/shadcn-ui` | `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | `v-model:open` / `@update:open` |
| **Sheet** | `@operon-core/shadcn-ui` | `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose` | `v-model:open` / `@update:open` |
| **Select** | `@operon-core/shadcn-ui` | `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | `v-model` / `@update:model-value` |
| **Dropdown** | `@operon-core/shadcn-ui` | `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` | `v-model:open` |
| **Badge** | `@operon-core/shadcn-ui` | `Badge` (variant: `default`, `secondary`, `outline`, `destructive`) | N/A |
| **Button** | `@operon-core/shadcn-ui` | `Button` (variant: `default`, `outline`, `secondary`, `destructive`, `ghost`, `link`) | `@click` |

---

## 5. Verification Gate Trước Khi Commit

Mọi thay đổi UI phải đạt:
```bash
# 1. Typecheck
pnpm check:type

# 2. Format & Lint (0 errors, 0 warnings)
pnpm run format
```
