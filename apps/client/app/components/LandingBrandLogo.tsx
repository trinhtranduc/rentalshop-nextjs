'use client';

import { Logo } from '@rentalshop/ui';

interface LandingBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function LandingBrandLogo({ size = 'md', showLabel = true }: LandingBrandLogoProps) {
  return (
    <Logo
      size={size}
      variant="blue"
      showLabel={showLabel}
      labelText="AnyRent"
    />
  );
}
