<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@operon/locales';
import { useUserStore } from '@operon/stores';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@operon-core/shadcn-ui';

import {
  ArrowLeft,
  Check,
  Copy,
  Mail,
  RefreshCw,
  Save,
  User,
} from '@lucide/vue';

import { getActiveTenantId, getCurrentUser, updateUserProfile } from '#/api';
import { useAsyncAction, useClipboard } from '#/composables';

import ProfileSecurityTab from './components/profile-security-tab.vue';
import ProfileTenantTab from './components/profile-tenant-tab.vue';

defineOptions({ name: 'Profile' });

const router = useRouter();
const userStore = useUserStore();

const { executeAction: runFetchProfile, isLoading: loading } = useAsyncAction();
const { executeAction: runSaveProfile, isLoading: savingProfile } =
  useAsyncAction();

const { copyToClipboard, isCopied } = useClipboard();

// Form states
const fullName = ref('');
const avatarUrl = ref('');
const bio = ref('');
const email = ref('');
const userId = ref('');

// Active Workspace ID
const activeTenantId = ref('');

// User initials for avatar fallback
const initials = computed(() => {
  if (!fullName.value) return 'TQ';
  const parts = fullName.value.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + last).toUpperCase();
  }
  return fullName.value.slice(0, 2).toUpperCase();
});

async function fetchProfile() {
  await runFetchProfile(
    async () => {
      const res = await getCurrentUser();
      if (res) {
        fullName.value = res.realName || '';
        avatarUrl.value = res.avatar || '';
        bio.value = (res as any).bio || '';
        email.value = (res as any).email || '';
        userId.value = res.userId || '';
      }
    },
    {
      errorFallback: $t('profile.loadProfileError', { error: '' }),
      tracking: { action: 'fetchProfile', view: 'Profile' },
    },
  );
}

async function handleSaveProfile() {
  if (!userId.value) return;
  await runSaveProfile(
    async () => {
      await updateUserProfile({
        avatar_url: avatarUrl.value,
        full_name: fullName.value,
        introduction: bio.value,
      });
      userStore.setUserInfo({
        userId: userId.value,
        username: email.value || 'admin',
        roles: userStore.userInfo?.roles ?? ['admin'],
        avatar: avatarUrl.value,
        realName: fullName.value,
      });
    },
    {
      errorFallback: $t('profile.saveProfileError', { error: '' }),
      success: $t('profile.saveProfileSuccess'),
      tracking: { action: 'handleSaveProfile', view: 'Profile' },
    },
  );
}

onMounted(async () => {
  activeTenantId.value = getActiveTenantId();
  await fetchProfile();
});
</script>

<template>
  <div class="mx-auto w-full max-w-5xl flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
    <!-- Breadcrumb / Back button -->
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" class="size-8" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <span>{{ $t('profile.settingsBreadcrumb') }}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {{ $t('profile.personalProfile') }}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <!-- Header Card: Minimalist Shadcn Style -->
    <div
      class="rounded-xl border border-border/60 bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
    >
      <div class="flex items-center gap-4 sm:gap-5">
        <!-- Avatar Preview -->
        <Avatar class="size-16 sm:size-20 border-2 border-border/60 shadow-sm">
          <AvatarImage v-if="avatarUrl" :src="avatarUrl" class="object-cover" />
          <AvatarFallback class="bg-primary/10 text-primary font-bold text-lg">
            {{ initials }}
          </AvatarFallback>
        </Avatar>

        <!-- User Info -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2 flex-wrap">
            <h1
              class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              {{ fullName || $t('profile.defaultEngineerName') }}
            </h1>
            <Badge variant="secondary">
              {{ $t('profile.superAdminBadge') }}
            </Badge>
            <Badge variant="outline">
              <span class="mr-1.5 size-1.5 rounded-full bg-success"></span>
              {{ $t('common.active') }}
            </Badge>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span class="flex items-center gap-1">
              <Mail class="size-3.5" />
              <span>{{ email }}</span>
            </span>
            <span class="hidden sm:inline">•</span>
            <span class="flex items-center gap-1">
              UID: {{ userId.slice(0, 12) }}...
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-5 text-muted-foreground hover:text-foreground"
                @click="copyToClipboard(userId, 'User ID')"
              >
                <Check v-if="isCopied('User ID')" class="size-3 text-success" />
                <Copy v-else class="size-3" />
              </Button>
            </span>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div>
        <Button
          variant="outline"
          class="flex items-center gap-1.5"
          :disabled="loading"
          @click="fetchProfile"
        >
          <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" />
          <span>{{ $t('common.refresh') }}</span>
        </Button>
      </div>
    </div>

    <!-- Tabs Container: Shadcn Slate Tabs -->
    <div
      class="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm"
    >
      <Tabs default-value="info" class="w-full">
        <TabsList class="grid w-full max-w-xs grid-cols-3 mb-6">
          <TabsTrigger value="info">{{ $t('profile.tabProfile') }}</TabsTrigger>
          <TabsTrigger value="security">
            {{ $t('profile.tabSecurity') }}
          </TabsTrigger>
          <TabsTrigger value="tenant">
            {{ $t('profile.tabTenant') }}
          </TabsTrigger>
        </TabsList>

        <!-- Tab 1: Personal profile -->
        <TabsContent value="info">
          <div class="max-w-2xl flex flex-col gap-5 pt-1">
            <div>
              <h3 class="text-base font-semibold text-foreground">
                {{ $t('profile.personalProfile') }}
              </h3>
              <p class="text-muted-foreground">
                {{ $t('profile.personalProfileDesc') }}
              </p>
            </div>

            <div class="w-full flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <Label for="profile-full-name">{{
                  $t('profile.fullName')
                }}</Label>
                <InputGroup class="h-10 w-full">
                  <InputGroupAddon>
                    <User class="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="profile-full-name"
                    v-model="fullName"
                    :placeholder="$t('profile.fullNamePlaceholder')"
                  />
                </InputGroup>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label for="profile-email">{{
                  $t('profile.loginEmail')
                }}</Label>
                <div class="flex flex-col gap-1.5 w-full">
                  <InputGroup class="h-10 w-full bg-muted">
                    <InputGroupAddon>
                      <Mail class="size-4 text-muted-foreground" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="profile-email"
                      :model-value="email"
                      disabled
                    />
                  </InputGroup>
                  <p class="text-xs text-muted-foreground">
                    {{ $t('profile.loginEmailHint') }}
                  </p>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label for="profile-avatar">{{
                  $t('profile.avatarUrl')
                }}</Label>
                <Input
                  id="profile-avatar"
                  v-model="avatarUrl"
                  placeholder="https://..."
                  class="h-10"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <Label for="profile-bio">{{ $t('profile.bio') }}</Label>
                <Textarea
                  id="profile-bio"
                  v-model="bio"
                  :placeholder="$t('profile.bioPlaceholder')"
                  :rows="3"
                />
              </div>

              <div>
                <Button
                  class="flex items-center gap-2 h-10 mt-1"
                  :disabled="savingProfile"
                  @click="handleSaveProfile"
                >
                  <Save class="size-4" />
                  <span>{{
                    savingProfile
                      ? $t('profile.saving')
                      : $t('profile.saveChanges')
                  }}</span>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Tab 2: Security -->
        <TabsContent value="security">
          <ProfileSecurityTab />
        </TabsContent>

        <!-- Tab 3: Tenant -->
        <TabsContent value="tenant">
          <ProfileTenantTab :active-tenant-id="activeTenantId" />
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
