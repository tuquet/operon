# Shadcn-Vue Coding Patterns & Best Practices in Tuquet Admin

## 1. Single Source of Truth for Imports

### Priority Hierarchy:
1. **Core / Web Admin Domain UI:**
   Prefer:
   ```ts
   import {
     Badge,
     Button,
     Dialog,
     DialogContent,
     DialogHeader,
     DialogTitle,
     DialogFooter,
     toast,
   } from '@tuquet/vue-ui';
   ```
   > **Note:** `@tuquet/vue-ui` is the unified, bundled distribution for standard shadcn-vue primitives and toast (`vue-sonner`).

2. **Advanced Charts & Core Primitives (when consuming unbundled workspace internals):**
   ```ts
   import { AreaChart, DonutChart, BarChart } from '@tuquet-core/shadcn-ui';
   ```

3. **Complex Form & Table Adapters:**
   ```ts
   import { useVbenVxeGrid } from '#/adapter/vxe-table';
   import type { VbenFormSchema } from '@tuquet/common-ui';
   ```

---

## 2. Dialog / Modal Standards

### Pattern: Controlled Props & Emit
Always control visibility using `:open="open"` and `@update:open="(val) => emit('update:open', val)"`.

```vue
<script setup lang="ts">
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tuquet/vue-ui';
import { $t } from '#/locales';

interface Props {
  open: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ $t('common.confirmTitle') }}</DialogTitle>
        <DialogDescription>
          {{ $t('common.confirmDescription') }}
        </DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <!-- Body Content -->
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button
          variant="outline"
          :disabled="props.loading"
          @click="emit('update:open', false)"
        >
          {{ $t('common.cancel') }}
        </Button>
        <Button
          variant="default"
          :loading="props.loading"
          @click="emit('confirm')"
        >
          {{ $t('common.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

---

## 3. Button Variant & Size Standards

```vue
<!-- Standard action button -->
<Button variant="default" size="default">Submit</Button>

<!-- Secondary action button -->
<Button variant="secondary" size="default">Reset</Button>

<!-- Neutral border button -->
<Button variant="outline" size="sm">Details</Button>

<!-- Destructive action button -->
<Button variant="destructive" size="default">Delete Node</Button>

<!-- Ghost / Icon action button -->
<Button variant="ghost" size="icon">
  <MoreHorizontal class="h-4 w-4" />
</Button>
```

Available variants in CVA:
- `default`: Primary brand color (`bg-primary text-primary-foreground`)
- `destructive`: Error/danger red (`bg-destructive text-destructive-foreground`)
- `outline`: Bordered with neutral hover (`border border-input bg-background`)
- `secondary`: Soft background pill (`bg-secondary text-secondary-foreground`)
- `ghost`: Transparent with hover background (`hover:bg-accent`)
- `link`: Underlined link text (`text-primary underline-offset-4`)
- `icon`: Square container optimized for single icon trigger

---

## 4. Badge Status Conventions

Match semantic states consistently across grid columns and cards:

```ts
function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toLowerCase()) {
    case 'online':
    case 'active':
    case 'completed':
      return 'default'; // Or custom emerald/green variant
    case 'pending':
    case 'running':
      return 'secondary';
    case 'failed':
    case 'offline':
    case 'revoked':
      return 'destructive';
    default:
      return 'outline';
  }
}
```

---

## 5. Toast & Notification Standards

Use `toast` from `@tuquet/vue-ui` (backed by `vue-sonner`). Do not import raw `element-plus`, `ant-design-vue`, or unbundled alerts.

```ts
import { toast } from '@tuquet/vue-ui';
import { $t } from '#/locales';

// Success feedback
toast.success($t('common.successMessage'));

// Error feedback with title & description
toast.error($t('common.errorMessage'), {
  description: err.message,
});

// Promise-based async toast
toast.promise(fetchData(), {
  loading: $t('common.loading'),
  success: (data) => $t('common.success'),
  error: (err) => $t('common.error'),
});
```

---

## 6. Form Field Construction

For custom non-Vxe forms, wrap inputs using standard Shadcn-Vue layout:

```vue
<div class="space-y-2">
  <Label for="username" class="text-sm font-medium">Username</Label>
  <Input
    id="username"
    v-model="form.username"
    placeholder="Enter username"
    class="w-full"
  />
  <p v-if="errors.username" class="text-xs text-destructive">
    {{ errors.username }}
  </p>
</div>
```
