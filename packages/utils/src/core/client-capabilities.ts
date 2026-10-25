/**
 * Capabilities this web client declares to the API in `X-Client-Capabilities` (#1200).
 * The server treats a request without the header as an old client (iOS / Android already installed).
 *
 * Each PR that ships a behaviour adds its token here. `installments` (#1199): this client shows the deposit stages of an order and
 * collects them; the server then adds `installments[]` and the stage payments to its responses. `block-pricing` (#1189): this client
 * shows and edits day-block price tables and sends the price of a BLOCK line for the server to check.
 */
export const CLIENT_CAPABILITIES: readonly string[] = ['block-pricing', 'installments'];

export const CLIENT_CAPABILITIES_HEADER = 'X-Client-Capabilities';

/** Header entry to spread into request headers; `{}` while the list is empty. */
export function clientCapabilitiesHeader(
  capabilities: readonly string[] = CLIENT_CAPABILITIES
): Record<string, string> {
  return capabilities.length > 0 ? { [CLIENT_CAPABILITIES_HEADER]: capabilities.join(',') } : {};
}
