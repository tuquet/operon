# Spec: Admin Public Repository, CI Quality Gates & CD Desktop Release (`INITIATIVE-CICD-PUBLIC-RELEASE`)

## 1. Capability Map

| Module ID | Responsibility | Depends on |
| --- | --- | --- |
| `public-repo` | Chuẩn hóa repo Public: Loại bỏ triệt để reference upstream cũ (`operon/admin`), rà soát chống rò rỉ secrets, cập nhật `SECURITY.md`, `LICENSE`, badges và release instructions. | — |
| `ci-pipeline` | Tự động hóa Quality Gate trên GitHub Actions (PR & Push `main`): Lint, Typecheck, Unit Test, Headless Console Gate, và Rust Backend `cargo check`. | `public-repo` |
| `cd-release` | Tự động hóa đóng gói phát hành Windows Desktop App (Tauri v2) khi push tag (`v*.*.*`): Build NSIS `.exe` & MSI, ký số OTA với Ed25519, upload artifacts & `latest.json` lên GitHub Releases. | `ci-pipeline` |

**Thứ tự triển khai:** `public-repo` ➔ `ci-pipeline` ➔ `cd-release`

---

## 2. Assumptions (Giả định cốt lõi)

1. **Repository đích:** Repository GitHub công khai mang định danh `operon/admin` (hoặc repo public của tổ chức Operon).
2. **Kích hoạt phát hành (Release Trigger):** Kích hoạt tự động khi push Git tag định dạng SemVer `v*.*.*` (ví dụ: `v0.1.0`, `v1.0.0`) hoặc qua nút bấm thủ công `workflow_dispatch` trên GitHub Actions.
3. **Môi trường Runner:**
   - **CI Pipeline:** Chạy trên `ubuntu-latest` để tối ưu thời gian và chi phí tính toán (compute minutes).
   - **CD Desktop Release:** Chạy trên `windows-latest` (đã tích hợp sẵn Windows SDK, WiX Toolset v3 và NSIS `makensis`), sử dụng MSVC toolchain (`x86_64-pc-windows-msvc`) để build bộ cài đặt `.exe` và `.msi` native 100%.
4. **Bảo mật Ký số (OTA Signing Key):**
   - Public Key (`dW50cnVzdGVk...`) đã được cấu hình cố định trong `apps/web-admin/src-tauri/tauri.conf.json`.
   - Private Key được cấu hình an toàn trên GitHub Secrets dưới tên `TAURI_SIGNING_PRIVATE_KEY` (và `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` nếu có). Không lưu private key trong git code.
5. **Artifacts phát hành:** File phát hành tải về cho người dùng bao gồm:
   - `Operon-Admin_<version>_x64-setup.exe` (Bộ cài đặt Windows NSIS phổ biến nhất)
   - `Operon-Admin_<version>_x64_en-US.msi` (Bộ cài đặt Windows Enterprise MSI)
   - `latest.json` & `*.sig` (Manifest cập nhật tự động phục vụ `@tauri-apps/plugin-updater`).

---

## 3. Objective

Xây dựng hệ thống CI/CD chuẩn Enterprise cho repository `operon/admin` khi chuyển sang trạng thái Public Repository:

- **Public Hygiene:** Loại bỏ hoàn toàn tàn dư upstream cũ, bảo vệ secrets, tài liệu hóa cách tải và cài đặt rõ ràng.
- **Continuous Integration (CI):** Ngăn chặn 100% hồi quy mã nguồn bằng cách bắt buộc vượt qua 5 lớp kiểm định trước khi merge vào nhánh `main`.
- **Continuous Deployment (CD Release):** Mỗi khi tạo tag mới `v*.*.*`, hệ thống tự động biên dịch, đóng gói file `.exe` cài đặt cho Windows, ký số điện tử và phát hành trực tiếp lên GitHub Releases để người dùng trên toàn cầu có thể tải về chỉ bằng 1 cú nhấp chuột.

---

## 4. Tech Stack & Dependencies

- **CI/CD Platform:** GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `dtolnay/rust-toolchain@stable`, `pnpm/action-setup@v4`, `tauri-apps/tauri-action@v0`).
- **Runner OS:** `ubuntu-latest` (CI Gates) và `windows-latest` (Desktop Packaging).
- **Core Runtime & Tools:**
  - Node.js 20+
  - pnpm 10+ / 11+
  - Rust Stable (MSVC on Windows runner, GNU/MSVC on Linux)
  - Playwright Chromium (cho Headless Console Check)
  - Tauri CLI v2 (`@tauri-apps/cli`)
  - Minisign / Ed25519 Digital Signature

---

## 5. Commands (Lệnh Chuẩn Thực Thi)

```bash
# CI Quality Gates (Chạy kiểm tra tính toàn vẹn)
pnpm run check:type          # Typecheck toàn bộ 38 packages
pnpm run lint                # Linter (ESLint, Oxlint, Stylelint, Oxfmt)
pnpm run test:unit           # Kiểm thử đơn vị Vitest (105 files, 786 tests)
pnpm run check:console       # Console gate headless Chrome 22 routes
pnpm run tauri:check         # Kiểm tra biên dịch Rust crate src-tauri

# CD Desktop Release Commands
pnpm run build:admin         # Build Vite static assets vào apps/web-admin/dist
pnpm run tauri:build         # Đóng gói hoàn chỉnh MSI + NSIS EXE Installer
```

---

## 6. Project Structure (Cấu trúc file cấu hình CI/CD)

```text
.github/
├── workflows/
│   ├── ci.yml                 # Pipeline CI chạy khi PR và Push to main (5 Quality Gates)
│   ├── release.yml            # Pipeline CD Release build Desktop Windows App khi push tag v*.*.*
│   └── deploy.yml             # Web deployment pipeline (nếu có Cloudflare/Vercel)
├── ISSUE_TEMPLATE/            # Templates báo cáo lỗi và yêu cầu tính năng chuẩn Operon
├── pull_request_template.md   # PR template với checklist kiểm thử
SECURITY.md                    # Chính sách báo cáo lỗ hổng bảo mật cho Public Repo
LICENSE                        # Giấy phép nguồn mở MIT chính thức
index.md                      # Bổ sung Badges trạng thái CI & Release Download Links
```

---

## 7. Configuration Specifications

### 7.1. Module `public-repo`: Dọn Dẹp & Vệ Sinh Repo

1. **Thay thế định danh repo cũ:**
   - Quét và thay thế toàn bộ chuỗi `operon/admin` thành `operon/admin` trong `.github/workflows/`, `.github/config.yml`, `.github/dependabot.yml`, và `.github/release-drafter.yml`.
2. **Bảo mật & Open Source Hygiene:**
   - Tạo file `SECURITY.md` định rõ địa chỉ nhận thông báo lỗ hổng (`security@operon.com`) và phạm vi hỗ trợ phiên bản.
   - Xác nhận file `LICENSE` chuẩn MIT License mang tên sở hữu `Team`.
   - Bổ sung Badges trên `index.md`:
     - GitHub CI Status: `[![CI](https://github.com/operon/console/actions/workflows/ci.yml/badge.svg)](https://github.com/operon/console/actions/workflows/ci.yml)`
     - GitHub Latest Release: `[![Release](https://img.shields.io/github/v/release/operon/admin?display_name=tag)](https://github.com/operon/console/releases)`
     - Direct Download EXE: `[Tải Admin cho Windows (.exe)](https://github.com/operon/console/releases/latest/download/admin-setup.exe)`

### 7.2. Module `ci-pipeline`: Cải Tiến CI Workflow (`.github/workflows/ci.yml`)

Workflow chạy trên `ubuntu-latest`, gồm các jobs:

- **`quality-gates`**:
  1. Cài đặt pnpm + Node.js 20 + Rust toolchain (`dtolnay/rust-toolchain@stable`).
  2. Cài đặt Playwright browsers (Chromium).
  3. Chạy `pnpm run check:type` (Typecheck).
  4. Chạy `pnpm run lint` (Lint & Formatting).
  5. Chạy `pnpm run test:unit` (Vitest Suite).
  6. Chạy `pnpm run check:console` (22 Routes Headless Chromium Check).
  7. Chạy `pnpm run tauri:check` (Rust Crate compile check).
- **`ci-ok`**: Cổng hợp nhất bắt buộc tất cả các bước trên đạt kết quả xanh mới cho phép merge.

### 7.3. Module `cd-release`: Workflow Phát Hành Desktop (`.github/workflows/release.yml`)

Workflow kích hoạt khi:

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:
```

Các bước chi tiết trên runner `windows-latest`:

1. Checkout mã nguồn với đầy đủ commit history (`fetch-depth: 0`).
2. Cài đặt Node.js 20, pnpm 10+, và Rust stable toolchain MSVC.
3. Build Vite Web Frontend: `pnpm run build:admin`.
4. Sử dụng action chính thức `tauri-apps/tauri-action@v0`:
   - `projectPath: './apps/web-admin'`
   - `tagName: \${\{ github.ref_name }}`
   - `releaseName: 'Admin \${\{ github.ref_name }}'`
   - `releaseBody: 'Xem chi tiết các thay đổi trong phiên bản \${\{ github.ref_name }}.'`
   - `releaseDraft: false`
   - `prerelease: false`
   - Biến môi trường:
     - `GITHUB_TOKEN: \${\{ secrets.GITHUB_TOKEN }}`
     - `TAURI_SIGNING_PRIVATE_KEY: \${\{ secrets.TAURI_SIGNING_PRIVATE_KEY }}`
     - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD: \${\{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}`
5. Action sẽ tự động upload:
   - `Admin_<version>_x64-setup.exe` (NSIS Installer)
   - `Admin_<version>_x64_en-US.msi` (MSI Installer)
   - `latest.json` (phục vụ tự động cập nhật OTA cho app người dùng đang mở)
   - Chữ ký xác thực `.sig`.

---

## 8. Boundaries (Ranh Giới Thực Thi)

- **Luôn luôn làm (Always):**
  - Tách bạch rõ ràng giữa CI (chạy trên Linux nhanh, tiết kiệm chi phí) và CD Release (chạy trên Windows để đóng gói native Windows MSI/NSIS).
  - Sử dụng GitHub Actions Secrets cho Private Key, không bao giờ in hay log private key ra console runner.
  - Đảm bảo các link download trên index trỏ trực tiếp đến `https://github.com/operon/console/releases/latest/download/...`.
- **Hỏi ý kiến trước (Ask first):**
  - Nếu muốn hỗ trợ thêm macOS (`.dmg`) hoặc Linux (`.AppImage`/`.deb`) trong CD pipeline (yêu cầu thêm runner `macos-latest` và `ubuntu-latest`).
- **Không bao giờ làm (Never):**
  - Hardcode GitHub Token hoặc Private Key trong file yaml của `.github/workflows/`.
  - Bỏ qua các Quality Gates (bỏ qua `test:unit` hoặc `check:console`) để release nhanh.

---

## 9. Success Criteria (Tiêu Chí Nghiệm Thu)

1. **Repo Sanitization Clean:** Không còn bất kỳ file workflow hay template nào tham chiếu tới `operon/admin`.
2. **OSS Compliance:** Đầy đủ file `LICENSE` (MIT) và `SECURITY.md`.
3. **CI Pipeline Validation:** File `.github/workflows/ci.yml` chuẩn cú pháp GitHub Actions, bao gồm cả gate `tauri:check` và `check:console`.
4. **CD Release Workflow Ready:** File `.github/workflows/release.yml` sẵn sàng biên dịch trên Windows runner, tích hợp `tauri-action`, tự động tạo GitHub Release và đính kèm file cài đặt `.exe`, `.msi`, cùng `latest.json` khi push tag `v*.*.*`.
5. **index Download Section:** Có bảng hướng dẫn tải và cài đặt file `.exe` cho người dùng cuối.

---

## 10. Open Questions (Câu Hỏi Mở Chờ Xác Nhận)

1. **Nền tảng phát hành:** Phiên bản phát hành đầu tiên này có cần tập trung duy nhất cho **Windows (x64 NSIS + MSI)** như yêu cầu hiện tại, hay bạn muốn mở rộng thêm **macOS (DMG)** và **Linux (.AppImage/.deb)** trong tương lai gần?
2. **Release Notes Generator:** Bạn muốn GitHub Release tự động trích xuất nội dung từ commit messages (`release-drafter`) hay dùng GitHub automatic release notes generator mặc định?
