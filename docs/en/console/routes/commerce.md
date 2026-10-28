# Đặc Tả Route: Thương Mại Số, Ví Xu & Cửa Hàng Công Khai (Commerce & Storefront)

> **Module Files:** `src/router/routes/modules/commerce.ts` & `src/router/routes/core.ts`  
> **Plugin Boundaries:** `commerce` (`schema: commerce`) & `subscriptions` (`schema: billing`)  
> **API Clients:** `src/api/core/commerce.ts` & `src/api/core/billing.ts`  
> **Tài liệu đặc tả liên quan:** [`SPEC-commerce-payment-gateway.md`](../specs/SPEC-commerce-payment-gateway.md) | [`SPEC-commerce-digital-store.md`](../specs/SPEC-commerce-digital-store.md) | [`SPEC-commerce-admin-portal.md`](../specs/SPEC-commerce-admin-portal.md) | [`SPEC-commerce-public-storefront.md`](../specs/SPEC-commerce-public-storefront.md)

---

## 1. Cấu Trúc Định Tuyến Hợp Nhất (`/commerce` & `/store`)

Phân hệ thương mại điện tử gồm **3 tuyến đường nội bộ** dưới nhóm Sidebar `/commerce` (`BasicLayout`), **1 module độc lập `/wallet`** (Ví Xu, plugin `subscriptions`, `alias: '/commerce/wallet'`) và **1 tuyến đường công khai** `/store` trong `core.ts` dành cho khách hàng vãng lai (`Guest Checkout`):

```typescript
// 1. Nhóm Sidebar nội bộ: src/router/routes/modules/commerce.ts
{
  name: 'Commerce',
  path: '/commerce',
  redirect: '/commerce/store',
  meta: {
    icon: 'lucide:shopping-bag',
    order: 25,
    title: $t('page.commerce.title'),
  },
  children: [
    {
      name: 'CommerceStore',
      path: '/commerce/store',
      component: () => import('#/views/commerce/store/index.vue'),
      meta: {
        authority: ['superadmin', 'commerce:read'],
        icon: 'lucide:store',
        plugin: 'commerce',
        title: $t('page.commerce.store'),
      },
    },
    {
      name: 'CommerceOrders',
      path: '/commerce/orders',
      component: () => import('#/views/commerce/orders/index.vue'),
      meta: {
        authority: ['superadmin', 'commerce:read'],
        icon: 'lucide:package-check',
        plugin: 'commerce',
        title: $t('page.commerce.orders'),
      },
    },
    {
      name: 'CommerceAdmin',
      path: '/commerce/admin',
      component: () => import('#/views/commerce/admin/index.vue'),
      meta: {
        authority: ['superadmin', 'commerce:manage'],
        icon: 'lucide:sliders-horizontal',
        plugin: 'commerce',
        title: $t('page.commerce.admin'),
      },
    },
  ],
}

// 2. Tuyến công khai khách vãng lai: src/router/routes/core.ts
{
  name: 'PublicStorefront',
  path: '/store',
  component: () => import('#/views/commerce/public-store/index.vue'),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    ignoreAccess: true,
    title: $t('page.commerce.publicStore'),
  },
}
```

---

## 2. Chi Tiết Nghiệp Vụ Từng Tuyến Đường

### 2.1. Cửa Hàng Tài Nguyên Số Nội Bộ (`/commerce/store`)

- **File Giao Diện:** `src/views/commerce/store/index.vue`
- **Nguồn Dữ Liệu:** `commerce.categories`, `commerce.products`, `commerce.product_variants`, `billing.wallets`, `billing.payment_gateways`
- **Chức Năng Cốt Lõi:**
  - Chọn Workspace thao tác, hiển thị số dư Ví `Xu` thời gian thực và nút mở nhanh cửa hàng công khai `/store`.
  - Lọc sản phẩm theo danh mục, loại tài nguyên (`serial_stock`, `resource`, `digital_file`, `wallet_credit`) và từ khóa.
  - Đặt mua biến thể SKU bằng **Ví Xu (`internal_wallet`)** nhận bàn giao tức thì (< 100ms) hoặc thanh toán qua cổng ngoại vi (VietQR, MoMo, Stripe, Crypto USDT) kèm cơ chế tự động kiểm tra trạng thái đơn hàng mỗi 3 giây.

### 2.2. Lịch Sử Đơn Hàng & Nhận Tài Nguyên (`/commerce/orders`)

- **File Giao Diện:** `src/views/commerce/orders/index.vue`
- **Nguồn Dữ Liệu:** `commerce.orders`, `commerce.order_items`, `commerce.order_deliveries`
- **Chức Năng Cốt Lõi:**
  - Hiển thị 3 thẻ KPI (Tổng đơn hàng, Đơn hoàn tất, Tổng Xu đã chi) và bảng `useVbenVxeGrid<CommerceOrderRecord>` tích hợp bộ lọc trạng thái và từ khóa.
  - Hộp thoại **Nhận Tài Nguyên (`OrderDeliveriesDialog`)**: Sao chép 1 chạm hoặc tải tệp `.txt` cho danh sách tài khoản/key (`serial_stock`), xem thông tin cấp phát tự động cho `resource` (`automation.workflows`, `workers.proxies`, `billing.subscriptions`), hoặc tải tệp `digital_file`.

### 2.3. Ví Xu & Sổ Cái Giao Dịch (`/wallet`, alias `/commerce/wallet`)

- **File Giao Diện:** `src/views/commerce/wallet/index.vue`
- **Nguồn Dữ Liệu:** `billing.wallets`, `billing.wallet_transactions`, `billing.payment_gateways`, `billing.payment_intents`
- **Chức Năng Cốt Lõi:**
  - Hiển thị 3 thẻ KPI Ví Xu: Số dư khả dụng (`balance_credits`), Tổng Xu đã nạp (`total_topped_up_credits`), Tổng Xu đã chi tiêu (`total_spent_credits`).
  - Hộp thoại **Nạp Xu Đa Kênh**: Chọn mệnh giá Xu nạp nhanh hoặc tùy chỉnh, tự động tính số tiền thanh toán theo `rate_per_credit` của cổng đã chọn, hiển thị mã QR / nội dung chuyển khoản `TQ...` và tự động cập nhật số dư khi Webhook khớp lệnh.
  - Bảng sổ cái biến động số dư `useVbenVxeGrid<WalletTransactionItem>` lọc theo loại giao dịch (`topup`, `purchase`, `bonus`, `refund`, `admin_adjustment`).

### 2.4. Quản Trị Cửa Hàng & Cổng Thanh Toán (`/commerce/admin`)

- **File Giao Diện:** `src/views/commerce/admin/index.vue`
- **Quyền Truy Cập:** `['superadmin', 'commerce:manage']`
- **Chức Năng Cốt Lõi (4 Mode Tabs dùng `useVbenVxeGrid`):**
  1. **Sản phẩm & Kho hàng (`products`):** Tạo/sửa sản phẩm & biến thể SKU, nạp kho hàng loạt (`importStockBatchAdminApi`) chống trùng lặp.
  2. **Đơn hàng toàn hệ thống (`orders`):** Giám sát toàn bộ đơn hàng của các Workspace và khách vãng lai, kích hoạt giao hàng lại (`fulfillOrderAdminApi`).
  3. **Duyệt thanh toán thủ công (`manual_review`):** Kiểm tra và duyệt (`approveManualPaymentIntentAdminApi`) các lệnh thanh toán quá hạn (> 30 phút) hoặc chuyển lệch số tiền.
  4. **Cấu hình cổng thanh toán (`gateways`):** Bật/tắt cổng thanh toán, cập nhật tỷ giá `rate_per_credit` và thông tin tài khoản nhận tiền (`upsertPaymentGatewayAdminApi`).

### 2.5. Cửa Hàng Sản Phẩm Số Công Khai (`/store`)

- **File Giao Diện:** `src/views/commerce/public-store/index.vue`
- **Quyền Truy Cập:** Public (`ignoreAccess: true`, sử dụng `{ skipAuth: true }` trên mọi lời gọi API)
- **Chức Năng Cốt Lõi:**
  - Cho phép khách hàng vãng lai duyệt các sản phẩm `visibility = 'public'` (`serial_stock`, `digital_file`), đặt mua qua VietQR / MoMo / Stripe / USDT mà không cần đăng nhập.
  - Tự động lưu cặp `(order_code, claim_token)` vào `localStorage` (`OPERON_GUEST_ORDERS`), hỗ trợ URL query `?order=ORD-...&token=CLM_...` và polling 3 giây qua `getGuestOrderDeliveriesApi` để bàn giao sản phẩm ngay trên trình duyệt.
