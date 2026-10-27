import type { UserInfo } from '@operon/types';

import { useAccessStore } from '@operon/stores';

import { getEffectiveAccess } from './access';
import { supabaseRequest } from './supabase-client';

export interface UpdateUserProfileInput {
  avatar_url?: string;
  full_name?: string;
  introduction?: string;
}

/**
 * Get current user info (Supabase GoTrue REST)
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const accessStore = useAccessStore();
  const token = accessStore.accessToken;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const [user, effectiveAccess] = await Promise.all([
    supabaseRequest<any>('/auth/v1/user'),
    getEffectiveAccess(),
  ]);

  const meta = user.user_metadata || {};
  const realName =
    meta.full_name ||
    meta.display_name ||
    user.email?.split('@')[0] ||
    'Operon';
  const avatar = meta.avatar_url || '';

  const roles = effectiveAccess.isSuperadmin
    ? ['superadmin', ...effectiveAccess.permissions]
    : effectiveAccess.permissions;

  return {
    avatar,
    desc: user.email || 'Administrator',
    homePath: '/dashboard/analytics',
    realName,
    roles,
    token,
    userId: user.id,
    username: user.email || 'admin',
  };
}

/**
 * Update user profile (Supabase Auth metadata & public.profiles)
 */
export async function updateUserProfile(
  data: UpdateUserProfileInput,
): Promise<UserInfo> {
  const payload: { data: Record<string, any> } = { data: {} };
  if (data.full_name) payload.data.full_name = data.full_name;
  if (data.avatar_url) payload.data.avatar_url = data.avatar_url;
  if (data.introduction) payload.data.introduction = data.introduction;

  // 1. Update GoTrue auth metadata
  await supabaseRequest('/auth/v1/user', {
    body: JSON.stringify(payload),
    method: 'PUT',
  });

  // 2. Update public.profiles if exists
  const userInfo = await getCurrentUser();
  if (userInfo.userId) {
    await supabaseRequest(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(userInfo.userId)}`,
      {
        body: JSON.stringify({
          avatar_url: data.avatar_url,
          full_name: data.full_name,
        }),
        method: 'PATCH',
      },
    ).catch(() => {});
  }

  return userInfo;
}

/**
 * Update user password via Supabase Auth
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  await supabaseRequest('/auth/v1/user', {
    body: JSON.stringify({ password: newPassword }),
    method: 'PUT',
  });
}

export const userApi = {
  getCurrent: getCurrentUser,
  updatePassword: updateUserPassword,
  updateProfile: updateUserProfile,
};
