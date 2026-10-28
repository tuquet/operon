# Spec: Cổng Thương Mại Điện Tử Nội Bộ, Ví Xu & Quản Trị Cổng Thanh Toán (`admin-commerce-portal`)

> **Mã đặc tả:** `SPEC-admin-commerce-portal`  
> **Module id:** `admin-commerce-portal` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`SPEC-commerce-payment-gateway.md`](SPEC-commerce-payment-gateway.md), [`SPEC-commerce-digital-store.md`](SPEC-commerce-digital-store.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu Nghiệp Vụ & Kỹ Thuật)

Xây dựng phân hệ giao diện Web **`admin-commerce-portal`** dưới nhóm định tuyến cấp 1 `/commerce` trong `@operon/admin-web`, kết nối trực tiếp với tầng API `src/api/core/billing.ts` và `src/api/core/commerce.ts` nhằm cung cấp trọn vẹn trải nghiệm thương mại điện tử nội bộ cho cả **Tenant Workspace** và **Platform Superadmin**:

1. **Cửa Hàng Tài Nguyên Số (`/commerce/store`):** Duyệt danh mục sản phẩm số, chọn biến thể SKU, thanh toán 1 chạm bằng Ví Xu (`internal_wallet`) hoặc qua cổng ngoại vi (VietQR, MoMo, Stripe, Crypto USDT) kèm cơ chế tự động kiểm tra trạng thái đơn hàng mỗi 3 giây.
2. **Lịch Sử Đơn Hàng & Nhận Tài Nguyên (`/commerce/orders`):** Tra cứu đơn hàng của Workspace bằng `useVbenVxeGrid`, mở hộp thoại nhận bàn giao tài nguyên (`serial_stock` sao chép 1 chạm / tải tệp `.txt`, `resource`, `digital_file`, `wallet_credit`).
3. **Ví Xu & Sổ Cái Giao Dịch (`/wallet`):** Theo dõi số dư `Xu` khả dụng, tổng nạp, tổng chi tiêu; tạo lệnh nạp Xu đa kênh và tra cứu sổ cái biến động số dư (`wallet_transactions`) qua `useVbenVxeGrid`.
4. **Quản Trị Cửa Hàng & Cổng Thanh Toán (`/commerce/admin`):** Trung tâm quản trị dành riêng cho Platform Superadmin gồm 4 phân khu: (1) Quản lý Sản phẩm & SKU + Nạp kho hàng loạt (`importStockBatchAdminApi`), (2) Giám sát đơn hàng toàn hệ thống & Giao hàng lại (`fulfillOrderAdminApi`), (3) Duyệt lệnh thanh toán `manual_review` (`approveManualPaymentIntentAdminApi`), và (4) Cấu hình cổng thanh toán (`upsertPaymentGatewayAdminApi`).

---

## 2. Tech Stack

- **Frontend Application:** `@operon/admin-web` (Vue 3 `<script setup lang="ts">`, TypeScript, Vue Router 4, `vue-i18n`).
- **Table & Form Engine:** `useVbenVxeGrid` từ `#/adapter/vxe-table` (`vxe-table`).
- **UI Components & Icons:** `@operon/vue-ui` (`Badge`, `Button`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle`, `toast`), `@lucide/vue`.
- **Data Access Layer:** `src/api/core/billing.ts`, `src/api/core/commerce.ts`, `src/api/core/tenant.ts`.

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
│   │   └── commerce.md                              # Tài liệu chi tiết định tuyến phân hệ /commerce & /store
│   └── specs/
│       └── SPEC-commerce-admin-portal.md            # Bản đặc tả hiện tại
└── src/
    ├── api/core/
    │   ├── billing.ts                               # upsertPaymentGatewayAdminApi & filterWalletTransactions
    │   ├── commerce.ts                              # filterCommerceProducts & filterCommerceOrders
    │   └── __tests__/
    │       ├── billing.test.ts                      # Unit tests cho billing API & bộ lọc ví
    │       └── commerce.test.ts                     # Unit tests cho commerce API & bộ lọc sản phẩm/đơn hàng
    ├── locales/langs/
    │   ├── en-US/page.json                          # Từ điển page.commerce.* (en-US)
    │   └── vi-VN/page.json                          # Từ điển page.commerce.* (vi-VN)
    ├── router/
    │   ├── routes/modules/
    │   │   └── commerce.ts                          # Định tuyến /commerce (store, orders, wallet, admin)
    │   └── __tests__/
    │       └── plugin-gate.test.ts                  # Kiểm thử phân tách plugin commerce & subscriptions
    └── views/commerce/
        ├── store/
        │   └── index.vue                            # Cửa hàng tài nguyên số & Hộp thoại thanh toán đa kênh
        ├── orders/
        │   └── index.vue                            # Lịch sử đơn hàng & Hộp thoại nhận tài nguyên (Copy / Export .txt)
        ├── wallet/
        │   └── index.vue                            # Ví Xu Tenant, Nạp Xu VietQR/MoMo/Stripe/USDT & Sổ cái giao dịch
        └── admin/
            └── index.vue                            # Quản trị sản phẩm, Nạp kho hàng loạt, Duyệt manual_review & Cổng thanh toán
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Ma Trận Định Tuyến & Phân Quyền Plugin (`src/router/routes/modules/commerce.ts`)

| Đường dẫn | Route Name | Component View | Quyền (`meta.authority`) | Plugin Gate (`meta.plugin`) |
| :-- | :-- | :-- | :-- | :-- |
| `/commerce/store` | `CommerceStore` | `#/views/commerce/store/index.vue` | `['superadmin', 'commerce:read']` | `'commerce'` |
| `/commerce/orders` | `CommerceOrders` | `#/views/commerce/orders/index.vue` | `['superadmin', 'commerce:read']` | `'commerce'` |
| `/wallet` | `CommerceWallet` | `#/views/wallet/index.vue` | `['superadmin', 'subscriptions:read', 'commerce:read']` | `'subscriptions'` |
| `/commerce/admin` | `CommerceAdmin` | `#/views/commerce/admin/index.vue` | `['superadmin', 'commerce:manage']` | `'commerce'` |

### 5.2. Chuẩn Bảng Dữ Liệu `useVbenVxeGrid` & Bộ Lọc Thuần Khiết

Tất cả các bảng dữ liệu trong `/commerce/orders`, `/wallet`, và 4 phân khu của `/commerce/admin` (`products`, `orders`, `manual_review`, `gateways`) đều khởi tạo qua `useVbenVxeGrid` kết hợp `formOptions` và các hàm lọc thuần khiết (`filterWalletTransactions`, `filterCommerceProducts`, `filterCommerceOrders`):

```typescript
const [OrdersGrid, ordersGridApi] = useVbenVxeGrid<CommerceOrderRecord>({
  formOptions: {
    collapsed: false,
    commonConfig: { labelWidth: 90 },
    schema: [
      {
        component: 'VxeInput',
        fieldName: 'keyword',
        label: $t('common.search'),
        componentProps: {
          clearable: true,
          placeholder: $t('page.commerce.searchOrdersPlaceholder'),
        },
      },
      {
        component: 'VxeSelect',
        defaultValue: 'all',
        fieldName: 'status',
        label: $t('common.status'),
        componentProps: {
          options: orderStatusOptions,
        },
      },
    ],
    showCollapseButton: false,
    submitOnChange: true,
    submitOnEnter: true,
  },
  gridOptions: {
    border: false,
    columns: orderColumns,
    proxyConfig: {
      ajax: {
        query: async (_, formValues) => {
          const items = filterCommerceOrders(rawOrders.value, {
            keyword: formValues?.keyword,
            status: formValues?.status,
          });
          return { items, total: items.length };
        },
      },
    },
    rowConfig: { isHover: true, keyField: 'id' },
    stripe: true,
  },
});
```

---

## 6. Testing Strategy

1. **Kiểm thử Đơn vị Bộ lọc & API (`billing.test.ts` & `commerce.test.ts`):**
   - Kiểm chứng `upsertPaymentGatewayAdminApi` gửi đúng payload `on_conflict=id` tới `schema: billing`.
   - Kiểm chứng các hàm lọc `filterWalletTransactions`, `filterCommerceProducts`, `filterCommerceOrders` xử lý chính xác bộ lọc từ khóa, trạng thái, danh mục và loại giao dịch.
2. **Kiểm thử Cổng Plugin (`plugin-gate.test.ts`):**
   - Xác minh khi tắt plugin `commerce` nhưng bật `subscriptions`, chỉ còn `/wallet` hiển thị trên thanh điều hướng `/commerce`.

---

## 7. Boundaries

- **Always do (Luôn thực hiện):**
  - Sử dụng `useVbenVxeGrid` cho toàn bộ bảng danh sách đơn hàng, lịch sử giao dịch ví, danh mục sản phẩm quản trị, lệnh chờ duyệt và cấu hình cổng thanh toán.
  - Hiển thị đơn vị tiền tệ nội bộ thống nhất bằng **`Xu`** (`BIGINT`) kèm định dạng phân tách hàng nghìn rõ ràng.
  - Tuân thủ chuẩn chữ 7 bậc (`text-2xs` đến `text-2xl`) và Sentence case tiếng Việt theo.
- **Ask first (Hỏi trước khi thực hiện):**
  - Thêm route con mới vào nhóm `/commerce`.
- **Never do (Tuyệt đối cấm):**
  - Không bao giờ hiển thị hoặc cho phép chỉnh sửa bảng `billing.payment_gateway_secrets` trực tiếp dưới dạng văn bản thuần (plaintext) trên giao diện client.
  - Không dùng bảng HTML `<table>` thủ công thay cho `useVbenVxeGrid`.

---

## 8. Success Criteria

- [x] Menu `/commerce` hiển thị đầy đủ 4 route con (`/commerce/store`, `/commerce/orders`, `/wallet`, `/commerce/admin`) và lọc chính xác theo `meta.plugin` + `meta.authority`.
- [x] Người dùng Tenant có thể mua sản phẩm số bằng Ví Xu (`internal_wallet`) nhận bàn giao tức thì hoặc thanh toán qua cổng ngoại vi kèm polling trạng thái 3 giây.
- [x] Hộp thoại nhận tài nguyên hỗ trợ sao chép 1 chạm và xuất tệp `.txt` cho `serial_stock`, hiển thị thông tin cấp phát cho `resource`, `digital_file`, và `wallet_credit`.
- [x] Platform Superadmin quản trị trọn vẹn vòng đời sản phẩm, nạp kho hàng loạt (`importStockBatchAdminApi`), giao hàng lại (`fulfillOrderAdminApi`), duyệt lệnh `manual_review` và cấu hình cổng thanh toán trên `/commerce/admin`.
- [x] Vượt qua 100% `vitest`, `vue-tsc` (`0 errors`) và `oxlint` (`0 warnings/errors`).

---

## 9. Resolved Decisions

1. **Hợp nhất điều hướng dưới phân hệ `/commerce` (`src/router/routes/modules/commerce.ts`):** Toàn bộ trải nghiệm Mua sắm sản phẩm số, Quản lý đơn hàng, Ví Xu trả trước và Quản trị cửa hàng/cổng thanh toán được gom vào một menu cấp 1 duy nhất `/commerce` (`icon: 'lucide:shopping-bag'`, `order: 25`).
2. **Phân tách hạt nhân Plugin giữa `commerce` và `subscriptions`:** Các trang `/commerce/store`, `/commerce/orders`, `/commerce/admin` gắn `meta.plugin: 'commerce'`, trong khi `/wallet` gắn `meta.plugin: 'subscriptions'` để Tenant vẫn quản lý được Ví Xu phục vụ thanh toán thuê bao ngay cả khi module cửa hàng sản phẩm số không kích hoạt.
