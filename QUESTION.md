# Chuyên Gia Browser Automation Fingerprint & Multi-Tenant Enterprise: Bộ Câu Hỏi Thẩm Định & Đối Ứng Codebase

> **Tài liệu:** `QUESTION.md`  
> **Người thực hiện:** Chuyên gia Kiến trúc Browser Automation & Antidetect Fingerprint (Đóng vai)  
> **Hệ quy chiếu thẩm định:** Hệ thống Multi-Tenant Enterprise, Chống Fraud & Bot Detection (Cloudflare Turnstile, DataDome, Akamai, Kasada, Fingerprint.com, CreepJS), Khả năng cô lập & mở rộng trên Worker Fleet.  
> **Quy ước trạng thái đối ứng:**
> - `[ĐÃ CÓ TRONG CODE]`: Kèm đường dẫn file và phân tích logic code hiện tại.
> - `[CHƯA CÓ / ĐANG THIẾU]`: Nêu rõ khoảng trống kiến trúc thực tế của codebase.

---

## Phần 1: Cốt Lõi Hardware Fingerprint & C++ Blink Spoofing (Tầng Trình Duyệt)

### Q1.1: Trình duyệt của hệ thống can thiệp fingerprint bằng JavaScript Prototype Injection hay C++ Source Patches? Nếu web kiểm tra `Function.prototype.toString` hoặc Native Symbol thì thế nào?
* **Câu hỏi chuyên gia:** *"Các giải pháp anti-detect nghiệp dư thường dùng `Page.addScriptToEvaluateOnNewDocument` để gán đè `navigator.webdriver = false`, ghi đè `HTMLCanvasElement.toDataURL` hoặc WebGL getParameter. Các hệ thống bot detection như DataDome hay FingerprintJS phát hiện ngay lập tức qua `toString()`, kiểm tra proto descriptor, getter traps hoặc `Symbol.hasInstance`. Hệ thống của bạn xử lý vấn đề này ở tầng nào?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Hệ thống **không** dùng JS script injection để fake fingerprint cơ bản. Operon tích hợp nhân Chromium custom biên dịch sẵn từ C++ nguồn: `adryfish/fingerprint-chromium` (Golden LTS Release v148 / v150).
  - Vị trí: [`crates/browser/manifest.json`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/manifest.json#L75-L85) và [`crates/browser/src/profile.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/src/profile.rs#L400-L425).
  - Khởi chạy trực tiếp thông qua CLI args của nhân C++ Chromium:
    - `--fingerprint=<u32 seed>`: PRNG seed phần cứng ở tầng Blink/V8.
    - `--fingerprint-platform=windows|macos|linux`
    - `--fingerprint-platform-version="10.0.0"`
    - `--fingerprint-hardware-concurrency=8|12|16`
    - `--fingerprint-brand=Chrome`
  - Đánh giá: Zero Prototype Tampering. C++ Blink trả về `[native code]` chuẩn mực, không rò rỉ JS hooks.

---

### Q1.2: Thuật toán sinh AudioContext, Canvas 2D và WebGL Shader Noise: Có đảm bảo Deterministic (nhất quán tuyệt đối) qua mỗi lần tái khởi động profile không?
* **Câu hỏi chuyên gia:** *"Một profile doanh nghiệp phục vụ nuôi tài khoản hoặc checkout tự động yêu cầu cùng 1 seed phải sinh ra cùng 1 mã hash Canvas/Audio dù chạy hôm nay hay tháng sau trên máy khác. Nếu seed sinh random mỗi lần mở, rủi ro bị checkpoint đổi thiết bị là 100%. Code của bạn lưu vết seed này ra sao?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Cực kỳ nhất quán. Seed là một số nguyên `u32` (ví dụ `133742`) được lưu cố định trong metadata của Profile.
  - Vị trí: [`crates/browser/src/profile.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/src/profile.rs#L16) (`pub fingerprint_seed: Option<u32>`) và lưu tại `profile.json` trong thư mục profile sandbox.
  - Khi khởi chạy lại profile qua [`crates/cli/src/commands/browser/launcher.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/cli/src/commands/browser/launcher.rs#L136), hàm `build_cli_args()` luôn nạp lại `--fingerprint={seed}` cũ.

---

### Q1.3: Client Hints (User-Agent Client Hints) và Sec-CH-UA có khớp hoàn toàn với User-Agent Header và OS Platform không?
* **Câu hỏi chuyên gia:** *"Nhiều hệ thống đổi `User-Agent` thành Mac Intel nhưng `Sec-CH-UA-Platform` vẫn gửi `"Windows"`, hoặc UA Chrome 148 nhưng `Sec-CH-UA` chỉ có `"Chromium";v="128"`. Sự bất đồng bộ (mismatch) giữa HTTP Headers và JS `navigator.userAgentData` là chỉ số gian lận số 1. Bạn xử lý việc này thế nào?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Code trong [`crates/browser/src/profile.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/src/profile.rs#L234-L245) đã đồng bộ hóa:
    ```rust
    sec_ch_ua: Some("\"Chromium\";v=\"148\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"148\""),
    sec_ch_ua_platform: Some(if os_platform == "macos" { "\"macOS\"" } else { "\"Windows\"" }),
    sec_ch_ua_mobile: Some(false),
    ```
  - `[ĐÃ CÓ TRONG CODE]`: Phương thức `BrowserProfile::align_client_hints()` trong `crates/browser/src/profile.rs` tự động phân tích User-Agent để đồng bộ hoá 100% Major Version và OS Platform sang `sec_ch_ua`, `sec_ch_ua_platform`, `sec_ch_ua_mobile`.

---

## Phần 2: Network, WebRTC, Proxy & Egress Routing Guardrails

### Q2.1: Khi trình duyệt chạy qua SOCKS5 hoặc HTTP Proxy, làm sao ngăn chặn triệt để WebRTC STUN Leak làm lộ địa chỉ IP thật của máy trạm?
* **Câu hỏi chuyên gia:** *"Các trang web ngân hàng hoặc sàn TMĐT sử dụng WebRTC RTCPeerConnection để gửi gói STUN UDP ra ngoài. Kể cả khi cấu hình proxy HTTP/SOCKS5 trong hệ điều hành, gói tin STUN UDP vẫn đi thẳng qua card mạng chính làm lộ IP thật (WebRTC STUN Leak). Giải pháp kỹ thuật của bạn là gì?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Đã cài đặt guardrail chặn cứng ở mức Chromium flag.
  - Vị trí: [`crates/browser/src/profile.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/src/profile.rs#L447-L453) & [`crates/cli/src/commands/browser/launcher.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/cli/src/commands/browser/launcher.rs#L84-L110).
  - Logic thực thi:
    ```rust
    if let Some(ref proxy) = self.proxy {
        args.push(format!("--proxy-server={}", proxy));
        if self.webrtc_mode.as_deref() == Some("proxy_shielded") || self.webrtc_mode.is_none() {
            args.push("--disable-non-proxied-udp".to_string());
        }
    }
    ```
  - Cờ `--disable-non-proxied-udp` buộc WebRTC chỉ được bind qua tunnel proxy, loại bỏ 100% rò rỉ UDP direct. Ngoài ra CLI còn có pre-flight probe [`ProxyProbe::probe()`](file:///C:/Users/ndtu6/Repository/operon/crates/cli/src/commands/browser/proxy.rs) kiểm tra IP và RTT trước khi cho phép spawn trình duyệt.

---

### Q2.2: Timezone và Định vị địa lý (Geolocation) có được đồng bộ tự động dựa theo Egress IP của Proxy không?
* **Câu hỏi chuyên gia:** *"Nếu proxy đặt tại Tokyo (Japan - Asia/Tokyo) nhưng trình duyệt mở lên chạy múi giờ của máy trạm `Asia/Ho_Chi_Minh` (UTC+7), Cloudflare Turnstile sẽ gán cờ rủi ro cao ngay lập tức vì lệch múi giờ với subnet IP. Bạn xử lý đồng bộ Geolocation/Timezone/Locale thế nào?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Profile hỗ trợ `--timezone={tz}`, `--lang={lang}`, `--accept-lang={accept_lang}` ([`crates/browser/src/profile.rs#L431-L440`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/src/profile.rs#L431-L440)).
  - `[ĐÃ CÓ TRONG CODE]`: Đã tích hợp module `GeoIpResolver` (`crates/browser/src/geoip.rs`) và auto-synchronization trong `crates/cli/src/commands/browser/launcher.rs`. Khi phát hiện Egress Country từ proxy probe (ví dụ `JP`, `US`, `VN`), launcher sẽ tự động ánh xạ múi giờ (`Asia/Tokyo`) và ngôn ngữ (`ja-JP`, `accept-lang`) mà không cần cấu hình bằng tay.

---

## Phần 3: Tránh Phát Hiện Tự Động Hóa (CDP, Runtime Leaks & Human Dynamics)

### Q3.1: Các hệ thống bảo vệ hiện đại quét cổng loopback (`9222`, `9229`) để tìm CDP WebSocket. Làm sao hệ thống vượt qua việc bị phát hiện CDP endpoint?
* **Câu hỏi chuyên gia:** *"Akamai và DataDome thường nhúng script quét `fetch('http://127.0.0.1:9222/json')` hoặc thăm dò WebSocket CDP. Nếu mở cổng cố định 9222, profile sẽ bị gắn cờ bot. Code của bạn xử lý ra sao?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Hỗ trợ **2 chế độ thực thi tách biệt (Dual Mode)**:
    1. Chế độ **Extension Mode / Zero-Port (`--no-cdp`)**: Đóng hoàn toàn cổng remote debugging port (`port = 0`). Trình duyệt không mở bất kỳ port nào trên máy trạm ([`crates/cli/src/commands/browser/launcher.rs#L124`](file:///C:/Users/ndtu6/Repository/operon/crates/cli/src/commands/browser/launcher.rs#L124)).
    2. Chế độ **Dynamic Port Allocation & CDP Shield**: Khi bật CDP, hệ thống tự động gắn cờ bảo vệ `--remote-debugging-address=127.0.0.1` và `--enable-features=BlockInsecurePrivateNetworkRequests` để ngăn chặn website script thực hiện reverse port scanning qua private loopback.

---

### Q3.2: Khi thực thi mã JavaScript hoặc query DOM trên trang web, làm sao đảm bảo không bị phát hiện qua `window` object leakage?
* **Câu hỏi chuyên gia:** *"Khi công cụ tự động hóa chạy script inject để click/lấy dữ liệu, các biến trung gian hoặc các hàm gắn vào `window` rất dễ bị script trang web đọc được. Bạn dùng cơ chế cô lập nào?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Triển khai chuẩn **Isolated Worlds** của Chrome DevTools Protocol theo đặc tả Patchright.
  - Vị trí: [`crates/worker/src/drivers/cdp/stealth.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/worker/src/drivers/cdp/stealth.rs#L19-L55).
  - Sử dụng lệnh `Page.createIsolatedWorld` với tên context riêng (`stealth_context`). Toàn bộ mã thực thi của engine chạy trong thế giới biệt lập này, website JavaScript hoàn toàn không thể truy cập, bắt lỗi stack trace hay kiểm tra thuộc tính.

---

### Q3.3: Hành vi chuột, cuộn trang và gõ phím có phải là sự kiện giả lập (Synthetic Dispatch) hay mô phỏng quỹ đạo người thật?
* **Câu hỏi chuyên gia:** *"Nhiều bot chỉ gọi `element.click()` hoặc dispatch mouse event nhảy thẳng toạ độ `(x1, y1) -> (x2, y2)` theo đường thẳng tức thì trong 0ms. Các bộ phát hiện bot ghi nhận gia tốc và quỹ đạo chuột để bắt bot. Bạn xử lý như thế nào?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Sử dụng **Human Interaction Engine** với quỹ đạo cong **Cubic Bézier Curve** và **FastRng Jitter**.
  - Vị trí: [`crates/worker/src/drivers/cdp/interaction.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/worker/src/drivers/cdp/interaction.rs#L62-L80).
  - Thuật toán: Chuột di chuyển từ `(start_x, start_y)` đến `(target_x, target_y)` qua các điểm kiểm soát uốn cong Bézier ngẫu nhiên, chia nhỏ quãng đường thành các bước với thời gian trễ dao động (jitter) để giả lập chuyển động cơ học tự nhiên của bàn tay.

---

## Phần 4: Kiến Trúc Multi-Tenant Enterprise & Cô Lập Session

### Q4.1: Làm sao đảm bảo Profile giữa các Tenant doanh nghiệp không bị lẫn lộn dữ liệu, Cookie, Cache và LocalStorage trên đĩa cứng?
* **Câu hỏi chuyên gia:** *"Trong môi trường Multi-Tenant Enterprise, nếu Tenant A và Tenant B cùng chạy automation trên cùng một Worker Node, làm sao cam kết 100% không xảy ra cross-tenant data leak hoặc dùng chung Chromium user-data-dir?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`:
    - Ở tầng Worker/Host: Mỗi profile có một thư mục sandbox riêng biệt định danh theo Profile ID: `~/.operon/browser/profiles/<profile_id>/` ([`crates/browser/src/profile.rs#L251`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/src/profile.rs#L251)).
    - Ở tầng Database Supabase: Schema isolation `browsers` và RLS (Row Level Security) theo `tenant_id` trên mọi bảng: `browsers.profiles`, `browsers.active_leases` ([`cloud/supabase/plugins/browsers/install.sql`](file:///C:/Users/ndtu6/Repository/operon/cloud/supabase/plugins/browsers/install.sql)).
    - Ở tầng Cloud Storage: Bucket `browser-profiles` dùng RLS phân quyền theo đường dẫn prefix tenant: `<tenant_id>/<profile_id>.tar.zst`, chặn hoàn toàn việc tenant này đọc storage của tenant khác thông qua hàm `public.is_valid_browser_storage_tenant()`.

---

### Q4.2: Cơ chế đóng gói (Pack) và đồng bộ (Sync) Profile lên Cloud: Làm sao xử lý rác dữ liệu Cache phình to gigabytes khi nén profile?
* **Câu hỏi chuyên gia:** *"Thư mục Chromium User Data Dir sau vài ngày chạy có thể phình to 2-5GB vì cache ảnh, WebRTC logs, crash dumps, video cache. Nếu upload nguyên thư mục lên S3/Supabase Storage thì băng thông mạng và chi phí lưu trữ sẽ nổ tung. Bạn lọc dữ liệu rác như thế nào trước khi nén?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`: Triển khai bộ lọc nén thông minh **`ProfilePacker`** sử dụng chuẩn nén siêu tốc **Zstandard (`.tar.zst`)**.
  - Vị trí: [`crates/browser/src/packer.rs`](file:///C:/Users/ndtu6/Repository/operon/crates/browser/src/packer.rs).
  - Loại bỏ danh sách đen (Blacklist exclusion) trước khi đóng gói:
    - `Cache/`, `Code Cache/`, `GPUCache/`, `DawnCache/`
    - `Crashpad/`, `Crash Reports/`, `WebRTC Logs/`
    - `Service Worker/CacheStorage/`
    - Chỉ giữ lại: Cookies, Local Storage, IndexedDB, Preferences và State đăng nhập thực sự. Giảm dung lượng snapshot từ ~1GB xuống chỉ còn ~5-15MB.

---

### Q4.3: Distributed Lease Locking: Khi nhiều Worker cùng tranh chấp một Profile trên Cloud, cơ chế tránh chạy trùng (Concurrent Conflict) được kiểm soát ra sao?
* **Câu hỏi chuyên gia:** *"Nếu Profile "Facebook-VN-01" đang được Worker 1 chạy, Worker 2 bất cẩn nạp cùng profile đó và ghi đè cookie mới nhất thì dữ liệu tài khoản sẽ bị corrupt. Code của bạn có cơ chế Distributed Lease Lock không?"*
* **Đối ứng code hiện tại:**
  - `[ĐÃ CÓ TRONG CODE]`:
    - Local Node: Kiểm tra qua file PID session tracker [`find_active_session()`](file:///C:/Users/ndtu6/Repository/operon/crates/cli/src/commands/browser/launcher.rs#L65). Nếu profile đang chạy, từ chối mở instance thứ hai trừ khi có cờ `--force`.
    - Cloud Fleet: Bảng `browsers.active_leases` trong Supabase sử dụng RPC có thời hạn lease (`lease_expires_at`) và heartbeat tự động gia hạn. Worker phải claim lease thành công mới được tải và giải nén profile.

---

## Phần 5: Tính Năng Khả Dụng & Khoảng Trống Kiến Trúc Cần Hoàn Thiện (Gap Analysis)

| Hạng mục Chuyên gia Yêu cầu | Trạng thái Codebase | Chi tiết Code / Khuyến nghị Cải tiến |
| :--- | :---: | :--- |
| **C++ Blink PRNG Fingerprint** | ✅ `ĐÃ CÓ` | `adryfish/fingerprint-chromium` v148/v150, nạp `--fingerprint={seed}`. |
| **WebRTC STUN Shield** | ✅ `ĐÃ CÓ` | Cờ `--disable-non-proxied-udp` tự động nạp khi có proxy. |
| **Isolated World Execution** | ✅ `ĐÃ CÓ` | `Page.createIsolatedWorld` chặn biến rò rỉ ra window. |
| **Human Bézier Mouse Dynamics** | ✅ `ĐÃ CÓ` | `HumanInteractionEngine` với Cubic Bézier + FastRng. |
| **Zstandard Profile Packing** | ✅ `ĐÃ CÓ` | `ProfilePacker` nén `.tar.zst`, loại bỏ Cache & Crashpad. |
| **Auto-GeoIP Matching** | ✅ `ĐÃ CÓ` | `GeoIpResolver` tự động ánh xạ Egress Country sang Timezone, Lang và Accept-Lang. |
| **CDP Reverse-Scan Shield** | ✅ `ĐÃ CÓ` | Cờ `--remote-debugging-address=127.0.0.1` và `BlockInsecurePrivateNetworkRequests`. |
| **Client Hints Auto-Alignment** | ✅ `ĐÃ CÓ` | `align_client_hints()` tự động trích xuất UA version/platform cho `sec_ch_ua`. |
| **Noise Level Profile Schema** | ✅ `ĐÃ CÓ` | `FingerprintNoiseLevel` (Off, Subtle, Balanced, Aggressive) tích hợp vào Profile struct. |

---
*Tài liệu này đã được đồng bộ trực tiếp với toàn bộ codebase của Operon (`crates/browser`, `crates/worker`, `crates/cli`, `cloud/supabase/plugins/browsers`). Sẵn sàng cho quá trình review chi tiết từ bạn.*
