import type { SupportedLanguagesType } from '@operon-core/typings';

import type { SetupVxeTable } from './types';

import { watch } from 'vue';

import { usePreferences } from '@operon/preferences';

import {
  VxeButton,
  VxeCheckbox,
  VxeForm,
  VxeFormGather,
  VxeFormGroup,
  VxeFormItem,
  VxeIcon,
  VxeInput,
  VxeLoading,
  VxeModal,
  VxeNumberInput,
  VxePager,
  VxeRadioGroup,
  VxeSelect,
  VxeSwitch,
  VxeTextarea,
  VxeTooltip,
  VxeUI,
  VxeUpload,
} from 'vxe-pc-ui';
import enUS from 'vxe-pc-ui/lib/language/en-US'; // Import default language
import viVN from 'vxe-pc-ui/lib/language/vi-VN';
import zhCN from 'vxe-pc-ui/lib/language/zh-CN';
import {
  VxeColgroup,
  VxeColumn,
  VxeGrid,
  VxeTable,
  VxeToolbar,
} from 'vxe-table';

import { injectPluginsOptions } from '../plugins-context';
import { extendsDefaultFormatter } from './extends';

// Whether already loaded
let isInit = false;

let tableFormFactory: ((...args: any[]) => any) | undefined;

function normalizeVxeLocale<T extends Record<string, any>>(localeModule: T) {
  return (
    localeModule &&
    typeof localeModule === 'object' &&
    'default' in localeModule
      ? localeModule.default
      : localeModule
  ) as T;
}

function buildViVxeLocale() {
  const base = normalizeVxeLocale(viVN) as Record<string, any>;
  return {
    ...base,
    vxe: {
      ...base?.vxe,
      button: {
        ...base?.vxe?.button,
        cancel: 'Hủy',
        clear: 'Xóa',
        confirm: 'Xác nhận',
      },
      loading: {
        ...base?.vxe?.loading,
        text: 'Đang tải...',
      },
      pager: {
        ...base?.vxe?.pager,
        endPage: 'Trang cuối',
        endPageTitle: 'Trang cuối',
        goto: 'Đến',
        gotoTitle: 'Trang',
        homePage: 'Trang đầu',
        homePageTitle: 'Trang đầu',
        nextJump: 'Tiến nhanh',
        nextJumpTitle: 'Tiến nhanh',
        nextPage: 'Trang sau',
        nextPageTitle: 'Trang sau',
        pageClassifier: '',
        pagesize: '{0} / trang',
        prevJump: 'Lùi nhanh',
        prevJumpTitle: 'Lùi nhanh',
        prevPage: 'Trang trước',
        prevPageTitle: 'Trang trước',
        total: 'Tổng {0} bản ghi',
      },
      select: {
        ...base?.vxe?.select,
        allChecked: 'Tất cả',
        clear: 'Xóa',
        close: 'Đóng',
        emptyText: 'Không có dữ liệu',
        loadingText: 'Đang tải...',
        search: 'Tìm kiếm',
        searchEmpty: 'Không tìm thấy dữ liệu phù hợp',
      },
      table: {
        ...base?.vxe?.table,
        actionTitle: 'Thao tác',
        allFilter: 'Tất cả',
        allTitle: 'Chọn tất cả / Bỏ chọn',
        confirmFilter: 'Lọc',
        customAll: 'Tất cả',
        customCancel: 'Hủy',
        customClose: 'Đóng',
        customConfirm: 'Xác nhận',
        customRestore: 'Khôi phục mặc định',
        customTitle: 'Tùy chỉnh cột',
        emptyText: 'Không có dữ liệu',
        resetFilter: 'Đặt lại',
        seqTitle: '#',
      },
    },
  };
}

export function useTableForm(...args: any[]) {
  const pluginsOptions = injectPluginsOptions();
  const contextFormFactory = pluginsOptions?.form?.useVbenForm;

  const factory = tableFormFactory || contextFormFactory;
  if (!factory) {
    throw new Error(
      'useTableForm is not initialized. Please provide useVbenForm via setupVbenVxeTable() or providePluginsOptions()',
    );
  }

  return factory(...args);
}

export function initVxeTable() {
  if (isInit) {
    return;
  }

  VxeUI.component(VxeTable);
  VxeUI.component(VxeColumn);
  VxeUI.component(VxeColgroup);
  VxeUI.component(VxeGrid);
  VxeUI.component(VxeToolbar);

  VxeUI.component(VxeButton);
  // VxeUI.component(VxeButtonGroup);
  VxeUI.component(VxeCheckbox);
  // VxeUI.component(VxeCheckboxGroup);
  VxeUI.component(VxeForm);
  VxeUI.component(VxeFormItem);
  VxeUI.component(VxeFormGroup);
  VxeUI.component(VxeFormGather);
  VxeUI.component(VxeIcon);
  VxeUI.component(VxeInput);
  // VxeUI.component(VxeList);
  VxeUI.component(VxeLoading);
  VxeUI.component(VxeModal);
  VxeUI.component(VxeNumberInput);
  // VxeUI.component(VxeOptgroup);
  // VxeUI.component(VxeOption);
  VxeUI.component(VxePager);
  // VxeUI.component(VxePulldown);
  // VxeUI.component(VxeRadio);
  // VxeUI.component(VxeRadioButton);
  VxeUI.component(VxeRadioGroup);
  VxeUI.component(VxeSelect);
  VxeUI.component(VxeSwitch);
  VxeUI.component(VxeTextarea);
  VxeUI.component(VxeTooltip);
  VxeUI.component(VxeUpload);

  isInit = true;
}

export function setupVbenVxeTable(setupOptions: SetupVxeTable) {
  const { configVxeTable, useVbenForm: useVbenFormFromParam } = setupOptions;

  initVxeTable();

  // Prioritize passed useVbenForm param, otherwise clear to let context injection take effect
  if (useVbenFormFromParam) {
    tableFormFactory = useVbenFormFromParam;
  }
  const { isDark, locale } = usePreferences();

  const localMap: Partial<Record<SupportedLanguagesType, any>> = {
    'en-US': normalizeVxeLocale(enUS),
    'vi-VN': buildViVxeLocale(),
    'zh-CN': normalizeVxeLocale(zhCN),
  };

  watch(
    [() => isDark.value, () => locale.value],
    ([isDarkValue, localeValue]) => {
      VxeUI.setTheme(isDarkValue ? 'dark' : 'light');
      // vxe-table only types built-in locales; module-augmented locales
      // may exceed VxeGlobalI18nLocale union, requiring boundary assertions;
      // unbundled custom languages fall back to en-US
      VxeUI.setI18n(
        localeValue as any,
        localMap[localeValue] ?? localMap['en-US'],
      );
      VxeUI.setLanguage(localeValue as any);
    },
    {
      immediate: true,
    },
  );

  extendsDefaultFormatter(VxeUI);

  configVxeTable(VxeUI);
}
