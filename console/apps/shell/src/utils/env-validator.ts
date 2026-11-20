/**
 * Fast-Fail Environment Validator for Workstation
 * Enforces strict environment boundaries: No silent fallbacks to foreign production credentials.
 */

export interface EnvValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  // Strict Fail-Fast Check for Backend connectivity
  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is required but not provided in .env');
  } else if (!/^https?:\/\//i.test(supabaseUrl)) {
    errors.push(
      `VITE_SUPABASE_URL must be a valid HTTP/HTTPS URL. Received: "${supabaseUrl}"`,
    );
  }

  if (!anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is required but not provided in .env');
  }

  // Non-fatal warnings for optional services
  if (
    !import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() &&
    import.meta.env.PROD
  ) {
    warnings.push(
      'VITE_TURNSTILE_SITE_KEY is missing in production. Bot protection will be disabled.',
    );
  }

  return { errors, warnings };
}

export function assertValidEnvironment(): void {
  const { errors, warnings } = validateEnvironment();

  for (const warning of warnings) {
    console.warn(`[Env Warning] ${warning}`);
  }

  if (errors.length > 0) {
    const formattedErrors = errors.map((err) => `  - ${err}`).join('\n');
    const message = `[FATAL] Environment validation failed. Halting application bootstrap:\n${formattedErrors}\nPlease review your .env or .env.local file. See .env.example for details.`;
    console.error(message);
    throw new Error(message);
  }
}
