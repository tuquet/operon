interface PinInputProps {
  class?: any;
  /**
   * Verification code length
   */
  codeLength?: number;
  /**
   * Send verification code button text
   */
  createText?: (countdown: number) => string;
  /**
   * Whether disabled
   */
  disabled?: boolean;
  /**
   * Custom verification code send logic
   * @returns
   */
  handleSendCode?: () => Promise<void>;
  /**
   * Send verification code button loading state
   */
  loading?: boolean;
  /**
   * Maximum retry timeout
   */
  maxTime?: number;
}

export type { PinInputProps };
