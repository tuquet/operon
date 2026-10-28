<script lang="ts" setup>
import type { CredentialRow, CredentialStatus } from '#/api';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@operon/common-ui';

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@operon-core/shadcn-ui';

import {
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
} from '@lucide/vue';

import {
  deleteCredential,
  getCredentials,
  pullCredentials,
  pushCredentials,
  rotateTenantKeys,
  setCredential,
} from '#/api';
import { $t } from '#/locales';

defineOptions({ name: 'SecretsCredentials' });

const data = ref<CredentialStatus | null>(null);
const loading = ref(false);
const busy = ref(false);
const message = ref('');
const errorMsg = ref('');

const showAdd = ref(false);
const newName = ref('');
const newValue = ref('');
const pendingDelete = ref<null | string>(null);

const cloudNames = computed(
  () => new Set((data.value?.cloud ?? []).map((s) => s.name)),
);

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    data.value = await getCredentials();
  } catch (error: any) {
    errorMsg.value = error?.message ?? $t('page.secrets.daemon_offline');
    data.value = null;
  } finally {
    loading.value = false;
  }
}

async function run(op: () => Promise<{ message: string }>) {
  busy.value = true;
  message.value = '';
  errorMsg.value = '';
  try {
    const res = await op();
    message.value = res.message;
    await load();
  } catch (error: any) {
    errorMsg.value = error?.message ?? 'Operation failed';
  } finally {
    busy.value = false;
  }
}

async function onAdd() {
  if (!newName.value.trim()) return;
  await run(() => setCredential(newName.value.trim(), newValue.value));
  showAdd.value = false;
  newName.value = '';
  newValue.value = '';
}

function onDelete(row: CredentialRow) {
  // Two-step inline confirmation (browser confirm() is forbidden by lint rules).
  if (pendingDelete.value === row.name) {
    pendingDelete.value = null;
    run(() => deleteCredential(row.name));
    return;
  }
  pendingDelete.value = row.name;
}

onMounted(load);
</script>

<template>
  <Page
    :title="$t('page.secrets.title')"
    :description="$t('page.secrets.credentials_desc')"
  >
    <template #extra>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" :disabled="busy" @click="load">
          <RefreshCw class="mr-1 size-4" />{{ $t('common.refresh') }}
        </Button>
        <Button
          variant="outline"
          :disabled="busy"
          @click="run(pullCredentials)"
        >
          {{ $t('page.secrets.pull') }}
        </Button>
        <Button
          variant="outline"
          :disabled="busy"
          @click="run(pushCredentials)"
        >
          {{ $t('page.secrets.push') }}
        </Button>
        <Button
          variant="outline"
          :disabled="busy"
          @click="run(rotateTenantKeys)"
        >
          {{ $t('page.secrets.rotate') }}
        </Button>
        <Button :disabled="busy" @click="showAdd = !showAdd">
          <Plus class="mr-1 size-4" />{{ $t('page.secrets.add') }}
        </Button>
      </div>
    </template>

    <Alert v-if="errorMsg" variant="destructive" class="mb-3">
      <AlertCircle class="size-4" />
      <AlertDescription>{{ errorMsg }}</AlertDescription>
    </Alert>
    <Alert v-if="message" class="mb-3 border-success/30 text-success">
      <CheckCircle2 class="size-4 text-success" />
      <AlertDescription>{{ message }}</AlertDescription>
    </Alert>

    <!-- Add credential -->
    <Card v-if="showAdd" class="mb-4">
      <CardContent class="flex flex-wrap items-end gap-3 p-4">
        <div class="space-y-1.5">
          <Label>{{ $t('page.secrets.name') }}</Label>
          <Input
            v-model="newName"
            placeholder="hrms_password"
            class="h-9 w-64"
          />
        </div>
        <div class="space-y-1.5">
          <Label>{{ $t('page.secrets.value') }}</Label>
          <Input
            v-model="newValue"
            type="password"
            placeholder="••••••••"
            class="h-9 w-64"
          />
        </div>
        <Button :disabled="busy || !newName.trim()" @click="onAdd">
          {{ $t('common.save') }}
        </Button>
        <Button variant="ghost" @click="showAdd = false">
          {{ $t('common.cancel') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Store status -->
    <div v-if="data" class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div class="rounded-lg border p-3">
        <div class="text-muted-foreground">
          {{ $t('page.secrets.store_path') }}
        </div>
        <div class="mt-1 truncate" :title="data.store_path">
          {{ data.store_path }}
        </div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="text-muted-foreground">
          {{ $t('page.secrets.device_key') }}
        </div>
        <div class="mt-1 truncate" :title="data.device_public_key ?? ''">
          {{ data.device_public_key ?? '—' }}
        </div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="text-muted-foreground">
          {{ $t('page.secrets.cloud') }}
        </div>
        <div class="mt-1">
          <span v-if="data.enrolled" class="text-green-600">
            ● {{ $t('page.secrets.enrolled') }}
          </span>
          <span v-else class="text-red-500"
            >● {{ $t('page.secrets.not_enrolled') }}</span
          >
          <span class="text-muted-foreground ml-2">
            {{ data.cloud_count }} {{ $t('page.secrets.remote_count') }}
          </span>
        </div>
      </div>
    </div>

    <!-- credentials table -->
    <div v-if="data" class="rounded-lg border">
      <div class="flex items-center justify-between border-b px-4 py-2">
        <span class=" ">
          {{ $t('page.secrets.local') }} ({{ data.local.length }})
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-1/3">
              {{ $t('page.secrets.name') }}
            </TableHead>
            <TableHead class="w-1/3">
              {{ $t('page.secrets.value') }}
            </TableHead>
            <TableHead class="w-1/6">
              {{ $t('page.secrets.cloud') }}
            </TableHead>
            <TableHead class="w-1/6 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in data.local" :key="row.name">
            <TableCell>
              <Badge variant="outline">
                {{ row.name }}
              </Badge>
            </TableCell>
            <TableCell>••••••••</TableCell>
            <TableCell>
              <span
                v-if="cloudNames.has(row.name)"
                class="text-emerald-600 dark:text-emerald-400"
                >✓</span
              >
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>
            <TableCell class="text-right">
              <Button
                size="sm"
                :disabled="busy"
                :variant="pendingDelete === row.name ? 'destructive' : 'ghost'"
                @click="onDelete(row)"
              >
                <span v-if="pendingDelete === row.name">
                  {{ $t('common.confirm') }}
                </span>
                <Trash2 v-else class="size-4 text-red-500" />
              </Button>
            </TableCell>
          </TableRow>
          <TableRow v-if="data.local.length === 0">
            <TableCell
              class="text-muted-foreground py-6 text-center"
              colspan="4"
            >
              {{ $t('page.secrets.empty') }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-else-if="loading" class="text-muted-foreground p-6 text-center">
      {{ $t('common.loading') }}
    </div>
  </Page>
</template>
