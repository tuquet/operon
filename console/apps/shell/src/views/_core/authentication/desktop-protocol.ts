export interface DesktopAuthCallbackParams {
  machineName?: string;
  refreshToken?: string;
  state?: string;
  tenantId?: string;
  token: string;
}

export function buildDesktopAuthCallbackUrl(
  params: DesktopAuthCallbackParams,
): string {
  const query = new URLSearchParams({ token: params.token });
  if (params.refreshToken) {
    query.set('refresh_token', params.refreshToken);
  }
  if (params.state !== undefined) {
    query.set('state', params.state);
  }
  if (params.tenantId !== undefined) {
    query.set('tenant_id', params.tenantId);
  }
  if (params.machineName !== undefined) {
    query.set('machine_name', params.machineName);
  }
  return `operon://auth/callback?${query.toString()}`;
}

export function launchProtocolViaIframe(uri: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = uri;
  document.body.append(iframe);
}
