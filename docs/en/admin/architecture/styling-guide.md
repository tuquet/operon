# Hướng Dẫn Thiết Kế Giao Diện & Design Tokens (UI Styling Guide)

> **Mã tài liệu:** `ARCH-STYLING-GUIDE`  
> **Áp dụng cho:** `operon/admin` (`apps/web-admin`)  
> **Tài liệu kiến trúc tổng thể:** [`docs/architecture/overview.md`](overview.md)  

Tài liệu này là **Quy chuẩn Thiết kế Giao diện (SSOT)** áp dụng cho toàn bộ các màn hình, components và views trong hệ thống **Admin**.

Mục tiêu cốt lõi: Đảm bảo mọi màn hình khi lập trình viên hoặc AI Agent xây dựng đều **tự động tương thích 100%** với:

1. Cả 2 chế độ **Light Mode** & **Dark Mode**.
2. Toàn bộ **14 Chế độ Màu sắc Built-in** (Blue, Violet, Pink, Green, Zinc, Rose, Orange, Deep-blue...) và màu Custom tùy biến.
3. Độ tương phản hoàn hảo (không bao giờ xảy ra lỗi chữ đen trên nền đen hoặc chữ trắng trên nền trắng).

---

## 1. Cơ Chế Hoạt Động Của Chế Độ Màu Sắc Built-in

Hệ thống màu của Admin sử dụng kiến trúc CSS Variables (HSL) động được quản lý bởi `@operon/preferences` và `@operon-core/shared/color`:

1. **Preset Nguồn:** Được định nghĩa tại `packages/@core/preferences/src/constants.ts` với 14 bộ màu cơ bản (`default`, `violet`, `pink`, `yellow`, `sky-blue`, `green`, `zinc`, `deep-green`, `deep-blue`, `orange`, `rose`, `neutral`, `slate`, `gray`).
2. **Bộ sinh màu động (Color Generator):** Khi người dùng chọn một Preset hoặc nhập mã Hex tùy chọn, hàm `generatorColorVariables` (`packages/@core/base/shared/src/color/generator.ts`) phân tích màu qua thư viện `theme-colors` để sinh ra toàn bộ dải sắc thái:
   - `--primary-50`, `--primary-100`, ..., `--primary-500` (Main), ..., `--primary-950`
   - Ghi đè trực tiếp các biến `--primary`, `--primary-hover`, `--primary-active` vào thẻ `:root` (hoặc `html[data-theme="..."]`).
3. **Cơ chế Dark/Light Mode:** Khi đổi Dark Mode, class `.dark` được thêm vào thẻ `<html>`, kích hoạt bộ tokens từ `packages/@core/base/design/src/design-tokens/dark.css`.

---

## 2. Bảng Tra Cứu Classes Chuẩn (Semantic Tokens Cheat Sheet)

> [!IMPORTANT] **Quy tắc Bất Biến (Golden Invariant):** **TUYỆT ĐỐI KHÔNG** sử dụng các class gán cứng màu sắc của Tailwind như:
>
> - ❌ `bg-white`, `bg-black`, `bg-gray-100`, `bg-gray-50`
> - ❌ `text-gray-900`, `text-black`, `text-gray-500`
> - ❌ `border-gray-200`, `border-gray-300`
> - ❌ `bg-blue-600`, `bg-blue-500` (làm mất tác dụng của Built-in theme khi người dùng chọn màu khác)
>
> **LUÔN DÙNG** các Semantic Design Tokens dưới đây:

### 2.1. Nền (Backgrounds)

| Mục đích sử dụng | Class Chuẩn | Hiển thị Light Mode | Hiển thị Dark Mode |
| :-- | :-- | :-- | :-- |
| **Nền trang chính** | `bg-background` | Trắng tinh (`#ffffff`) | Đen tối (`hsl(0 0% 3.9%)`) |
| **Nền phụ / Vùng chìm** | `bg-background-deep` | Xám rất nhạt (`hsl(216 20% 95%)`) | Đen tối tương đồng |
| **Thẻ Card / Container / Modal** | `bg-card` | Nền trắng của Card | Đen Card cao cấp |
| **Hộp Popover / Dropdown Menu** | `bg-popover` | Trắng tinh | Đen tối |
| **Nền phụ nhạt / Pill / Skeleton** | `bg-muted` | Xám nhạt (`hsl(240 4.8% 95.9%)`) | Xám đen mờ (`hsl(240 3.7% 15.9%)`) |
| **Nền vùng tương tác Hover** | `hover:bg-accent` hoặc `hover:bg-muted` | Nhấn nhẹ màu xám sáng | Nhấn nhẹ màu xám tối |

### 2.2. Chữ (Typography / Foregrounds)

| Mục đích sử dụng | Class Chuẩn | Hiển thị Light Mode | Hiển thị Dark Mode |
| :-- | :-- | :-- | :-- |
| **Chữ chính (Tiêu đề, body text)** | `text-foreground` | Xám đen đậm (`hsl(210 6% 21%)`) | Trắng xám (`hsl(0 0% 98%)`) |
| **Chữ trong thẻ Card** | `text-card-foreground` | Xám đen | Trắng sáng |
| **Chữ phụ / Chú thích / Metadata** | `text-muted-foreground` | Xám trung tính (`#71717a`) | Xám bạc nhạt (`hsl(240 5% 64.9%)`) |
| **Placeholder trong Input** | Tự động qua component hoặc `placeholder:text-muted-foreground` | Xám nhạt | Xám tối |

### 2.3. Đường Viền & Phân Cách (Borders & Dividers)

| Mục đích sử dụng | Class Chuẩn | Ghi chú |
| :-- | :-- | :-- |
| **Viền mặc định** | `border border-border` | Chuẩn cho Card, Table, Input, Divider |
| **Viền thanh mảnh, tinh tế** | `border border-border/60` | Khuyên dùng cho viền Card/Table phong cách Shadcn |
| **Đường kẻ ngang phân cách** | `divide-y divide-border` | Dùng trong danh sách `<ul>` hoặc bảng dữ liệu |

### 2.4. Điểm Nhấn & Nút Bấm (Primary & Built-in Colors)

| Mục đích sử dụng | Class Chuẩn | Cơ chế hoạt động |
| :-- | :-- | :-- |
| **Nút bấm chính (Button)** | `bg-primary text-primary-foreground` | Tự động nhận màu Built-in người dùng đang chọn |
| **Hover nút chính** | `hover:bg-primary/90` | Làm đậm/sáng nhẹ màu primary khi rê chuột |
| **Text màu chủ đạo** | `text-primary hover:text-primary/80` | Link, biểu tượng hoặc text cần nhấn mạnh |
| **Badge viền màu chủ đạo** | `bg-primary/10 text-primary border border-primary/20` | Tạo Badge đẹp mắt theo đúng theme hiện tại |

### 2.5. Trạng Thái Hệ Thống (Semantic Status Colors)

| Trạng thái | Class Icon / Text | Class Badge / Nền |
| :-- | :-- | :-- |
| **Thành công (Active / Online)** | `text-success` | `bg-success/10 text-success border-success/20` |
| **Cảnh báo (Pending / Warning)** | `text-warning` | `bg-warning/10 text-warning border-warning/20` |
| **Lỗi / Xóa (Destructive / Offline)** | `text-destructive` | `bg-destructive text-destructive-foreground` hoặc `bg-destructive/10 text-destructive` |
| **Thông tin (Info)** | `text-info` | `bg-info/10 text-info` |

### 2.6. Bảng Dữ Liệu `useVbenVxeGrid` & Biểu Mẫu `VxeForm`

Toàn bộ bảng dữ liệu và biểu mẫu sử dụng adapter `src/adapter/vxe-table.ts` (xem) được đồng bộ hóa với hệ thống biến CSS HSL tại `packages/effects/plugins/src/vxe-table/style.css`:

- Đường kẻ phân tách bảng: `--vxe-ui-table-border-color: hsl(var(--border) / 40%)`
- Đường kẻ kéo giãn cột: `--vxe-ui-table-resizable-line-color: hsl(var(--border) / 50%)`
- Nền header & dòng dữ liệu: tự động nhận `--card`, `--muted`, `--foreground` theo Light/Dark Mode và 14 Built-in Themes.

### 2.7. Biểu Đồ Dữ Liệu (`AreaChart`, `DonutChart`, `BarChart` & `--chart-1..5`)

Toàn bộ biểu đồ trong `@operon-core/shadcn-ui` (`AreaChart`, `DonutChart`, `BarChart`) sử dụng hàm `defaultColors()` trả về 5 biến CSS ngữ nghĩa `['hsl(var(--chart-1))', ..., 'hsl(var(--chart-5))']` thay cho mã màu Hex cố định:

- Khi người dùng đổi bất kỳ chủ đề nào trong **14 Built-in Themes** hoặc **Custom**, `updateCSSVariables` (`packages/@core/preferences/src/update-css-variables.ts`) tự động sinh 5 sắc độ `--chart-1` .. `--chart-5` đồng điệu với màu chủ đề (sắc độ `--primary-500/400/600/300/700` cho nhóm chủ đề có màu, và thang 5 bậc độ sáng tương phản cao cho nhóm chủ đề đơn sắc `zinc`, `neutral`, `slate`, `gray`).
- **Quy tắc bắt buộc:** Không truyền mảng `:colors="['#38bdf8', ...]"` gán cứng mã Hex vào các biểu đồ Dashboard để biểu đồ luôn tự động chuyển màu theo Built-in Theme.

### 2.8. Logo SVG Động & Hệ Thống Icon Lucide Đồng Bộ Built-in Theme (SSOT)

1. **SVG Logo (`VbenLogo` & `AuthPageLayout`):**
   - Khi `src` là `/logo.svg`, `/logo-app.svg`, hoặc rỗng, `VbenLogo` (`packages/@core/ui-kit/shadcn-ui/src/components/logo/logo.vue`) dựng trực tiếp thẻ `<svg>` inline: ở **Dark Mode** (`theme === 'dark'`) hiển thị dải màu **Trắng sứ (Porcelain White)** (`#FAFAFA` $\rightarrow$ `#E4E4E7` $\rightarrow$ `#A1A1AA`) nổi bật sắc nét trên nền tối; ở **Light Mode** sử dụng `<linearGradient>` 3 điểm (`hsl(var(--chart-4))` $\rightarrow$ `hsl(var(--chart-1))` $\rightarrow$ `hsl(var(--chart-3))`) và hào quang `hsl(var(--primary) / 0.22)` theo Built-in Theme.
2. **Hệ thống Icon Lucide (`internal/tailwind-config/src/theme.css`, `menu-ui`, `tabs-ui`):**
   - Toàn bộ hộp chứa icon không phải nút bấm (`:is(.bg-muted, .bg-muted\/50, .bg-muted\/40):not(button, [role='button'], a):has(> svg.lucide:only-child)`) và các icon `svg.lucide` độc lập được đồng bộ tập trung về `hsl(var(--primary))` và `hsl(var(--primary) / 10%)` ngay tại `internal/tailwind-config/src/theme.css` mà không cần sửa thủ công từng file View.
   - Menu và Tabbar đang active ở cả Light và Dark mode đều sử dụng `hsl(var(--primary))` và nền `hsl(var(--primary) / 15%)`.

---

## 3. Khuôn Mẫu Thực Hành Chuẩn (Component Boilerplate)

Khi tạo một trang mới hoặc component mới, hãy áp dụng cấu trúc chuẩn sau:

```vue
<template>
  <div class="space-y-6 p-4 md:p-6">
    <!-- Header của trang -->
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">
          Tên Màn Hình
        </h1>
        <p class="text-sm text-muted-foreground">
          Mô tả ngắn gọn chức năng của trang tại đây.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Nút phụ -->
        <button
          class="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Xuất dữ liệu
        </button>

        <!-- Nút chính (Tự động thích ứng theme) -->
        <button
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          Thêm mới
        </button>
      </div>
    </div>

    <!-- Khối nội dung chính (Card) -->
    <div
      class="rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs"
    >
      <div class="border-b border-border/60 p-6">
        <h3 class="text-lg font-semibold text-foreground">
          Thông tin tổng hợp
        </h3>
      </div>

      <div class="p-6">
        <span
          class="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success border border-success/20"
        >
          Đang hoạt động
        </span>
      </div>
    </div>
  </div>
</template>
```

---

## 4. Danh Sách Tự Kiểm Tra (Self-Checklist)

- [ ] **Test Dark Mode:** Chuyển giao diện sang Dark Mode $\rightarrow$ Không có khối nào bị nền trắng toát hoặc chữ bị chìm vào nền.
- [ ] **Test Built-in Color:** Mở Preferences Drawer $\rightarrow$ Đổi Built-in sang `Green`, `Rose`, `Zinc` $\rightarrow$ Toàn bộ các nút bấm và điểm nhấn chính đổi màu đồng bộ theo theme.
- [ ] **Clean Code:** Không có bất kỳ class màu cố định nào (`text-gray-*`, `bg-white`, `bg-blue-*`) tồn tại trong template.
