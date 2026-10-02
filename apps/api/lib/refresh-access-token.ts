import { generateRefreshableToken, generateToken, verifyTokenSimple } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';

/**
 * Shared logic for POST /api/auth/refresh and POST /api/mobile/auth/refresh (#343).
 *
 * A refresh only ever renews the session it belongs to. A session replaced by a newer login
 * answers SESSION_REPLACED; a logged-out, reset or timed-out session answers SESSION_EXPIRED.
 * Neither path may pick some other active session of the user.
 */

export type RefreshResult =
  | { ok: true; token: string; refreshToken?: string }
  | { ok: false; code: string; status: number };

type DbUser = NonNullable<Awaited<ReturnType<typeof db.users.findById>>>;

function toUnixSeconds(value: unknown): number | null {
  return value ? Math.floor(new Date(value as string | Date).getTime() / 1000) : null;
}

function sessionFailure(status: 'replaced' | 'expired'): RefreshResult {
  return { ok: false, code: status === 'replaced' ? 'SESSION_REPLACED' : 'SESSION_EXPIRED', status: 401 };
}

function signFor(
  dbUser: DbUser,
  sessionId: string | undefined,
  sign: typeof generateToken = generateToken
): string {
  return sign({
    userId: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    merchantId: dbUser.merchantId,
    outletId: dbUser.outletId,
    sessionId,
    passwordChangedAt: toUnixSeconds(dbUser.passwordChangedAt),
    permissionsChangedAt: toUnixSeconds(dbUser.permissionsChangedAt),
  });
}

/**
 * Refresh-token flow: rotate the refresh token, then issue an access token for its own session.
 */
export async function refreshWithRefreshToken(input: {
  refreshToken: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<RefreshResult> {
  const rotation = await db.refreshTokens.rotate(input.refreshToken, {
    deviceId: input.deviceId,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  if (!rotation) {
    return { ok: false, code: 'REFRESH_TOKEN_INVALID', status: 401 };
  }

  // Tokens issued before #343 carry no session and cannot refresh.
  const sessionStatus = rotation.sessionId
    ? await db.sessions.getSessionStatus(rotation.sessionId)
    : 'expired';

  if (sessionStatus !== 'active') {
    await db.refreshTokens.revoke(rotation.newToken);
    return sessionFailure(sessionStatus);
  }

  const dbUser = await db.users.findById(rotation.userId);
  if (!dbUser || !dbUser.isActive) {
    await db.refreshTokens.revoke(rotation.newToken);
    return { ok: false, code: 'USER_NOT_FOUND_OR_INACTIVE', status: 401 };
  }

  // Refresh-token clients get a 1-hour access token (#344)
  return {
    ok: true,
    token: signFor(dbUser, rotation.sessionId!, generateRefreshableToken),
    refreshToken: rotation.newToken,
  };
}

/**
 * Legacy flow (web): re-issue from a still-valid access token, keeping its session.
 */
export async function refreshWithAccessToken(accessToken: string): Promise<RefreshResult> {
  const user = await verifyTokenSimple(accessToken);
  if (!user) {
    return { ok: false, code: 'INVALID_TOKEN', status: 401 };
  }

  const sessionId = user.sessionId;
  if (sessionId) {
    const sessionStatus = await db.sessions.getSessionStatus(sessionId);
    if (sessionStatus !== 'active') {
      return sessionFailure(sessionStatus);
    }
  }

  const dbUser = await db.users.findById(user.id);
  if (!dbUser || !dbUser.isActive) {
    return { ok: false, code: 'USER_NOT_FOUND_OR_INACTIVE', status: 401 };
  }

  // Password change after the token was issued invalidates it
  const passwordChangedAt = toUnixSeconds(dbUser.passwordChangedAt);
  const tokenPasswordChangedAt = user.passwordChangedAt;
  if (passwordChangedAt !== null && tokenPasswordChangedAt !== null && passwordChangedAt > tokenPasswordChangedAt) {
    return { ok: false, code: 'TOKEN_INVALIDATED_PASSWORD_CHANGED', status: 401 };
  }

  // Permission change after the token was issued invalidates it
  const permissionsChangedAt = toUnixSeconds(dbUser.permissionsChangedAt);
  const tokenPermissionsChangedAt = user.permissionsChangedAt;
  const tolerance = 0.5;
  if (
    permissionsChangedAt !== null &&
    tokenPermissionsChangedAt !== null &&
    tokenPermissionsChangedAt < permissionsChangedAt - tolerance
  ) {
    return { ok: false, code: 'TOKEN_INVALIDATED_PERMISSIONS_CHANGED', status: 401 };
  }

  return { ok: true, token: signFor(dbUser, sessionId) };
}
