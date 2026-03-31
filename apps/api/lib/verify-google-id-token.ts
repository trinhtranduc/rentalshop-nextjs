import { OAuth2Client } from 'google-auth-library';

export type GoogleIdTokenPayload = {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

/**
 * Verifies a Google ID token (Sign in with Google) for the configured OAuth client.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId?.trim()) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google token payload');
  }

  if (!payload.email_verified) {
    throw new Error('Google email is not verified');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase().trim(),
    email_verified: Boolean(payload.email_verified),
    given_name: payload.given_name,
    family_name: payload.family_name,
    name: payload.name,
    picture: payload.picture,
  };
}
