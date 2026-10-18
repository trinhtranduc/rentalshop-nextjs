/**
 * Runs once when the API process starts, before it accepts connections.
 * Binds the incoming request so `message` can follow Accept-Language (#986).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installApiMessageLocale } = await import('@rentalshop/utils/server');
    installApiMessageLocale();
  }
}
