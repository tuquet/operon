<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useKernel } from '@operon/kernel';

import { Badge, Button, Card } from '@operon-core/shadcn-ui';

import {
  Activity,
  Bell,
  CheckCircle2,
  KeyRound,
  Puzzle,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Users,
} from '@lucide/vue';

defineOptions({ name: 'SystemStarterView' });

const props = defineProps<{
  tab?: 'audit' | 'overview' | 'plugins' | 'roles' | 'users';
}>();
const router = useRouter();
const kernel = useKernel();
const activeTab = computed(() => props.tab ?? 'overview');

function notifyShell(
  type: 'error' | 'info' | 'success' | 'warning',
  message: string,
) {
  kernel.events.notify(type, message);
}

function handleTabChange(
  tab: 'audit' | 'overview' | 'plugins' | 'roles' | 'users',
) {
  const names = {
    audit: 'SystemAuditLogs',
    overview: 'SystemOverview',
    plugins: 'SystemPlugins',
    roles: 'SystemRoles',
    users: 'SystemUsers',
  };
  void router.push({ name: names[tab] });
  notifyShell('info', `Switched to System ${tab.toUpperCase()} tab`);
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header Hero Banner -->
    <div
      class="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center"
    >
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <ShieldCheck class="size-6 text-primary" />
          <h1 class="text-xl font-bold tracking-tight text-foreground">
            System & IAM Control Center
          </h1>
          <Badge variant="outline" class="border-primary/40 text-primary">
            Micro-App: @operon/system
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          Development preview: users, roles, plugins and audit data below are
          samples.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5"
          @click="notifyShell('success', 'System health status: 100% OK')"
        >
          <Activity class="size-4 text-emerald-500" />
          Health Check
        </Button>
        <Button
          variant="default"
          size="sm"
          class="gap-1.5"
          @click="
            notifyShell(
              'info',
              `Active Tenant: ${kernel.auth.tenantId || 'Default'}`,
            )
          "
        >
          <Bell class="size-4" />
          Notify Shell
        </Button>
      </div>
    </div>

    <!-- System Metrics Overview -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        class="cursor-pointer border-border bg-card p-4 transition-all hover:border-primary/50"
        :class="{
          'border-primary ring-1 ring-primary': activeTab === 'overview',
        }"
        @click="handleTabChange('overview')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground"
            >IAM Status</span
          >
          <CheckCircle2 class="size-4 text-emerald-500" />
        </div>
        <div class="mt-2 text-2xl font-bold text-foreground">Active</div>
        <div class="mt-1 text-xs text-muted-foreground">
          Provider: Supabase Auth
        </div>
      </Card>

      <Card
        class="cursor-pointer border-border bg-card p-4 transition-all hover:border-primary/50"
        :class="{
          'border-primary ring-1 ring-primary': activeTab === 'users',
        }"
        @click="handleTabChange('users')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground"
            >Registered Users</span
          >
          <Users class="size-4 text-blue-500" />
        </div>
        <div class="mt-2 text-2xl font-bold text-foreground">Multi-Tenant</div>
        <div class="mt-1 text-xs text-muted-foreground">
          Current: {{ kernel.auth.username || 'Authenticated' }}
        </div>
      </Card>

      <Card
        class="cursor-pointer border-border bg-card p-4 transition-all hover:border-primary/50"
        :class="{
          'border-primary ring-1 ring-primary': activeTab === 'roles',
        }"
        @click="handleTabChange('roles')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground"
            >RBAC Roles</span
          >
          <KeyRound class="size-4 text-amber-500" />
        </div>
        <div class="mt-2 text-2xl font-bold text-foreground">
          {{ kernel.auth.roles.length || 1 }} Roles
        </div>
        <div class="mt-1 text-xs text-muted-foreground">
          Assigned: {{ kernel.auth.roles.join(', ') || 'superadmin' }}
        </div>
      </Card>

      <Card
        class="cursor-pointer border-border bg-card p-4 transition-all hover:border-primary/50"
        :class="{
          'border-primary ring-1 ring-primary': activeTab === 'plugins',
        }"
        @click="handleTabChange('plugins')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground"
            >Active Plugins</span
          >
          <Puzzle class="size-4 text-purple-500" />
        </div>
        <div class="mt-2 text-2xl font-bold text-foreground">Modular</div>
        <div class="mt-1 text-xs text-muted-foreground">
          Decoupled Remote Apps
        </div>
      </Card>
    </div>

    <!-- Active Tab Content Area -->
    <Card class="border-border bg-card p-6">
      <div v-if="activeTab === 'overview'" class="flex flex-col gap-4">
        <h3 class="text-lg font-semibold text-foreground">
          System Overview & Diagnostics
        </h3>
        <p class="text-sm text-muted-foreground">
          Host Kernel contract version:
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
            >v1.0.0</code
          >. Shared Vue, Pinia, and Router instances provided by Shell.
        </p>
        <div class="rounded-lg border border-border/60 bg-muted/30 p-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <span class="text-xs text-muted-foreground">Shell Session:</span>
              <div class="font-medium text-foreground">
                {{ kernel.auth.hasCloudAuth ? 'Valid' : 'Mock Dev Mode' }}
              </div>
            </div>
            <div>
              <span class="text-xs text-muted-foreground"
                >Current Tenant ID:</span
              >
              <div class="font-mono text-xs text-foreground">
                {{ kernel.auth.tenantId || 'None (Global Scope)' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'users'" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-foreground">User Management</h3>
          <Button
            size="sm"
            @click="notifyShell('info', 'Invite user modal placeholder')"
          >
            Invite User
          </Button>
        </div>
        <p class="text-sm text-muted-foreground">
          Displaying users within the currently selected tenant.
        </p>
        <div class="divide-y divide-border rounded-lg border border-border">
          <div class="flex items-center justify-between p-3">
            <div class="flex items-center gap-3">
              <Users class="size-5 text-muted-foreground" />
              <div>
                <div class="text-sm font-medium text-foreground">
                  {{ kernel.auth.username || 'admin@operon.local' }}
                </div>
                <div class="text-xs text-muted-foreground">
                  Superadministrator
                </div>
              </div>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'roles'" class="flex flex-col gap-4">
        <h3 class="text-lg font-semibold text-foreground">
          RBAC Roles & Permissions
        </h3>
        <p class="text-sm text-muted-foreground">
          Granular permission matrix enforced at both API and UI route guards.
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            v-for="role in ['superadmin', 'admin', 'operator']"
            :key="role"
            class="rounded-lg border border-border p-3"
          >
            <div class="flex items-center gap-2">
              <ShieldAlert class="size-4 text-primary" />
              <span class="font-mono text-sm font-medium capitalize">{{
                role
              }}</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{
                role === 'superadmin'
                  ? 'Unrestricted root access'
                  : 'Scoped tenant access'
              }}
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'audit'" class="flex flex-col gap-4">
        <h3 class="text-lg font-semibold text-foreground">
          System Audit Trail
        </h3>
        <p class="text-sm text-muted-foreground">
          Immutable event log of all administrative actions.
        </p>
        <div class="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
          <ScrollText class="size-5 text-muted-foreground" />
          <span class="text-sm text-foreground"
            >Audit log streaming connected to central PostgreSQL sink.</span
          >
        </div>
      </div>

      <div v-else-if="activeTab === 'plugins'" class="flex flex-col gap-4">
        <h3 class="text-lg font-semibold text-foreground">
          Installed Plugins & Micro-Apps
        </h3>
        <p class="text-sm text-muted-foreground">
          Decoupled applications loaded dynamically into the Shell runtime.
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-border p-3">
            <div class="flex items-center justify-between">
              <span class="font-medium text-foreground"
                >@operon/automation</span
              >
              <Badge variant="outline">Installed</Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              Automation mesh and browser control.
            </p>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="flex items-center justify-between">
              <span class="font-medium text-foreground">@operon/system</span>
              <Badge variant="outline" class="border-primary text-primary">
                Current
              </Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              System IAM and administration.
            </p>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
