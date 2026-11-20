export type SupabaseRequester = <T = unknown>(
  endpoint: string,
  options?: {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    schema?: string;
  },
) => Promise<T>;

export const defaultRequester: SupabaseRequester = async () => {
  throw new Error(
    'Supabase requester not configured for @operon/local-db. Call setSupabaseRequester() or provide a mock.',
  );
};

let activeRequester: SupabaseRequester = defaultRequester;

export function getActiveRequester(): SupabaseRequester {
  return activeRequester;
}

export function setSupabaseRequester(requester: SupabaseRequester): void {
  activeRequester = requester;
}

export async function supabaseRequest<T = unknown>(
  endpoint: string,
  options?: {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    schema?: string;
  },
): Promise<T> {
  return activeRequester<T>(endpoint, options);
}
