---
name: shadcn-compound-clean
description: Hướng dẫn và quy chuẩn rà soát, dọn dẹp mã nguồn UI toàn diện cho TOÀN BỘ các component Shadcn-Vue (Reka UI). Chuyển đổi về chuẩn Compound Components (Composable UI Primitives), tối giản utility-class, cấm nhồi nhét padding/border/font/flex/color thủ công lên Card, Button, Input, Form, Dialog, Badge, Alert, Tabs, Select, Sheet, Table, v.v.
metadata:
  author: Tuquet Engineering Team
  version: "2.0.0"
  framework: Vue 3 + Tailwind CSS + Shadcn-Vue (Reka UI)
---

# Toàn Diện Chuẩn Compound Components & Zero Utility Clutter Cho Mọi Shadcn UI Primitives

Tài liệu này là quy chuẩn bắt buộc áp dụng khi authoring hoặc audit/refactor UI trên toàn bộ dự án (`console/apps/workstation`, `packages/@core/ui-kit`).

---

## 1. Triết Lý & Nguyên Tắc Tối Thượng (Golden Principles)

1. **Hiểu rõ Component Defaults (Tôn trọng thiết kế gốc):**
   - Mọi component trong Shadcn-Vue (`packages/@core/ui-kit/shadcn-ui/src/ui/*`) đã được tích hợp sẵn:
     - Biến thể màu sắc (`bg-*`, `text-*`, `border-*`) theo chuẩn CSS design tokens (`hsl(var(--...))`).
     - Hiệu ứng tương tác: `hover:`, `focus-visible:`, `active:`, `disabled:opacity-50`, `aria-invalid:`.
     - Kích thước & Khoảng cách (padding, gap, radius, shadow) tối ưu chuẩn UX hệ thống.
   - **Quy tắc vàng:** Không bao giờ truyền lại một class mà component con đã sở hữu mặc định!

2. **Compound Component Pattern (Phân cấp ngữ nghĩa thay vì nhồi class):**
   - Luôn sử dụng đúng cây phân cấp của từng họ component (`*Root`, `*Header`, `*Title`, `*Description`, `*Action`, `*Content`, `*Footer`, `*Item`, `*Trigger`).
   - Tận dụng cơ chế layout tự động (`data-slot`, CSS container queries, subgrid/grid) mà Shadcn đã cài đặt sẵn giữa các sub-components.

3. **Variants First qua Props (Thay vì viết đè CSS thủ công):**
   - Khi cần đổi màu, độ lớn hoặc trạng thái: Sử dụng prop `variant="..."` hoặc `size="..."`.
   - Tuyệt đối không dùng class tùy tiện (như `bg-red-500 text-white rounded-md` thay vì `variant="destructive"`).

---

## 2. Quy Chuẩn Chi Tiết Từng Nhóm Component (All Shadcn Primitives)

### 2.1. Card & Container Layout (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`)
- ❌ **Anti-Pattern:**
  ```vue
  <Card class="rounded-xl border border-border/60 bg-card shadow-sm p-4">
    <CardHeader class="flex flex-row items-center justify-between p-4 pb-2">
      <CardTitle class="text-base font-semibold text-foreground">Tiêu đề</CardTitle>
      <Button class="ml-auto" size="sm">Nút</Button>
    </CardHeader>
    <CardContent class="p-4 pt-0">Nội dung</CardContent>
  </Card>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <Card>
    <CardHeader>
      <CardTitle class="text-base">Tiêu đề</CardTitle>
      <CardDescription>Mô tả ngắn</CardDescription>
      <CardAction>
        <Button variant="ghost" size="sm">Nút</Button>
      </CardAction>
    </CardHeader>
    <CardContent>Nội dung</CardContent>
  </Card>
  ```
  *(CardHeader tự động chia cột và đẩy CardAction sang góc phải mà không cần flexbox/margin)*.

---

### 2.2. Button & Action Primitives (`Button`, `Toggle`, `ToggleGroup`)
- Mặc định đã có: `font-medium`, `focus-visible:ring-*`, `rounded-md`, `h-9 px-4 py-2`, `transition-all`.
- ❌ **Anti-Pattern:**
  ```vue
  <Button class="bg-red-600 text-white hover:bg-red-700 px-3 py-1 text-sm rounded-lg flex items-center gap-1 font-semibold">
    <Trash class="w-4 h-4" />
    <span>Delete</span>
  </Button>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <Button variant="destructive" size="sm" class="gap-1.5">
    <Trash class="size-4" />
    <span>Delete</span>
  </Button>
  ```

---

### 2.3. Form, Inputs & Labels (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `Input`, `Textarea`, `Select`)
- Mặc định `FormItem` đã có: `space-y-2` (hoặc grid gap chuẩn).
- Mặc định `Input` / `Textarea` đã có: `border border-input bg-transparent rounded-md px-3 py-1 shadow-sm placeholder:text-muted-foreground focus-visible:ring-1`.
- ❌ **Anti-Pattern:**
  ```vue
  <div class="flex flex-col mb-4">
    <label class="text-sm font-medium text-foreground mb-1 block">Tên người dùng</label>
    <input class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
    <span class="text-xs text-red-500 mt-1">Lỗi nhập liệu</span>
  </div>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <FormItem>
    <FormLabel>Tên người dùng</FormLabel>
    <FormControl>
      <Input placeholder="Nhập tên..." />
    </FormControl>
    <FormDescription>Tên hiển thị công khai trên hệ thống.</FormDescription>
    <FormMessage />
  </FormItem>
  ```

---

### 2.4. Dialog & Modal Primitives (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `AlertDialog`)
- Mặc định `DialogContent` đã có: `fixed z-50 bg-background p-6 shadow-lg rounded-lg border w-full max-w-lg`.
- Mặc định `DialogHeader` đã có: `flex flex-col space-y-1.5 text-center sm:text-left`.
- Mặc định `DialogFooter` đã có: `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`.
- ❌ **Anti-Pattern:**
  ```vue
  <DialogContent class="bg-card border border-border p-6 rounded-2xl max-w-md mx-auto shadow-2xl">
    <div class="flex items-center justify-between border-b pb-4 mb-4">
      <h2 class="text-lg font-bold text-foreground">Xác nhận</h2>
    </div>
    <div class="py-4">Nội dung</div>
    <div class="flex justify-end gap-2 pt-4 border-t">...</div>
  </DialogContent>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Xác nhận</DialogTitle>
      <DialogDescription>Hành động này không thể hoàn tác.</DialogDescription>
    </DialogHeader>
    <div class="py-2">Nội dung</div>
    <DialogFooter>
      <Button variant="outline">Hủy</Button>
      <Button variant="destructive">Tiếp tục</Button>
    </DialogFooter>
  </DialogContent>
  ```

---

### 2.5. Badges & Tags (`Badge`)
- Mặc định đã có: `rounded-full border px-2.5 py-0.5 text-xs font-semibold inline-flex items-center`.
- ❌ **Anti-Pattern:**
  ```vue
  <Badge class="bg-emerald-500 text-white rounded-full px-2 py-0.5 text-xs font-medium">
    Hoạt động
  </Badge>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <Badge variant="success">Hoạt động</Badge>
  <!-- hoặc với outline status -->
  <Badge variant="outline">
    <span class="mr-1.5 size-1.5 rounded-full bg-success"></span>
    Hoạt động
  </Badge>
  ```

---

### 2.6. Tabs & Navigation (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`)
- Mặc định `TabsList` đã có: `inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground`.
- Mặc định `TabsTrigger` đã có: `rounded-md px-3 py-1 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs`.
- ❌ **Anti-Pattern:**
  ```vue
  <TabsList class="bg-gray-100 p-1 rounded-xl flex gap-2 border">
    <TabsTrigger class="px-4 py-2 font-semibold text-sm active:bg-white rounded-lg">Tab 1</TabsTrigger>
  </TabsList>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <Tabs default-value="account">
    <TabsList>
      <TabsTrigger value="account">Tài khoản</TabsTrigger>
      <TabsTrigger value="password">Mật khẩu</TabsTrigger>
    </TabsList>
    <TabsContent value="account">...</TabsContent>
  </Tabs>
  ```

---

### 2.7. Alerts & Notification Banners (`Alert`, `AlertTitle`, `AlertDescription`)
- Mặc định `Alert` đã có: `relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] gap-x-3 gap-y-0.5`.
- ❌ **Anti-Pattern:**
  ```vue
  <div class="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900">
    <AlertCircle class="w-5 h-5 text-red-600 mt-0.5" />
    <div>
      <h5 class="font-bold">Lỗi kết nối</h5>
      <p class="text-sm">Không thể kết nối đến máy chủ.</p>
    </div>
  </div>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <Alert variant="destructive">
    <AlertCircle class="size-4" />
    <AlertTitle>Lỗi kết nối</AlertTitle>
    <AlertDescription>Không thể kết nối đến máy chủ.</AlertDescription>
  </Alert>
  ```

---

### 2.8. Dropdown & Context Menu (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`)
- Mặc định `DropdownMenuContent` đã có: `z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in`.
- ❌ **Anti-Pattern:**
  ```vue
  <DropdownMenuContent class="bg-white border rounded-xl shadow-2xl p-2 min-w-[200px]">
    <DropdownMenuItem class="px-3 py-2 text-sm hover:bg-gray-100 rounded-lg cursor-pointer flex items-center gap-2">
      ...
    </DropdownMenuItem>
  </DropdownMenuContent>
  ```
- ✅ **Chuẩn Compound Clean:**
  ```vue
  <DropdownMenuContent align="end">
    <DropdownMenuItem @select="...">
      <Edit class="size-4 mr-2" />
      <span>Chỉnh sửa</span>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">
      <Trash class="size-4 mr-2" />
      <span>Xóa</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
  ```

---

## 3. Quy Trình Rà Soát Toàn Bộ Dự Án (Audit & Clean Workflow)

Khi tiến hành quét bất kỳ file `.vue` nào trong dự án, áp dụng quy trình 4 bước:

1. **Bước 1: Quét các thẻ Primitive gốc:**
   - Tìm kiếm `<Card`, `<Button`, `<DialogContent`, `<Badge`, `<Alert`, `<Input`, `<TabsList`.
2. **Bước 2: Đối chiếu & Xóa bỏ các class trùng lặp:**
   - Xóa các thuộc tính: `rounded-*`, `border-*`, `bg-*`, `shadow-*`, `font-*`, `text-*` khi chúng chỉ nhằm lặp lại màu nền hoặc font mặc định của component.
3. **Bước 3: Chuyển đổi cấu trúc HTML tự chế về Compound Sub-components:**
   - Thay các `div flex justify-between items-center` trong Header thành `<CardHeader>` + `<CardTitle>` + `<CardAction>`.
   - Thay các cụm `div` popup tự viết bằng `<DialogHeader>`, `<DialogFooter>`.
4. **Bước 4: Sử dụng `variant` và `size` thay cho Utility Classes:**
   - Chuyển toàn bộ CSS màu sắc tự gõ về biến thể ngữ nghĩa (`default`, `secondary`, `outline`, `destructive`, `ghost`, `link`).
