'use client';

import { usePathname } from 'next/navigation';
import { TopNavigation } from '@rentalshop/ui';

export default function DynamicTopNavigation() {
  const pathname = usePathname();
  
  return (
    <TopNavigation 
      variant="admin" 
      currentPage={pathname}
    />
  );
}
