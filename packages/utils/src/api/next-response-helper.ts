// ============================================================================
// NEXT RESPONSE HELPER
// ============================================================================
// Centralized helper for dynamic NextResponse imports to avoid build-time errors

let NextResponse: typeof import('next/server').NextResponse | null = null;

/**
 * Get NextResponse class with lazy loading
 * This prevents build-time errors when NextResponse is imported in shared utilities
 */
export async function getNextResponse(): Promise<typeof import('next/server').NextResponse> {
  if (!NextResponse) {
    const nextServer = await import('next/server');
    NextResponse = nextServer.NextResponse;
  }
  return NextResponse;
}
