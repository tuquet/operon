<script lang="ts" setup>
import type { BrowserProfileRecord } from '../../api/browsers';

import { computed, ref, watch } from 'vue';

import { useKernel } from '@operon/kernel';

import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@operon-core/shadcn-ui';

import {
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  CopyPlus,
  Play,
  Square,
  Star,
} from '@lucide/vue';

import { $t } from '../../locales';
import { useBrowsersStore } from '../../stores/browsers';

defineOptions({ name: 'BrowserDetailSheet' });

const props = defineProps<{
  profile: BrowserProfileRecord | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const kernel = useKernel();
const store = useBrowsersStore();

const extInput = ref('');
const moveTenantId = ref('');
const savingExts = ref(false);
const moving = ref(false);

const tenantOptions = computed(() => kernel.tenant.items);

watch(
  () => props.profile,
  (p) => {
    if (!p) return;
    extInput.value = p.extensions.join(', ');
    moveTenantId.value = p.tenantId;
  },
  { immediate: true },
);

function formatBytes(bytes?: null | number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    kernel.events.notify('success', $t('common.copied'));
  } catch {
    kernel.events.notify('error', $t('automation.overview.browser_action_failed'));
  }
}

async function handleSaveExtensions() {
  if (!props.profile) return;
  savingExts.value = true;
  try {
    const parsed = extInput.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await store.updateExtensions(props.profile.id, parsed);
    kernel.events.notify(
      'success',
      $t('automation.browsers.updated_success', { name: props.profile.name }),
    );
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  } finally {
    savingExts.value = false;
  }
}

async function handleMoveTenant() {
  if (!props.profile || !moveTenantId.value) return;
  if (moveTenantId.value === props.profile.tenantId) return;
  moving.value = true;
  try {
    await store.moveProfileToTenant(props.profile.id, moveTenantId.value);
    kernel.events.notify('success', $t('automation.browsers.moved_success'));
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  } finally {
    moving.value = false;
  }
}

async function handleClone() {
  if (!props.profile) return;
  try {
    const cloned = await store.cloneProfile(props.profile.id);
    kernel.events.notify(
      'success',
      $t('automation.browsers.cloned_success', { name: cloned.name }),
    );
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  }
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="w-full overflow-y-auto sm:max-w-[520px]">
      <SheetHeader v-if="profile">
        <div class="flex flex-wrap items-center gap-2">
          <SheetTitle class="truncate">{{ profile.name }}</SheetTitle>
          <Badge
            v-if="profile.isOnline"
            variant="outline"
            class="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          >
            {{ $t('automation.browsers.running_badge') }}
          </Badge>
          <Badge v-if="profile.isDefault" variant="secondary">
            {{ $t('automation.browsers.default_badge') }}
          </Badge>
        </div>
        <SheetDescription class="font-mono text-xs">
          {{ profile.id }}
        </SheetDescription>
      </SheetHeader>

      <div v-if="profile" class="mt-5 flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="!profile.isOnline"
            size="sm"
            class="gap-1.5"
            @click="store.launchProfile(profile.id)"
          >
            <Play class="size-3.5" />
            <span>{{ $t('automation.browsers.action_run') }}</span>
          </Button>
          <Button
            v-else
            size="sm"
            variant="destructive"
            class="gap-1.5"
            @click="store.stopProfile(profile.id)"
          >
            <Square class="size-3.5" />
            <span>{{ $t('automation.browsers.action_stop') }}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            class="gap-1.5"
            :disabled="profile.isDefault"
            @click="store.makeDefaultProfile(profile.id)"
          >
            <Star class="size-3.5" />
            <span>{{ $t('automation.browsers.action_set_default') }}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            class="gap-1.5"
            @click="handleClone"
          >
            <CopyPlus class="size-3.5" />
            <span>{{ $t('automation.browsers.action_duplicate') }}</span>
          </Button>
        </div>

        <Tabs default-value="overview" class="w-full">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              {{ $t('automation.browsers.detail_overview') }}
            </TabsTrigger>
            <TabsTrigger value="fingerprint">
              {{ $t('automation.browsers.detail_fingerprint') }}
            </TabsTrigger>
            <TabsTrigger value="extensions">
              {{ $t('automation.browsers.detail_extensions') }}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" class="mt-3 flex flex-col gap-3">
            <div class="flex flex-col gap-2 rounded-lg border border-border p-3 text-xs">
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">
                  {{ $t('automation.browsers.detail_tenant') }}
                </span>
                <code class="rounded bg-muted px-1.5 py-0.5 font-mono">
                  {{ profile.tenantId }}
                </code>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">
                  {{ $t('automation.browsers.detail_disk_size') }}
                </span>
                <span class="font-mono font-medium">
                  {{ formatBytes(profile.diskSizeBytes) }}
                </span>
              </div>
              <div
                v-if="profile.pid"
                class="flex items-center justify-between gap-2"
              >
                <span class="text-muted-foreground">PID / CDP Port</span>
                <span class="font-mono">
                  {{ profile.pid }} · :{{ profile.debuggingPort }}
                </span>
              </div>
              <div
                v-if="profile.wsUrl"
                class="flex flex-col gap-1 border-t border-border/50 pt-2"
              >
                <span class="text-muted-foreground">
                  {{ $t('automation.browsers.detail_cdp_ws') }}
                </span>
                <div class="flex items-center gap-1.5">
                  <code class="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-[11px]">
                    {{ profile.wsUrl }}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    class="size-7 shrink-0"
                    @click="copyText(profile.wsUrl)"
                  >
                    <Copy class="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              v-if="tenantOptions.length > 1"
              class="flex flex-col gap-2 rounded-lg border border-border p-3"
            >
              <Label class="text-xs">
                {{ $t('automation.browsers.action_move_tenant') }}
              </Label>
              <div class="flex items-center gap-2">
                <Select v-model="moveTenantId">
                  <SelectTrigger class="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="t in tenantOptions"
                      :key="t.id"
                      :value="t.id"
                    >
                      {{ t.name }} ({{ t.slug }})
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-8 gap-1.5 text-xs"
                  :disabled="
                    moving ||
                    profile.isOnline ||
                    moveTenantId === profile.tenantId
                  "
                  @click="handleMoveTenant"
                >
                  <ArrowRightLeft class="size-3.5" />
                  <span>{{ $t('automation.browsers.detail_move_btn') }}</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fingerprint" class="mt-3">
            <div class="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-xs">
              <div>
                <div class="text-muted-foreground">OS</div>
                <div class="font-medium capitalize">
                  {{ profile.fingerprintConfig?.osPlatform || 'windows' }}
                </div>
              </div>
              <div>
                <div class="text-muted-foreground">Seed</div>
                <div class="font-mono font-medium">
                  {{ profile.fingerprintConfig?.seed || 'Auto' }}
                </div>
              </div>
              <div>
                <div class="text-muted-foreground">CPU / RAM</div>
                <div class="font-medium">
                  {{ profile.fingerprintConfig?.hardwareConcurrency || 8 }}c /
                  {{ profile.fingerprintConfig?.deviceMemoryGb || 16 }} GB
                </div>
              </div>
              <div>
                <div class="text-muted-foreground">Viewport</div>
                <div class="font-mono">
                  {{ profile.fingerprintConfig?.screenWidth || 1920 }}x{{
                    profile.fingerprintConfig?.screenHeight || 1080
                  }}
                </div>
              </div>
              <div>
                <div class="text-muted-foreground">WebRTC</div>
                <div class="font-medium">
                  {{ profile.fingerprintConfig?.webrtcMode || 'proxy_shielded' }}
                </div>
              </div>
              <div>
                <div class="text-muted-foreground">Timezone / Lang</div>
                <div class="truncate font-mono">
                  {{ profile.timezone || 'Auto' }} ·
                  {{ profile.fingerprintConfig?.lang || 'en-US' }}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="extensions" class="mt-3 flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <Label class="text-xs">
                {{ $t('automation.browsers.detail_extensions_hint') }}
              </Label>
              <Input v-model="extInput" class="font-mono text-xs" />
            </div>
            <div class="flex flex-wrap gap-1.5">
              <Badge
                v-for="ext in profile.extensions"
                :key="ext"
                variant="outline"
                class="gap-1 text-xs"
              >
                <CheckCircle2 class="size-3 text-emerald-500" />
                <span>{{ ext }}</span>
              </Badge>
            </div>
            <div>
              <Button
                size="sm"
                :disabled="savingExts"
                @click="handleSaveExtensions"
              >
                {{ $t('automation.browsers.detail_save_extensions') }}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SheetContent>
  </Sheet>
</template>
