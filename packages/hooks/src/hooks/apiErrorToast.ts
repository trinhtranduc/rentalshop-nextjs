/**
 * Toast type and `common` title key for an API error code (#919). Pure so the tests can load it without React.
 */
export interface ApiErrorToast {
  type: 'error' | 'warning';
  titleKey: 'labels.error' | 'labels.warning';
}

export function apiErrorToast(errorCode?: string | null): ApiErrorToast {
  const isWarning = errorCode === 'VALIDATION_ERROR' || (typeof errorCode === 'string' && errorCode.includes('INVALID'));
  return isWarning
    ? { type: 'warning', titleKey: 'labels.warning' }
    : { type: 'error', titleKey: 'labels.error' };
}
