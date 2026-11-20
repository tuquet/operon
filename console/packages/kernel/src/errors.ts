/** HTTP error shared by host implementations and standalone clients. */
export class KernelApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'KernelApiError';
  }
}
