<script lang="ts" setup>
import type { WorkspaceMember } from '#/api';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@operon-core/shadcn-ui';

import { Edit3, UserPlus } from '@lucide/vue';

import RoleBadge from '#/components/iam/role-badge.vue';
import { useDateFormat } from '#/composables';
import { $t } from '#/locales';

interface Props {
  loading?: boolean;
  members: WorkspaceMember[];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  edit: [member: WorkspaceMember];
  invite: [];
  remove: [member: WorkspaceMember];
}>();

const { formatDate } = useDateFormat();
</script>

<template>
  <div class="space-y-4 pt-1">
    <!-- Action bar inside tab -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-semibold text-foreground sm:text-base">
        {{ $t('page.tenants_view.members_list_title') }}
      </h3>
      <Button size="sm" class="h-8 shrink-0 gap-1.5" @click="emit('invite')">
        <UserPlus class="size-3.5" />
        <span>{{ $t('common.add') }}</span>
      </Button>
    </div>

    <!-- Scrollable Members Table -->
    <div
      class="overflow-x-auto rounded-lg border border-border/60 bg-card shadow-xs"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-[200px] whitespace-nowrap">
              {{ $t('term.member') }}
            </TableHead>
            <TableHead class="min-w-[200px] whitespace-nowrap">
              {{ $t('common.email') }}
            </TableHead>
            <TableHead class="min-w-[120px] whitespace-nowrap">
              {{ $t('term.role') }}
            </TableHead>
            <TableHead class="min-w-[130px] whitespace-nowrap">
              {{ $t('common.status') }}
            </TableHead>
            <TableHead class="min-w-[150px] whitespace-nowrap">
              {{ $t('page.tenants_view.col_joined_at') }}
            </TableHead>
            <TableHead class="min-w-[130px] text-right whitespace-nowrap">
              {{ $t('common.actions') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="record in props.members" :key="record.id">
            <!-- User Column -->
            <TableCell class="whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <Avatar class="size-8 shrink-0">
                  <AvatarImage
                    v-if="record.avatar_url"
                    :src="record.avatar_url"
                  />
                  <AvatarFallback
                    class="bg-primary/10 font-semibold text-primary uppercase"
                  >
                    {{ (record.full_name || record.email || 'U').slice(0, 2) }}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div class="text-foreground">
                    {{
                      record.full_name ||
                      $t('page.tenants_view.default_member_name')
                    }}
                  </div>
                  <div
                    v-if="record.role?.name === 'owner'"
                    class="text-primary"
                  >
                    {{ $t('page.tenants_view.role_owner') }}
                  </div>
                </div>
              </div>
            </TableCell>

            <!-- Email Column -->
            <TableCell class="whitespace-nowrap">
              <span class="text-muted-foreground">
                {{ record.email }}
              </span>
            </TableCell>

            <!-- Role Column -->
            <TableCell class="whitespace-nowrap">
              <RoleBadge :role="record.role?.name || 'member'" />
            </TableCell>

            <!-- Status Column -->
            <TableCell class="whitespace-nowrap">
              <Badge variant="outline">
                <span
                  class="mr-1.5 size-1.5 rounded-full"
                  :class="
                    record.status === 'active'
                      ? 'bg-success'
                      : record.status === 'invited'
                        ? 'bg-primary'
                        : 'bg-destructive'
                  "
                ></span>
                {{
                  record.status === 'active'
                    ? $t('common.active')
                    : record.status === 'invited'
                      ? $t('page.tenants_view.status_invited')
                      : $t('common.suspended')
                }}
              </Badge>
            </TableCell>

            <!-- Joined At Column -->
            <TableCell class="whitespace-nowrap">
              <span class="text-muted-foreground">
                {{ formatDate(record.joined_at) }}
              </span>
            </TableCell>

            <!-- Action Column -->
            <TableCell class="text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  class="flex h-auto items-center gap-1 p-0 text-foreground hover:text-primary"
                  @click="emit('edit', record)"
                >
                  <Edit3 class="size-3.5" />
                  <span>{{ $t('common.edit') }}</span>
                </Button>
                <template v-if="record.role?.name !== 'owner'">
                  <span class="text-muted-foreground/40">•</span>
                  <AlertDialog>
                    <AlertDialogTrigger as-child>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-auto p-0 text-destructive hover:text-destructive"
                      >
                        {{ $t('common.delete') }}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {{
                            $t('page.tenants_view.remove_member_confirm_title')
                          }}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {{
                            $t('page.tenants_view.remove_member_confirm_desc', {
                              name: record.full_name || record.email,
                            })
                          }}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {{ $t('common.cancel') }}
                        </AlertDialogCancel>
                        <AlertDialogAction @click="emit('remove', record)">
                          {{ $t('common.delete') }}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </template>
              </div>
            </TableCell>
          </TableRow>

          <TableRow v-if="props.members.length === 0 && !props.loading">
            <TableCell
              colspan="6"
              class="h-24 text-center text-muted-foreground"
            >
              {{ $t('page.tenants_view.members_empty') }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
