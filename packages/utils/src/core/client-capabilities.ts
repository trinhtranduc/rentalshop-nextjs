/**
 * Capabilities this web client declares to the API in `X-Client-Capabilities` (#1200).
 * The server treats a request without the header as an old client (iOS / Android already installed).
 *
 * Empty on purpose: the behaviours are not shipped yet, so the header is not sent and every response is the
 * one clients get today. The PR that ships a behaviour adds its token here (`installments`, `block-pricing`).
 */
export const CLIENT_CAPABILITIES: readonly string[] = [];

export const CLIENT_CAPABILITIES_HEADER = 'X-Client-Capabilities';

/** Header entry to spread into request headers; `{}` while the list is empty. */
export function clientCapabilitiesHeader(
  capabilities: readonly string[] = CLIENT_CAPABILITIES
): Record<string, string> {
  return capabilities.length > 0 ? { [CLIENT_CAPABILITIES_HEADER]: capabilities.join(',') } : {};
}
