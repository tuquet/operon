# Spec: Admin Tauri Desktop Application (`SPEC-tauri-desktop`)

## 1. Objective

Xây dựng phiên bản Native Desktop cho **Admin Console** (`@operon/admin`) dựa trên công nghệ **Tauri v2**, mang lại trải nghiệm phần mềm quản trị doanh nghiệp chuẩn Enterprise:

- **Tốc độ & Tài nguyên tối ưu:** Khởi động dưới $500\text{ms}$, chiếm dụng RAM ban đầu $\le 40\text{MB}$ (so với $\ge 400\text{MB}$ của Electron).
- **Trải nghiệm Native mượt mà:** Cửa sổ không bị giật/nhấp nháy trắng (zero white-flash), tự động ghi nhớ kích thước và tọa độ vị trí giữa các phiên làm việc (`window-state`), khay hệ thống (System Tray) tiện dụng, và chống chạy nhiều cửa sổ xung đột (`single-instance`).
- **Tích hợp sâu hệ thống:** Tiếp nhận luồng xác thực Enterprise SSO qua giao thức Deep Linking `operon://auth/callback` (liên kết với route `/auth/desktop` có sẵn), gửi thông báo native trực tiếp khi có cảnh báo máy chủ/thanh toán, hỗ trợ hộp thoại lưu/mở tập tin native (`dialog`), và bộ nhớ lưu trữ offline bảo mật (`store`).
- **Bảo mật chuẩn Enterprise:** Tuân thủ mô hình phân quyền hạt mịn mới nhất của Tauri v2 (ACL Capabilities & Scoped Permissions), cô lập IPC, và thiết lập Content Security Policy (CSP) nghiêm ngặt.

---

## 2. Tech Stack

- **Desktop Framework:** Tauri v2 (Stable 2.x) — Rust Core & WebView2 (Windows) / WebKitGTK (Linux) / WKWebView (macOS).
- **Core Language & Toolchain:**
  - Rust 1.98.1+ (Edition 2021) với Cargo.
  - Node.js $\ge 20.18.0$, pnpm 12.4.1+, Turborepo 2.10.x.
- **Frontend Stack:** Vue 3.5.x, Vite 8.3.x (Rolldown engine), TypeScript 6.0.x, Tailwind CSS v4, Shadcn Slate Design Tokens, `@lucide/vue`, Pinia 4.x, Vue Router 5.x.
- **Tauri Plugins (v2):**
  - `@tauri-apps/plugin-opener` (^2.x): Điều hướng an toàn ra trình duyệt ngoài.
  - `@tauri-apps/plugin-window-state` (^2.x): Ghi nhớ trạng thái cửa sổ.
  - `@tauri-apps/plugin-single-instance` (^2.x): Chống khởi chạy đa tiến trình song song.
  - `@tauri-apps/plugin-notification` (^2.x): Thông báo native OS.
  - `@tauri-apps/plugin-dialog` (^2.x): Hộp thoại chọn file/thư mục chuẩn native.
  - `@tauri-apps/plugin-deep-link` (^2.x): Xử lý URL scheme `operon://`.
  - `@tauri-apps/plugin-store` (^2.x): Key-Value store bảo mật cục bộ.
  - `@tauri-apps/plugin-updater` (^2.x): Tự động cập nhật OTA có chữ ký điện tử Ed25519.
  - `@tauri-apps/plugin-process` (^2.x): Quản lý vòng đời tiến trình.

---

## 3. Commands

Tất cả các lệnh được cấu hình đồng bộ qua `pnpm` và `turbo` tại gốc monorepo `operon/admin`:

```bash
# Khởi chạy môi trường Desktop Development (Hot-Reload đồng thời Vue 3 + Rust)
pnpm run tauri:dev
# Lệnh tương đương chạy trực tiếp trong apps/web-admin:
# pnpm -F @operon/admin-web exec tauri dev

# Kiểm tra cú pháp và loại trừ lỗi biên dịch Rust (Rust check)
pnpm run tauri:check
# Lệnh tương đương:
# cd apps/web-admin/src-tauri && cargo check --workspace

# Đóng gói Desktop Application bản Release cục bộ (Windows MSI & NSIS exe)
pnpm run tauri:build
# Lệnh tương đương:
# pnpm -F @operon/admin-web exec tauri build

# Kiểm tra chất lượng mã nguồn toàn diện (Typecheck + Lint + Console Gate)
pnpm run check:type
pnpm run lint
pnpm run check:console

# Chạy Unit Tests cho cả logic frontend và native adapter
pnpm run test:unit
```

---

## 4. Project Structure

Áp dụng mô hình **Co-located Multi-Target Architecture** trong `apps/web-admin` (chia sẻ $100\%$ mã nguồn 22 routes, layout, stores mà không tạo duplicate code, cấu hình phân nhánh thông minh qua biến môi trường `TAURI_ENV_PLATFORM`):

```text
admin/
├── apps/
│   └── web-admin/
│       ├── src-tauri/                        # Rust Desktop Backend (Tauri v2)
│       │   ├── capabilities/
│       │   │   └── default.json              # Tauri v2 ACL Permissions & Scopes
│       │   ├── icons/                        # 32x32, 128x128, icon.ico, icon.png
│       │   ├── src/
│       │   │   ├── commands/                 # Rust IPC Commands (system, session, update)
│       │   │   │   ├── mod.rs
│       │   │   │   └── system.rs
│       │   │   ├── lib.rs                    # Plugin registration, tray, single-instance
│       │   │   └── main.rs                   # App entrypoint
│       │   ├── Cargo.toml                    # Rust dependencies & crate config
│       │   ├── tauri.conf.json               # Tauri v2 master configuration
│       │   └── build.rs                      # Tauri build script
│       ├── src/
│       │   ├── adapter/
│       │   │   └── desktop/                  # Frontend Desktop Native Adapters
│       │   │   │   ├── index.ts              # isTauri() detection, window helpers
│       │   │   │   ├── notification.ts       # Native notification wrapper
│       │   │   │   ├── deep-link.ts          # operon:// router handler
│       │   │   │   └── storage.ts            # Secure local store gateway
│       │   └── views/
│       │       └── _core/authentication/
│       │           └── desktop-gateway.vue    # Đồng bộ SSO qua deep link & loopback
│       ├── package.json                      # Bổ sung @tauri-apps/api & plugins
│       └── vite.config.ts                    # Tự động nhận diện TAURI_ENV_PLATFORM
├── internal/
│   └── vite-config/                          # Cấu hình bypass PWA khi chạy mode Tauri
├── docs/
│   └── specs/
│       ├── CAPABILITY-map-web-admin.md                 # Bản đồ năng lực các module
│       └── SPEC-cross-tauri-desktop.md             # Tài liệu đặc tả kỹ thuật này
└── turbo.json                                # Bổ sung task tauri:build vào cache graph
```

---

## 5. Code Style & Architectural Patterns

### 5.1. Rust Backend Architecture (`src-tauri/src/lib.rs`)

Mã nguồn Rust tuân thủ quy chuẩn an toàn bộ nhớ tuyệt đối, phi phong tỏa (non-blocking), bọc `tauri::State` trong cấu trúc dữ liệu luồng an toàn:

```rust
use tauri::{AppHandle, Manager};
use tauri_plugin_window_state::StateFlags;

#[tauri::command]
async fn get_app_environment(app: AppHandle) -> Result<serde_json::Value, String> {
    let package_info = app.package_info();
    Ok(serde_json::json!({
        "appName": package_info.name,
        "version": package_info.version.to_string(),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all())
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![get_app_environment])
        .setup(|app| {
            // Smooth startup: show window only after DOM is ready
            let window = app.get_webview_window("main").unwrap();
            let w = window.clone();
            window.once("tauri://ready", move |_| {
                let _ = w.show();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running admin application");
}
```

### 5.2. Frontend Detection & Native Adapter (`src/adapter/desktop/index.ts`)

Tuyệt đối không để xảy ra crash khi mở trên trình duyệt web thông thường:

```typescript
/**
 * Nhận diện môi trường thực thi runtime
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Hiển thị thông báo an toàn đa nền tảng (Native Notification hoặc UI Toast)
 */
export async function sendDesktopNotification(
  title: string,
  body: string,
): Promise<void> {
  if (isTauriEnvironment()) {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification');
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    if (granted) {
      sendNotification({ title, body });
      return;
    }
  }
  // Fallback cho web browser: dùng Vben Toast
  console.info(`[Notification] ${title}: ${body}`);
}
```

### 5.3. Điều chế Vite Configuration (`apps/web-admin/vite.config.ts`)

```typescript
import { defineConfig } from '@operon/vite-config';

const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM);

export default defineConfig(async () => {
  return {
    application: {
      // Vô hiệu hóa Service Worker PWA trên desktop để tránh stale cache & xung đột IPC
      pwa: !isTauri,
    },
    vite: {
      clearScreen: false,
      server: {
        // Tauri yêu cầu cổng cố định để devUrl luôn kết nối chính xác
        strictPort: true,
        port: 5320,
      },
      envPrefix: ['VITE_', 'TAURI_ENV_*'],
    },
  };
});
```

---

## 6. Testing Strategy

1. **Rust Crate Integration Tests:**
   - Vị trí: `apps/web-admin/src-tauri/tests/`
   - Kiểm tra khởi tạo context, serialization của IPC commands, và cấu trúc ACL Capabilities parser.
2. **Frontend Adapter Unit Tests:**
   - Vị trí: `apps/web-admin/src/adapter/desktop/__tests__/desktop.test.ts`
   - Chạy qua `vitest run --dom`. Đảm bảo các hàm fallback an toàn khi `__TAURI_INTERNALS__` vắng mặt trên Web.
3. **Deep Linking Protocol Verification:**
   - Kiểm tra parser xử lý callback `operon://auth/callback?token=...` đưa vào Vue Router và `useAccessStore()`.
4. **End-to-End Build & Run Verification:**
   - Chạy lệnh `pnpm run tauri:build --debug` để nghiệm thu file nhị phân mà không cần ký số, kiểm tra thời gian khởi động và mức tiêu thụ RAM qua Task Manager / Activity Monitor.

---

## 7. Boundaries

| Phân loại | Quy định hành vi |
| --- | --- |
| **Luôn luôn làm (Always)** | - Bọc toàn bộ lời gọi `@tauri-apps/*` trong hàm kiểm tra `isTauriEnvironment()`.<br>- Sử dụng cấu hình Capabilities hạt mịn (`src-tauri/capabilities/*.json`), chỉ cấp quyền cần thiết.<br>- Đặt `visible: false` khi khởi tạo cửa sổ và kích hoạt `show()` sau khi DOM sẵn sàng.<br>- Đảm bảo tất cả 22 routes hiện có trong Web Admin hoạt động trơn tru trên Desktop. |
| **Hỏi ý kiến trước (Ask first)** | - Bổ sung các plugin truy cập phần cứng sâu (như Bluetooth, NFC, Raw USB).<br>- Tùy chỉnh Window Chrome tùy biến không viền (Frameless Custom Titlebar) thay cho thanh tiêu đề hệ thống.<br>- Cấu hình server lưu trữ bản cập nhật OTA (GitHub Releases vs Cloudflare R2 / S3 riêng). |
| **Tuyệt đối không làm (Never)** | - Cấu hình quyền `core:default` dạng wildcard không giới hạn.<br>- Bật PWA Service Worker trong chế độ đóng gói Desktop App.<br>- Nhúng trực tiếp secret keys / private signing keys vào mã nguồn git.<br>- Phá vỡ khả năng tương thích web của ứng dụng `@operon/admin-web`. |

---

## 8. Success Criteria (Tiêu chí Nghiệm thu Cụ thể)

1. [ ] **Build Integrity:** Lệnh `pnpm run tauri:check` và `pnpm run tauri:build` hoàn tất với mã lỗi `0` (Zero Rust compilation warnings/errors).
2. [ ] **Zero Disruption to Web:** Lệnh `pnpm run build:admin` và `pnpm run check:console` vẫn vượt qua 100% (22/22 routes xanh, không ảnh hưởng web build).
3. [ ] **RAM & Start-up Performance:** Ứng dụng Desktop khởi động hiển thị Dashboard trong $\le 800\text{ms}$, RAM tĩnh duy trì $\le 45\text{MB}$.
4. [ ] **Single Instance & State Restoration:** Khởi động lần 2 tự động đưa cửa sổ hiện tại lên đầu (focus); đóng ứng dụng và mở lại giữ nguyên kích thước và vị trí màn hình.
5. [ ] **Deep Link SSO Integration:** Nhấp link `operon://auth/callback` từ bên ngoài tự động kích hoạt callback và đồng bộ phiên đăng nhập vào Store.
6. [ ] **Zero Emoji & Theme Invariant:** Giữ vững giao diện Shadcn Slate tokens và bộ icon `@lucide/vue`, hoàn toàn không xuất hiện unicode emojis.

---

## 9. Approved Design Decisions

1. **Kiến trúc đồng nhất (1 Codebase):** Tích hợp `src-tauri` trực tiếp vào `apps/web-admin`. Một codebase duy nhất phục vụ cả Web Dashboard (PWA/SPA) và Native Desktop App.
2. **Thanh Tiêu Đề Tùy Biến (Custom Frameless Titlebar):**
   - Thiết lập `decorations: false` trong `tauri.conf.json`.
   - Xây dựng component `<DesktopTitlebar />` trong `packages/effects/layouts` (hoặc `apps/web-admin/src/layouts/widgets/desktop-titlebar.vue`).
   - Sử dụng token **Shadcn Slate**: Nền `bg-background/95 backdrop-blur`, đường viền dưới `border-b border-border/60`, nút điều khiển `hover:bg-accent` và nút Đóng `hover:bg-destructive hover:text-destructive-foreground`.
   - Vùng kéo cửa sổ chuẩn: Thẻ container gắn `data-tauri-drag-region`.
   - Các nút chức năng sử dụng `@lucide/vue` (`Minus`, `Square` / `Copy`, `X`).
3. **Kênh Phát Hành & Cập Nhật Tự Động (GitHub Releases):**
   - Cấu hình `@tauri-apps/plugin-updater` trỏ đến endpoint: `https://github.com/operon/console/releases/latest/download/latest.json`
   - Ký số nhị phân bằng thuật toán Ed25519; lưu public key vào `tauri.conf.json` và private key trên GitHub Actions Secrets (`TAURI_SIGNING_PRIVATE_KEY`).
