<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

import { $t } from '@operon/locales';

import { useVbenForm, z } from '@operon-core/form-ui';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@operon-core/shadcn-ui';

interface Props {
  avatar?: string;
  text?: string;
}

defineOptions({
  name: 'LockScreenModal',
});

withDefaults(defineProps<Props>(), {
  avatar: '',
  text: '',
});

const emit = defineEmits<{
  submit: [string];
}>();

const [Form, { reset, validate, getValues, getFieldComponentRef }] =
  useVbenForm(
    reactive({
      commonConfig: {
        hideLabel: true,
        hideRequiredMark: true,
      },
      schema: computed(() => [
        {
          component: 'VbenInputPassword' as const,
          componentProps: {
            placeholder: $t('ui.widgets.lockScreen.placeholder'),
          },
          fieldName: 'lockScreenPassword',
          formFieldProps: { validateOn: ['change'] as const },
          label: $t('authentication.password'),
          rules: z
            .string()
            .min(1, { message: $t('ui.widgets.lockScreen.placeholder') }),
        },
      ]),
      showDefaultActions: false,
    }),
  );

const open = defineModel<boolean>('open', { default: false });
watch(open, (value) => {
  if (value) reset();
});
function focusPassword(event: Event) {
  event.preventDefault();
  requestAnimationFrame(() =>
    getFieldComponentRef('lockScreenPassword')
      ?.$el?.querySelector('[name="lockScreenPassword"]')
      ?.focus(),
  );
}

async function handleSubmit() {
  const { valid } = await validate();
  const values = await getValues();
  if (valid) {
    emit('submit', values?.lockScreenPassword);
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :open="open"
      modal
      :aria-describedby="undefined"
      @close="open = false"
      @open-auto-focus="focusPassword"
    >
      <DialogHeader>
        <DialogTitle>{{ $t('ui.widgets.lockScreen.title') }}</DialogTitle>
      </DialogHeader>
      <div
        class="flex flex-col items-center gap-4"
        @keydown.enter.prevent="handleSubmit"
      >
        <Avatar class="size-20">
          <AvatarImage :src="avatar" :alt="text" />
          <AvatarFallback>{{ text?.slice(0, 2) || '?' }}</AvatarFallback>
        </Avatar>
        <p>{{ text }}</p>
        <div class="w-full">
          <Form />
          <Button type="button" class="mt-2 w-full" @click="handleSubmit">
            {{ $t('ui.widgets.lockScreen.screenButton') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
