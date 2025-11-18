'use client';

import React from 'react';
import { Phone, Mail, MapPin, Globe, Store } from 'lucide-react';
import { cn } from '@rentalshop/ui';

interface MerchantHeaderProps {
  merchant: {
    name: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
  };
  className?: string;
}

export function MerchantHeader({ merchant, className }: MerchantHeaderProps) {
  const contactInfo = [
    merchant.address && {
      icon: MapPin,
      label: merchant.address,
      value: [merchant.city, merchant.country].filter(Boolean).join(', ') || merchant.address
    },
    merchant.phone && {
      icon: Phone,
      label: 'Phone',
      value: merchant.phone,
      href: `tel:${merchant.phone}`
    },
    merchant.email && {
      icon: Mail,
      label: 'Email',
      value: merchant.email,
      href: `mailto:${merchant.email}`
    },
    merchant.website && {
      icon: Globe,
      label: 'Website',
      value: merchant.website,
      href: merchant.website.startsWith('http') ? merchant.website : `https://${merchant.website}`,
      external: true
    }
  ].filter(Boolean) as Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    href?: string;
    external?: boolean;
  }>;

  return (
    <div className={cn('bg-gradient-to-r from-blue-600 to-blue-800 text-white', className)}>
      <div className="container mx-auto px-4 py-12">
        {/* Merchant Name */}
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-8 h-8" />
          <h1 className="text-4xl font-bold">{merchant.name}</h1>
        </div>

        {/* Description */}
        {merchant.description && (
          <p className="text-blue-100 text-lg mb-6 max-w-3xl">
            {merchant.description}
          </p>
        )}

        {/* Contact Information */}
        {contactInfo.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              const content = (
                <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-blue-200 uppercase tracking-wide mb-1">
                      {info.label}
                    </div>
                    <div className="text-sm font-medium break-words">
                      {info.value}
                    </div>
                  </div>
                </div>
              );

              if (info.href) {
                return (
                  <a
                    key={index}
                    href={info.href}
                    target={info.external ? '_blank' : undefined}
                    rel={info.external ? 'noopener noreferrer' : undefined}
                    className="block"
                  >
                    {content}
                  </a>
                );
              }

              return <div key={index}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

