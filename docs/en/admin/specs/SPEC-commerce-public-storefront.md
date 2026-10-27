# Spec: Cửa Hàng Sản Phẩm Số Công Khai & Thanh Toán Khách Vãng Lai (`public-storefront`)

> **Mã đặc tả:** `SPEC-public-storefront`  
> **Module id:** `public-storefront` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`SPEC-commerce-payment-gateway.md`](SPEC-commerce-payment-gateway.md), [`SPEC-commerce-digital-store.md`](SPEC-commerce-digital-store.md), [`SPEC-commerce-admin-portal.md`](SPEC-commerce-admin-portal.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu Nghiệp Vụ & Kỹ Thuật)

Xây dựng phân hệ **Public Storefront (`/store`)** trong `@operon/admin-web` cho phép khách hàng vãng lai (Guest Checkout — không cần tài khoản đăng nhập) duyệt danh mục sản phẩm số công khai, thanh toán tự động qua đa kênh và nhận bàn giao sản phẩm tức thì thông qua mã bảo mật `claim_token`:

1. **Truy cập Công khai Không Cần Đăng Nhập (`/store`):** Đăng ký trong `coreRoutes` (`src/router/routes/core.ts`, `ignoreAccess: true`), sử dụng cờ `{ skipAuth: true }` trên mọi lời gọi API để truy vấn qua `anon` key hợp lệ với chính sách RLS công khai (`visibility = 'public'`).
2. **Danh Mục Sản Phẩm Số Công Khai (`catalog` mode):** Lọc theo danh mục, loại sản phẩm (`serial_stock`, `digital_file`) và tìm kiếm từ khóa; hiển thị tồn kho khả dụng, giá niêm yết theo `Xu` kèm quy đổi tham khảo sang tiền tệ cổng thanh toán.
3. **Thanh Toán Khách Vãng Lai Đa Kênh (`GuestCheckoutDialog`):** Hỗ trợ đặt mua SKU công khai qua VietQR 24/7 (`bank_transfer`), Ví điện tử MoMo (`e_wallet`), Thẻ quốc tế Stripe (`card_intl`), và Crypto USDT (`crypto`); tự động lưu cặp `(order_code, claim_token)` vào `localStorage` (`OPERON_GUEST_ORDERS`) và kiểm tra trạng thái đơn hàng mỗi 3 giây.
4. **Tra Cứu Đơn Hàng & Nhận Tài Nguyên (`lookup` mode):** Cho phép khách hàng tra cứu lại đơn hàng bất kỳ lúc nào bằng cặp `order_code` (`ORD-...`) + `claim_token` (`CLM_...`) hoặc chọn nhanh từ danh sách đơn hàng đã lưu trên trình duyệt để sao chép tài khoản/key (`uid|pass|2fa`), tải tệp `.txt` hoặc tải tệp số.

---

## 2. Tech Stack

- **Frontend Application:** `@operon/admin-web` (Vue 3 `<script setup lang="ts">`, TypeScript, Vue Router 4, `vue-i18n`).
- **UI Components & Icons:** `@operon/vue-ui` (`Badge`, `Button`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle`, `toast`), `@lucide/vue`.
- **Public Data Access Layer:** `src/api/core/billing.ts` (`skipAuth: true`) & `src/api/core/commerce.ts` (`skipAuth: true`).

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho API Core và Router
pnpm --filter @operon/admin-web run test:unit -- src/api/core src/router

# 2. Kiểm tra kiểu dữ liệu TypeScript (Zero errors)
pnpm --filter @operon/admin-web run typecheck

# 3. Quét tĩnh mã nguồn oxlint
pnpm run lint
```

---

## 4. Project Structure (Cấu Trúc Tệp Nguồn)

```text
admin/apps/web-admin/
├── docs/
│   ├── routes/
│   │   └── commerce.md                              # Tài liệu chi tiết định tuyến /commerce & /store
│   └── specs/
│       └── SPEC-commerce-public-storefront.md                # Bản đặc tả hiện tại
└── src/
    ├── api/core/
    │   ├── billing.ts                               # Hỗ trợ options?: { skipAuth?: boolean } cho getActivePaymentGatewaysApi
    │   ├── commerce.ts                              # getSavedGuestOrders, saveGuestOrderLocal & skipAuth cho Guest Checkout
    │   └── __tests__/
    │       ├── billing.test.ts                      # Unit test cho getActivePaymentGatewaysApi({ skipAuth: true })
    │       └── commerce.test.ts                     # Unit test cho getSavedGuestOrders & saveGuestOrderLocal
    ├── locales/langs/
    │   ├── en-US/page.json                          # Khóa đa ngôn ngữ page.commerce.publicStore*
    │   └── vi-VN/page.json                          # Khóa đa ngôn ngữ page.commerce.publicStore*
    ├── router/routes/
    │   └── core.ts                                  # Đăng ký route công khai /store (PublicStorefront, ignoreAccess: true)
    └── views/commerce/
        ├── store/
        │   └── index.vue                            # Nút mở nhanh Storefront công khai (/store)
        └── public-store/
            └── index.vue                            # Giao diện Storefront công khai, Guest Checkout & Tra cứu claim_token
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Cơ Chế Truy Xuất Không Cần JWT (`skipAuth: true`) & Bảo Toàn `claim_token`

Tất cả các hàm API phục vụ `/store` truyền `{ skipAuth: true }` xuống `supabaseRequest` để chỉ đính kèm `apikey: anonKey` mà không yêu cầu phiên đăng nhập của người dùng:

```typescript
export interface SavedGuestOrderItem {
  buyer_email: string;
  claim_token: string;
  created_at: string;
  order_code: string;
  total_credits: number;
}

const GUEST_ORDERS_STORAGE_KEY = 'OPERON_GUEST_ORDERS';

export function saveGuestOrderLocal(
  item: SavedGuestOrderItem,
): SavedGuestOrderItem[] {
  const existing = getSavedGuestOrders().filter(
    (entry) => entry.order_code !== item.order_code,
  );
  const updated = [item, ...existing].slice(0, 20);
  localStorage.setItem(GUEST_ORDERS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
```

### 5.2. Luồng Nhận Hàng Tự Động Qua URL Query & Polling 3 Giây

- Khi khách vãng lai khởi tạo đơn hàng qua `createCheckoutOrderApi(..., { skipAuth: true })`, RPC trả về `claim_token` (`CLM_` + 32 hex) duy nhất một lần.
- Giao diện lưu ngay vào `localStorage` và đồng bộ lên URL query (`?order=ORD-...&token=CLM_...`) để khách hàng có thể đánh dấu trang (bookmark) hoặc tải lại trang (F5) mà không mất quyền truy cập đơn hàng.
- Bộ hẹn giờ kiểm tra `getGuestOrderDeliveriesApi(order_code, claim_token)` mỗi 3 giây sẽ tự động dừng và hiển thị dữ liệu bàn giao ngay khi `order.status === 'completed'`.

---

## 6. Testing Strategy

1. **Kiểm thử Đơn vị (`billing.test.ts` & `commerce.test.ts`):**
   - Xác minh `getActivePaymentGatewaysApi({ skipAuth: true })`, `getCommerceCategoriesApi({ skipAuth: true })`, `getCommerceProductsApi({ skipAuth: true })`, `createCheckoutOrderApi(..., { skipAuth: true })`, và `getGuestOrderDeliveriesApi` truyền đúng `skipAuth: true`.
   - Xác minh `saveGuestOrderLocal` và `getSavedGuestOrders` chống trùng lặp theo `order_code`, giới hạn tối đa 20 đơn gần nhất và xử lý an toàn khi `localStorage` chứa dữ liệu lỗi.
2. **Kiểm thử Định tuyến (`core.ts`):**
   - Xác minh route `/store` (`name: 'PublicStorefront'`) nằm trong `coreRouteNames` để `setupAccessGuard` cho phép khách chưa đăng nhập truy cập thẳng.

---

## 7. Boundaries

- **Always do (Luôn thực hiện):**
  - Truyền `{ skipAuth: true }` trên mọi lời gọi API trong `src/views/commerce/public-store/index.vue`.
  - Lưu trữ `claim_token` vào `localStorage` ngay tại thời điểm tạo đơn thành công trước khi hiển thị mã QR thanh toán.
  - Chỉ cho phép Guest Checkout đặt mua các sản phẩm có `visibility === 'public'` và `product_type IN ('serial_stock', 'digital_file')`.
- **Ask first (Hỏi trước khi thực hiện):**
  - Cho phép khách vãng lai mua các loại tài nguyên gắn chặt với định danh Tenant (`resource` hoặc `wallet_credit`).
- **Never do (Tuyệt đối cấm):**
  - Không bao giờ cho phép khách vãng lai sử dụng phương thức `internal_wallet` (Ví Xu nội bộ chỉ dành cho Tenant đã xác thực).
  - Không bao giờ lưu trữ thông tin thẻ tín dụng hoặc khóa bí mật thanh toán trong `localStorage`.

---

## 8. Success Criteria

- [x] Route `/store` truy cập công khai không cần đăng nhập, không bị đẩy về `/auth/login`.
- [x] Khách vãng lai có thể chọn SKU `public`, nhập email, chọn cổng thanh toán (VietQR / MoMo / Stripe / USDT), nhận mã QR + `transfer_code` (`TQ...`) và mã bảo mật `claim_token` (`CLM_...`).
- [x] Hệ thống tự động lưu `(order_code, claim_token)` vào `localStorage` và tự động bàn giao sản phẩm (`uid|pass|2fa` sao chép / tải `.txt`, hoặc link tải tệp) ngay khi thanh toán hoàn tất.
- [x] Chế độ **Tra cứu & Nhận hàng (`lookup`)** hoạt động chính xác với cả nhập tay, chọn từ lịch sử trình duyệt và tham số URL `?order=...&token=...`.
- [x] Vượt qua 100% `vitest`, `vue-tsc` (`0 errors`) và `oxlint` (`0 warnings/errors`).

---

## 9. Resolved Decisions

1. **Định tuyến Công khai trong `coreRoutes` (`/store`):** Đăng ký `/store` trực tiếp trong `src/router/routes/core.ts` với `meta: { ignoreAccess: true, hideInMenu: true }` để tách biệt hoàn toàn khỏi khung Sidebar quản trị (`BasicLayout`) và mở quyền truy cập cho khách vãng lai.
2. **Bảo mật Bàn giao Không Tài Khoản qua `claim_token` (`CLM_...`):** Thay vì bắt buộc khách vãng lai tạo tài khoản hoặc chờ email, hệ thống cấp phát `claim_token` ngẫu nhiên 128-bit (lưu băm SHA-256 `guest_claim_token_hash` trong DB) kết hợp lưu cục bộ `localStorage` để nhận bàn giao tức thì trên trình duyệt.
