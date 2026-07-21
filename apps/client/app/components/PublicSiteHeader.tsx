'use client'

import Link from 'next/link'
import { Button, LanguageSwitcher, Logo } from '@rentalshop/ui'
import { useAuth } from '@rentalshop/hooks'
import { User } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function PublicSiteHeader() {
  const t = useTranslations('landing')
  const { user } = useAuth()

  return (
    <header
      className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm"
      role="banner"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Logo
              size="md"
              variant="custom"
              src="/anyrent-logo-light.svg"
              showLabel
              labelText="AnyRent"
              showBackground={false}
            />
          </Link>

          <div className="hidden items-center space-x-8 md:flex">
            <Link
              href="/features"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {t('navigation.features')}
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {t('navigation.pricing')}
            </Link>
            <Link
              href="/#faq"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {t('navigation.faq')}
            </Link>
            <Link
              href="/#contact"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {t('navigation.contact')}
            </Link>
            <LanguageSwitcher variant="compact" />
            <Button
              asChild
              variant="default"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Link href={user ? '/dashboard' : '/login'}>
                {user ? (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    {user.name || user.email || 'User'}
                  </>
                ) : (
                  t('navigation.login')
                )}
              </Link>
            </Button>
          </div>

          <div className="flex items-center space-x-3 md:hidden">
            <LanguageSwitcher variant="compact" />
            <Button
              asChild
              variant="default"
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Link href={user ? '/dashboard' : '/login'}>
                {user ? (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    {user.name || user.email || 'User'}
                  </>
                ) : (
                  t('navigation.login')
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
