interface AuthenticationProps {
  /**
   * Captcha code login path
   */
  codeLoginPath?: string;
  /**
   * Forgot password path
   */
  forgetPasswordPath?: string;

  /**
   * Whether in loading state
   */
  loading?: boolean;

  /**
   * Register path
   */
  registerPath?: string;

  /**
   * Whether to show code login
   */
  showCodeLogin?: boolean;
  /**
   * Whether to show forgot password
   */
  showForgetPassword?: boolean;

  /**
   * Whether to show register button
   */
  showRegister?: boolean;

  /**
   * Whether to show remember me
   */
  showRememberMe?: boolean;

  /**
   * Whether to show third-party login
   */
  showThirdPartyLogin?: boolean;

  /**
   * Login box subtitle
   */
  subTitle?: string;

  /**
   * Login box title
   */
  title?: string;
  /**
   * Submit button text
   */
  submitButtonText?: string;
}

export type { AuthenticationProps };
