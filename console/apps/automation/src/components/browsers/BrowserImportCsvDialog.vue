<script lang="ts" setup>
import type { ImportCsvResult } from '../../api/browsers';

import { ref } from 'vue';

import { useKernel } from '@operon/kernel';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@operon-core/shadcn-ui';

import { FileSpreadsheet, Loader2 } from '@lucide/vue';

import { $t } from '../../locales';
import { useBrowsersStore } from '../../stores/browsers';

defineOptions({ name: 'BrowserImportCsvDialog' });

const open = defineModel<boolean>('open', { default: false });

const kernel = useKernel();
const store = useBrowsersStore();

const csvText = ref('');
const importing = ref(false);
const report = ref<ImportCsvResult | null>(null);

const SAMPLE_CSV = `id,name,userAgent,timezone,proxy,group,tags
,US Storefront 01,,America/New_York,socks5://127.0.0.1:1080,marketing,vip|us
,VN Checkout 02,,Asia/Ho_Chi_Minh,,checkout,vn|flash`;

function loadSample() {
  csvText.value = SAMPLE_CSV;
  report.value = null;
}

async function handleImport() {
  if (!csvText.value.trim()) return;
  importing.value = true;
  report.value = null;
  try {
    const res = await store.importCsv(csvText.value);
    report.value = res;
    if (res.imported > 0) {
      kernel.events.notify(
        'success',
        $t('automation.browsers.csv_result', {
          imported: res.imported,
          skipped: res.skipped,
        }),
      );
    }
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[540px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <FileSpreadsheet class="size-4 text-primary" />
          <span>{{ $t('automation.browsers.csv_title') }}</span>
        </DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <Label class="text-xs text-muted-foreground">
            {{ $t('automation.browsers.csv_desc') }}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            class="h-7 shrink-0 text-xs"
            @click="loadSample"
          >
            {{ $t('automation.browsers.csv_sample_btn') }}
          </Button>
        </div>

        <Textarea
          v-model="csvText"
          :rows="7"
          placeholder="id,name,userAgent,timezone,proxy,group,tags"
          class="font-mono text-xs"
        />

        <div
          v-if="report"
          class="flex flex-col gap-1.5 rounded-md border border-border bg-muted/30 p-3 text-xs"
        >
          <div class="font-medium text-foreground">
            {{
              $t('automation.browsers.csv_result', {
                imported: report.imported,
                skipped: report.skipped,
              })
            }}
          </div>
          <ul
            v-if="report.errors.length > 0"
            class="max-h-28 list-inside list-disc overflow-y-auto text-destructive"
          >
            <li v-for="err in report.errors" :key="err.row">
              Row {{ err.row }}: {{ err.reason }}
            </li>
          </ul>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button type="button" variant="outline" @click="open = false">
          {{ $t('common.close') }}
        </Button>
        <Button
          type="button"
          :disabled="importing || !csvText.trim()"
          @click="handleImport"
        >
          <Loader2 v-if="importing" class="mr-1.5 size-3.5 animate-spin" />
          <span>{{ $t('automation.browsers.csv_import_btn') }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
