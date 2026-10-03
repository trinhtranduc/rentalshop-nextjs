import { NextResponse } from 'next/server';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { buildMobileAppConfig } from '../../../../lib/mobile-app-config';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/mobile/app-config:
 *   get:
 *     summary: Mobile app config
 *     description: |
 *       Minimum and latest app version per platform, store links, and which new screens are on (#362).
 *       Public (no token). The app shows a blocking update screen when its version is below `minVersion`;
 *       if this call fails, the app continues. Values come from env:
 *       IOS_MIN_VERSION, IOS_LATEST_VERSION, IOS_STORE_URL, ANDROID_MIN_VERSION, ANDROID_LATEST_VERSION,
 *       ANDROID_STORE_URL, MOBILE_FEATURES (comma-separated feature keys to turn on).
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: Config
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               code: APP_CONFIG_SUCCESS
 *               data:
 *                 ios: { minVersion: "0.0.0", latestVersion: "1.1.3", storeUrl: null }
 *                 android: { minVersion: "0.0.0", latestVersion: "0.1.3", storeUrl: "https://play.google.com/store/apps/details?id=anyrent.shop" }
 *                 features: { newOrders: false, newOrderDetail: false, newProducts: false, newCalendar: false, newOverview: false, newSettings: false }
 */
export async function GET() {
  try {
    return NextResponse.json(
      ResponseBuilder.success('APP_CONFIG_SUCCESS', buildMobileAppConfig()),
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
