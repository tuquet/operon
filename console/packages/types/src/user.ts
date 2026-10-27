import type { BasicUserInfo } from '@operon-core/typings';

/** User info */
interface UserInfo extends BasicUserInfo {
  /**
   * User description
   */
  desc: string;
  /**
   * Home path
   */
  homePath: string;

  /**
   * accessToken
   */
  token: string;
}

export type { UserInfo };
