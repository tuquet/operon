# Spec: Tính Nhất Quán Bố Cục, Đồng Bộ Màu Biểu Đồ, Logo SVG & Icon Lucide Theo Built-in Theme (`layout-preferences-coherence`)

> **Mã đặc tả:** `SPEC-layout-preferences-coherence`  
> **Module id:** `layout-preferences-coherence` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`docs/architecture/styling-guide.md`](../architecture/styling-guide.md)  
> **Trạng thái:** **DRAFT — CHỜ PHÊ DUYỆT MỞ RỘNG ĐỒNG BỘ MÀU LOGO SVG & ICON LUCIDE THEO BUILT-IN THEME**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Đảm bảo tính nhất quán tuyệt đối, khả năng đáp ứng đa thiết bị (Mobile/Tablet/Desktop), đồng bộ hóa dải màu biểu đồ (`Chart Palette`), **Logo thương hiệu SVG** và **hệ thống biểu tượng Lucide (`@lucide/vue` / `VbenIcon`)** theo chủ đề Built-in và an toàn vận hành trong hệ thống Layout & Preferences của Admin (`@operon/admin-web`, `@operon/preferences`, `@operon-core/shadcn-ui`, `@operon-core/menu-ui`, `@operon-core/tabs-ui`, `@operon/layouts`, `@operon-core/layout-ui`):

1. **Chống Khóa Cứng Giao Diện (Anti-Lockout Invariant):** Khi người dùng thay đổi bất kỳ cài đặt nào trong Preferences Drawer (tắt Header, tắt Sidebar, đổi vị trí nút Settings), hệ thống luôn bảo toàn khả năng mở lại Preferences Drawer, điều hướng trang và Đăng xuất.
2. **Bảo Toàn Khả Năng Đáp Ứng Đa Thiết Bị (Zero Horizontal Overflow & Viewport Preservation):** Khắc phục tràn ngang ở chế độ `compact` (`width: min(100%, 1200px)`), cố định thanh Footer chuẩn lề, và bảo toàn trạng thái runtime `app.isMobile` khi nhấn `resetPreferences()`.
3. **Đồng Bộ 100% Giữa Preferences Control UI và Runtime Layout:** Mọi công tắc trong Preferences Drawer phản ánh đúng trạng thái thực tế ở runtime (vô hiệu hóa kèm tooltip các tùy chọn không áp dụng cho chế độ layout hiện tại như `sidebar.enable` trong `sidebar-nav` hoặc `navigationSplit` ngoài `mixed-nav`).
4. **Đồng Bộ Hóa Màu Sắc Biểu Đồ Theo Chủ Đề Built-in (`Built-in Theme Chart Palette Sync`):**
   - Loại bỏ toàn bộ mã màu Hex gán cứng (`#38bdf8`, `#10b981`, `#a855f7`, `#94a3b8`, `#0284c7`) trong `defaultColors()` (`@operon-core/shadcn-ui`) và các biểu đồ trên trang `/dashboard/analytics` (`GrowthChart`, `PlansChart`, `PluginsChart`).
   - Tự động tính toán và cập nhật 5 biến CSS ngữ nghĩa `--chart-1` .. `--chart-5` trên `:root` mỗi khi người dùng thay đổi `theme.builtinType` (14 chủ đề có sẵn hoặc `custom`) hoặc chuyển đổi `Light / Dark Mode` trong `updateCSSVariables()`.
5. **Đồng Bộ Hóa Màu Sắc Logo SVG & Hệ Thống Icon Lucide Theo Chủ Đề Built-in (`Brand SVG Logo & Lucide Icon Theme Sync`):**
   - **Logo thương hiệu SVG (`VbenLogo` & `AuthPageLayout`):** Chuyển đổi từ thẻ `<img src="/logo.svg">` tĩnh (vốn dùng dải màu xám cứng `#FAFAFA -> #A1A1AA` và bị trình duyệt cô lập khỏi các biến CSS trên `:root`) sang **Inline SVG Logo** liên kết trực tiếp với các biến CSS chủ đề (`hsl(var(--chart-4))`, `hsl(var(--chart-1))`, `hsl(var(--chart-3))`, `hsl(var(--primary))`), giúp logo trên Sidebar, Header và trang Đăng nhập đổi màu tức thì theo Built-in Theme đang chọn.
   - **Hệ thống biểu tượng Lucide trên Thanh Điều Hướng (`Sidebar / Header / Mixed Menu`) và Thanh Tab (`Tabbar`):** Đồng bộ các biến `--menu-item-active-color: hsl(var(--primary))`, `--menu-item-active-background-color: hsl(var(--primary) / 15%)` ở cả Light và Dark mode trong `@operon-core/menu-ui` và `@operon-core/tabs-ui` (loại bỏ các quy tắc `.is-dark` / `dark:text-accent-foreground` / `dark:bg-accent` đang triệt tiêu màu Built-in Theme khi ở chế độ tối).
   - **Hệ thống biểu tượng Lucide trên toàn bộ các trang Nghiệp Vụ (`apps/web-admin/src/views/**`):** Chuẩn hóa khung chứa icon trên thẻ KPI Metric Cards, thanh chỉ số `Stats Bar`, huy hiệu icon đầu dòng trong bảng `VxeGrid`, icon tiêu đề Modal và icon trạng thái rỗng (`#empty`) từ màu xám tĩnh (`bg-muted text-foreground`, `text-muted-foreground`) sang token chủ đề `bg-primary/10 text-primary` và `text-primary` / `text-primary/60`.

---

## 2. Tech Stack

- **Framework:** Vue 3.5 (`<script setup lang="ts">`), Vue Router 4, Pinia.
- **Design System, Icons & Charts:** `@operon-core/shadcn-ui` (`VbenLogo`, `VbenIcon`, `AreaChart`, `DonutChart`, `BarChart`), `@operon-core/menu-ui`, `@operon-core/tabs-ui`, `@operon-core/layout-ui`, Tailwind CSS v4, Lucide Icons (`@lucide/vue`).
- **State & Color Engine:** `@operon/preferences` (`PreferenceManager` singleton, `usePreferences`, `updateCSSVariables`), `@operon-core/shared/color` (`generatorColorVariables`, `TinyColor`, `convertToHslCssVar`).

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho Preferences, Shadcn UI (Logo & Chart), Menu UI và Layout UI
pnpm exec vitest run packages/@core/preferences packages/@core/ui-kit/shadcn-ui packages/@core/ui-kit/layout-ui

# 2. Kiểm tra kiểu dữ liệu TypeScript toàn workspace (0 lỗi)
pnpm --filter @operon/admin-web run typecheck

# 3. Kiểm tra linter và chuẩn hóa định dạng
pnpm run lint

# 4. Đóng gói bản dựng cục bộ để kiểm thử trực quan trên Tailscale / LAN
pnpm run build:local
```

---

## 4. Project Structure (Cấu Trúc Tệp Tác Động)

```text
packages/
├── @core/
│   ├── preferences/
│   │   ├── src/
│   │   │   ├── config.ts                        # Cấu hình mặc định preferences
│   │   │   ├── constants.ts                     # 14 BUILT_IN_THEME_PRESETS
│   │   │   ├── preferences.ts                   # PreferenceManager (cloneValue, resetPreferences, isMobile preservation)
│   │   │   ├── update-css-variables.ts          # Inject biến CSS --primary & --chart-1..5 thuần khiết (Zero-Mutation)
│   │   │   ├── use-preferences.ts               # Tính toán reactive & Anti-Lockout fallback
│   │   │   └── types.ts                         # Định nghĩa kiểu dữ liệu preferences
│   │   └── __tests__/
│   │       ├── preferences.test.ts              # Unit tests cho deep clone, cache purge, isMobile & --chart-1..5
│   │       └── use-preferences.test.ts          # Unit tests cho Anti-Lockout & diffPreference
│   └── ui-kit/
│       ├── layout-ui/src/
│       │   ├── components/
│       │   │   ├── layout-content.vue           # Responsive compact width (min(100%, width))
│       │   │   └── layout-footer.vue            # Cố định chân trang chuẩn lề phải (right-0)
│       │   └── vben-layout.vue                  # Khung bố cục tổng thể
│       ├── menu-ui/src/components/
│       │   ├── menu.vue                         # Đồng bộ --menu-item-active-color: hsl(var(--primary)) cho cả .is-dark & .is-light
│       │   └── normal-menu/normal-menu.vue      # Đồng bộ active icon/text theo màu chủ đề ở chế độ tối
│       ├── tabs-ui/src/components/
│       │   ├── tabs/tabs.vue                    # Đồng bộ active tab icon & nền theo text-primary / bg-primary/15
│       │   └── tabs-chrome/tabs.vue             # Đồng bộ active chrome tab icon & nền theo text-primary / bg-primary/15
│       └── shadcn-ui/src/
│           ├── components/logo/
│           │   ├── logo.vue                     # VbenLogo: dựng Inline SVG theo biến CSS chủ đề (--chart-1..4, --primary)
│           │   └── __tests__/logo.test.ts       # Unit tests kiểm chứng VbenLogo render SVG động theo chủ đề
│           └── ui/
│               ├── chart/index.ts               # defaultColors() trả về hsl(var(--chart-1..5))
│               ├── chart-area/AreaChart.vue     # Đồng bộ reactive legendItems & gradient stop-color
│               ├── chart-bar/BarChart.vue       # Đồng bộ reactive legendItems
│               └── chart-donut/DonutChart.vue   # Sử dụng defaultColors() theo biến --chart-1..5
├── effects/layouts/src/authentication/
│   └── authentication.vue                       # Sử dụng VbenLogo / Inline SVG trên trang Đăng nhập
apps/web-admin/
├── public/
│   ├── logo.svg                                 # Cập nhật mã SVG thương hiệu chuẩn biến CSS / fallback
│   └── logo-app.svg                             # Đồng bộ cùng logo.svg
└── src/views/
    ├── dashboard/analytics/                     # index.vue (KPI icons bg-primary/10 text-primary) & 3 chart components
    ├── tenants/                                 # index.vue, detail.vue & components/* (KPI, table & modal icons theo primary)
    ├── automation/                              # workflows, runs, devices, browsers, proxies & modals (icons theo primary)
    ├── system/                                  # plugins, plans, subscriptions, users, roles, audit-logs (icons theo primary)
    └── commerce/                                # store, orders, wallet, admin, public-store (icons theo primary)
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Ma Trận Kiểm Toán Layout & Cơ Chế Bảo Vệ

| Phân Hệ | Rủi Ro Tiềm Ẩn | Cơ Chế Bảo Vệ Định Tính (Implemented Guardrail) |
| :-- | :-- | :-- |
| **1. Header (`header`)** | Tắt `header.enable: false` khi `preferencesButtonPosition = 'header'` làm mất nút mở cài đặt. | Trong `use-preferences.ts`: Tự động fallback `preferencesButtonPosition.value.fixed = true` khi `header.enable === false`. |
| **2. Sidebar (`sidebar`)** | Tắt `sidebar.enable: false` ở chế độ `sidebar-nav` làm mất toàn bộ menu điều hướng. | Trong `sidebar.vue`: Khóa công tắc `:disabled="isSidebarNav"` kèm chú thích hướng dẫn dùng chế độ thu gọn (`collapse`). |
| **3. Content (`content`)** | Chế độ `compact` gán cứng `width: 1200px` gây tràn ngang trên điện thoại/tablet. | Trong `layout-content.vue`: Sử dụng `width: min(100%, ${props.contentCompactWidth}px)` và `maxWidth: '100%'`. |
| **4. Tabbar (`tabbar`)** | Thiếu công tắc bật/tắt nút làm mới tab (`tabbar.showRefresh`) và lưu tab thừa khi tắt tabbar. | Bổ sung `SwitchItem v-model="tabbarShowRefresh"` trong `tabbar.vue` và ngắt tự động ghi tab mới khi `tabbar.enable === false`. |
| **5. Breadcrumb (`breadcrumb`)** | Người dùng không rõ vì sao Breadcrumb ẩn ở chế độ `header-nav` / `mixed-nav` hoặc màn hình nhỏ. | Hiển thị ở breakpoint Desktop (`lg:block`, $\ge 1024\text{px}$) và bổ sung tooltip giải thích trong `breadcrumb.vue`. |
| **6. Navigation (`navigation`)** | Công tắc `navigationSplit` vẫn cho phép bật khi không ở chế độ menu hỗn hợp (`mixed-nav`). | Gắn `:disabled="!isMixedNav"` trên công tắc `navigationSplit` trong `navigation.vue`. |
| **7. Widget (`widget`)** | Nguy cơ mất hoàn toàn nút mở Preferences nếu tắt mọi vị trí hiển thị. | Luôn duy trì ít nhất một điểm truy cập mở Preferences Drawer (Header, Floating Fixed Button hoặc phím tắt). |
| **8. Footer (`footer`)** | Bật `footer.enable = true` nhưng tắt `copyright.enable` làm thanh chân trang rỗng 0px hoặc lệch lề. | Áp dụng `right-0 border-t border-border bg-card/90 backdrop-blur-sm` và nhãn bản quyền mặc định `Copyright © 2026 Operon`. |
| **9. Runtime Viewport (`app.isMobile`)** | Nhấn `resetPreferences()` trên điện thoại ghi đè `isMobile = false`, làm sập Drawer di động. | Bảo toàn giá trị runtime `currentIsMobile = this.state.app.isMobile` qua thao tác reset và loại trừ `isMobile` khỏi `diffPreference`. |
| **10. Chart Theme Palette (`--chart-1..5`)** | Biểu đồ dùng màu Hex cố định (`#38bdf8`, `#10b981`) bị lệch tông khi đổi sang `violet`, `rose`, `green`, `neutral`, `zinc`... | Tự động sinh `--chart-1..5` trong `update-css-variables.ts` từ chủ đề Built-in đang chọn và dùng `hsl(var(--chart-1..5))` trong `defaultColors()`. |
| **11. Brand SVG Logo (`VbenLogo`)** | Thẻ `<img src="/logo.svg">` bị trình duyệt cô lập khỏi biến CSS `:root` và dùng mã màu xám cố định (`#FAFAFA -> #A1A1AA`). | Dựng Inline SVG trong `VbenLogo` & `AuthPageLayout` với `<linearGradient>` dùng `hsl(var(--chart-4))`, `hsl(var(--chart-1))`, `hsl(var(--chart-3))`. |
| **12. Lucide Icons (`Menu`, `Tabs`, `theme.css`)** | Quy tắc `.is-dark` trong `menu.vue` / `tabs.vue` và class `bg-muted text-foreground` trong các trang nghiệp vụ làm icon Lucide luôn có màu xám/trắng tĩnh. | Đồng bộ `--menu-item-active-color: hsl(var(--primary))` ở cả Light/Dark mode và dùng quy tắc CSS tập trung (SSOT) trong `internal/tailwind-config/src/theme.css` (`:has(> svg.lucide:only-child)` & `svg.lucide`) — **0 file view cần sửa thủ công**. |

### 5.2. Thuật Toán Sinh Dải Màu Biểu Đồ Động (`update-css-variables.ts` & `chart/index.ts`)

1. **Nguyên tắc Zero-Mutation & Sinh biến `--chart-1` .. `--chart-5`:**
   - Hàm `updateCSSVariables(preferences)` giải quyết màu chủ đạo (`resolvedPrimaryColor`) mà **không sửa đổi trực tiếp** đối tượng `preferences` đầu vào.
   - Với **10 chủ đề có màu sắc (Chromatic Themes:** `default`, `violet`, `pink`, `yellow`, `sky-blue`, `green`, `deep-green`, `deep-blue`, `orange`, `rose`, và `custom`):
     - Lấy bảng sắc độ từ `generatorColorVariables([{ color: resolvedPrimaryColor, name: 'primary' }])`:
       - `--chart-1`: `var(--primary-500)` (Màu chủ đạo gốc của Built-in Theme).
       - `--chart-2`: `var(--primary-400)` (Sắc độ sáng kế cận).
       - `--chart-3`: `var(--primary-600)` (Sắc độ đậm kế cận).
       - `--chart-4`: `var(--primary-300)` (Sắc độ dịu).
       - `--chart-5`: `var(--primary-700)` (Sắc độ chiều sâu).
   - Với **4 chủ đề đơn sắc trung tính (Monochrome Themes:** `zinc`, `neutral`, `slate`, `gray`):
     - Do `primaryColor` ở Light mode rất tối (`10%`) và ở Dark mode rất sáng (`98%`), hệ thống lấy màu đặc trưng `preset.color` của từng chủ đề (`zinc`: `240 5%`, `neutral`: `0 0%`, `slate`: `215 25%`, `gray`: `217 19%`) để sinh 5 bậc độ sáng (`Lightness`) phân tách rõ ràng:
       - **Dark Mode:** `L = [90%, 72%, 55%, 40%, 28%]`
       - **Light Mode:** `L = [18%, 34%, 50%, 66%, 80%]`

### 5.3. Kiến Trúc SSOT Cho Logo SVG Động & Đồng Bộ Màu Icon Lucide Tập Trung

1. **Inline SVG Logo (`packages/@core/ui-kit/shadcn-ui/src/components/logo/logo.vue` & `authentication.vue`):**
   - Khi `logoSrc` là đường dẫn logo mặc định (`/logo.svg`, `/logo-app.svg`, hoặc rỗng), `VbenLogo` dựng trực tiếp thẻ `<svg>` inline thay vì `<img>`, sử dụng `useId()` để định danh duy nhất cho `<linearGradient>` và `<filter>`:
     - **Ở Dark Mode (`theme === 'dark'` / `isDark`):** Dựng dải màu **Trắng sứ (Porcelain White)** nguyên bản (`#FAFAFA` $\rightarrow$ `#E4E4E7` $\rightarrow$ `#A1A1AA`, quầng sáng `rgb(228 228 231 / 0.15)`) cho `VbenLogo` và (`white` $\rightarrow$ `#F4F4F5` $\rightarrow$ `#E4E4E7` $\rightarrow$ `#CBD5E1`) cho linh vật trên trang Đăng nhập để nổi bật sắc nét trên nền tối và tuyệt đối không bị pha màu cầu vồng.
     - **Ở Light Mode (`theme !== 'dark'`):** Liên kết trực tiếp với các biến chủ đề (`hsl(var(--chart-4, var(--primary)))` $\rightarrow$ `hsl(var(--chart-1, var(--primary)))` $\rightarrow$ `hsl(var(--chart-3, var(--primary)))`, quầng sáng `hsl(var(--primary) / 0.22)`).
     - Đồng thời, loại bỏ khai báo `--chart-1..5` cầu vồng tĩnh bên trong `.dark` tại `packages/@core/base/design/src/design-tokens/dark.css` để các thẻ con `.dark` luôn kế thừa `--chart-1..5` động từ `:root`.
   - Nếu người dùng truyền một URL ảnh bên ngoài (ví dụ `https://...` hoặc ảnh `.png`/`.webp` tùy chỉnh), `VbenLogo` tự động fallback về `<VbenAvatar />` để giữ tương thích ngược 100%.

2. **Kiến Trúc CSS Tập Trung (SSOT) Cho Hệ Thống Icon Lucide (`@lucide/vue` & `VbenIcon`):**
   - **Tầng 1 — Navigation & Tabbar (`menu.vue`, `normal-menu.vue`, `tabs.vue`, `tabs-chrome/tabs.vue`):**
     - Mục đang chọn (`is-active`) và khi rê chuột vào submenu luôn sử dụng `hsl(var(--primary))` cho cả icon và nhãn chữ, đi kèm nền dịu `hsl(var(--primary) / 15%)` ở cả Light Mode và Dark Mode.
   - **Tầng 2 — Quy tắc CSS Tập Trung tại `internal/tailwind-config/src/theme.css` (0 sửa đổi thủ công trên các file View):**
     - Mọi khung chứa icon không phải nút bấm (`:is(.bg-muted, .bg-muted\/50, .bg-muted\/40):not(button, [role='button']):has(> svg.lucide:only-child)`) tự động nhận `background-color: hsl(var(--primary) / 10%)` và `color: hsl(var(--primary))`.
     - Các icon `svg.lucide` độc lập mang class `.text-muted-foreground` hoặc `.text-foreground` (nằm ngoài `button`, `[role='button']`, `a` và ô tìm kiếm `input`) tự động nhận `color: hsl(var(--primary))`.
   - **Tầng 3 — Semantic Status Icons (Bảo toàn ngữ nghĩa trạng thái):**
     - Các icon phản ánh trạng thái vận hành (`text-emerald-*`, `text-amber-*`, `text-rose-*`, `text-success`, `text-warning`, `text-destructive`) được giữ nguyên hoàn toàn nhờ độ ưu tiên lớp hoặc bộ lọc loại trừ.

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`Vitest`):**
   - `packages/@core/preferences/__tests__/preferences.test.ts`: Kiểm tra cô lập bản sao sâu (`cloneValue`), xóa sạch `localStorage` khi `resetPreferences()`, bảo toàn `app.isMobile`, Zero-Mutation và sinh 5 biến `--chart-1..5` cho cả 14 Built-in Themes + `custom`.
   - `packages/@core/ui-kit/shadcn-ui/src/ui/chart/__tests__/chart-colors.test.ts`: Kiểm tra `defaultColors(1..5)` trả về đúng chuỗi biến CSS ngữ nghĩa `'hsl(var(--chart-1))'` .. `'hsl(var(--chart-5))'`.
   - `packages/@core/ui-kit/shadcn-ui/src/components/logo/__tests__/logo.test.ts`: Kiểm tra `VbenLogo` dựng inline `<svg>` chứa biến CSS chủ đề (`hsl(var(--chart-1`) khi dùng `/logo.svg` và fallback sang `<VbenAvatar />` khi truyền URL ảnh ngoài.
2. **Static Audit & Typecheck:**
   - Kiểm tra quy tắc SSOT trong `internal/tailwind-config/src/theme.css`, `menu.vue`, `normal-menu.vue`, `tabs.vue`, `tabs-chrome/tabs.vue`.
   - Chạy `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Giải quyết đồng bộ màu ở tầng Core SSOT (`theme.css`, `logo.vue`, `menu.vue`, `tabs.vue`) thay vì sửa thủ công hàng loạt file view.
  - Giữ tương thích ngược cho `VbenLogo` khi truyền `src` là ảnh tùy chỉnh bên ngoài.
  - Bảo toàn màu ngữ nghĩa trạng thái (`text-success`, `text-warning`, `text-destructive`) cho các icon cảnh báo/trạng thái.
- **Ask first:**
  - Thay đổi hình dáng hình học (path geometry) của linh vật Ghost hoặc thay đổi danh sách 14 `BUILT_IN_THEME_PRESETS`.
- **Never:**
  - Không dùng `<img src="/logo.svg">` tĩnh với mã Hex xám cố định cho logo thương hiệu chính khiến logo không thể đổi màu theo Built-in Theme.
  - Không dùng `dark:text-accent-foreground` hoặc `dark:bg-accent` ghi đè mất màu `text-primary` / `bg-primary/15` của mục menu/tab đang chọn ở chế độ Dark Mode.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1 — Anti-Lockout & Navigation Safety:** Tắt Header tự động bật nút Settings nổi (`fixed: true`); công tắc Sidebar khóa an toàn khi ở `sidebar-nav`.
- [x] **SC2 — Responsive Compact & Mobile Reset Safety:** Chế độ `compact` không gây cuộn ngang; `resetPreferences()` bảo toàn `isMobile` và xóa sạch cache.
- [x] **SC3 — Dynamic `--chart-1..5` Generation:** Khi đổi bất kỳ chủ đề nào trong 14 Built-in Themes hoặc `custom`, 5 biến `--chart-1` .. `--chart-5` trên `:root` lập tức cập nhật theo tông màu chủ đề đó (cả Light & Dark mode).
- [x] **SC4 — Zero Hardcoded Chart Hex in Analytics:** `growth-chart.vue`, `plans-chart.vue`, `plugins-chart.vue` và `defaultColors()` hoàn toàn không còn mã Hex tĩnh.
- [x] **SC5 — Dynamic Built-in Theme Brand SVG Logo:** Logo trên Sidebar, Header và trang Đăng nhập (`VbenLogo` & `AuthPageLayout`) tự động chuyển đổi dải màu gradient & quầng sáng theo đúng Built-in Theme đang chọn ở cả Light và Dark mode.
- [x] **SC6 — SSOT Built-in Theme Lucide Icons Coherence:**
  - Menu Sidebar/Header và Tabbar đang active hiển thị icon & chữ theo màu `hsl(var(--primary))` + nền `hsl(var(--primary) / 15%)` đồng nhất trên cả Light & Dark mode.
  - Quy tắc CSS tập trung trong `internal/tailwind-config/src/theme.css` tự động chuyển toàn bộ hộp icon KPI Card, Stats Bar, huy hiệu icon đầu dòng bảng `VxeGrid`, Modal Header và Empty State sang tông màu `--primary` mà không cần sửa thủ công các file `views/**`.
- [x] **SC7 — Zero Regression:** Toàn bộ unit tests, `pnpm --filter @operon/admin-web run typecheck`, `pnpm run lint` và `pnpm run build:local` kết thúc với `0 errors`.

---

## 9. Resolved Decisions (Các Quyết Định Đã Chốt)

1. **Khóa công tắc Enable Sidebar trong chế độ `sidebar-nav`:** Khi đang ở bố cục `sidebar-nav`, công tắc `sidebar.enable` được khóa (`:disabled="true"`) để ngăn người dùng vô tình tắt mất thanh điều hướng duy nhất của ứng dụng.
2. **Breakpoint hiển thị Breadcrumb (`lg:block`):** Giữ Breadcrumb hiển thị từ màn hình Desktop ($\ge 1024\text{px}$) trở lên để giữ thanh Header gọn gàng trên điện thoại và máy tính bảng.
3. **Chiến lược phối màu biểu đồ theo Built-in Theme (Phương án A — Monochromatic Tonal Ramp):** Toàn bộ `--chart-1..5` sử dụng 5 sắc độ sáng/tối đồng nhất của chính màu Built-in Theme đang chọn (`--primary-500`, `--primary-400`, `--primary-600`, `--primary-300`, `--primary-700` cho nhóm chủ đề có màu sắc; và thang độ sáng 5 bậc phân tách rõ từ `preset.color` cho nhóm chủ đề trung tính `neutral / zinc / slate / gray`).
4. **Kiến trúc SSOT cho SVG Logo & Hệ thống Icon Lucide:**
   - **SVG Logo:** Dựng `<svg>` inline trong `VbenLogo` (`logo.vue`) và `AuthPageLayout` (`authentication.vue`) với dải chuyển sắc 3 điểm (`--chart-4` $\rightarrow$ `--chart-1` $\rightarrow$ `--chart-3`) và hào quang `hsl(var(--primary) / 0.22)`.
   - **Lucide Icons (Zero Manual View Edits):** Đồng bộ tại tầng Core CSS (`internal/tailwind-config/src/theme.css`) thông qua `:has(> svg.lucide:only-child)` và `svg.lucide`, kết hợp sửa `.is-dark` trong `menu.vue`, `normal-menu.vue`, `tabs.vue`, `tabs-chrome/tabs.vue` để đạt hiệu lực trên toàn bộ 22+ trang mà không cần sửa thủ công từng trang.

---

## 10. Open Questions (Câu Hỏi Mở)

_(Không còn câu hỏi mở — Tất cả quyết định kiến trúc đã được phê duyệt)._
