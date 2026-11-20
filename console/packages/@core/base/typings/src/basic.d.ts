interface BasicOption {
  label: string;
  value: string;
}

type SelectOption = BasicOption;

type TabOption = BasicOption;

interface BasicUserInfo {
  [key: string]: any;
  /**
   * Avatar
   */
  avatar: string;
  /**
   * User nickname
   */
  realName: string;
  /**
   * User roles
   */
  roles?: string[];
  /**
   * User ID
   */
  userId: string;
  /**
   * Username
   */
  username: string;
}

type ClassType =
  | Array<ClassType>
  | boolean
  | null
  | object
  | string
  | undefined;

export type { BasicOption, BasicUserInfo, ClassType, SelectOption, TabOption };
