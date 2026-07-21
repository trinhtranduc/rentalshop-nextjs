'use client'

import Link from 'next/link'
import { Mail, Phone, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function PublicSiteFooter() {
  const t = useTranslations('landing.footer')

  return (
    <footer id="contact" className="bg-gray-900 py-12 text-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AnyRent</span>
            </div>
            <p className="mb-4 text-sm text-gray-400">{t('description')}</p>
            <div className="flex space-x-4">
              <a
                href="mailto:trinhduc20@gmail.com"
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/840764774647"
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="WhatsApp"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">{t('product.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('product.features')}
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('product.pricing')}
                </Link>
              </li>
              <li>
                <Link href="/#download" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('product.downloadApp')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">Ngành nghề</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/cho-thue-ao-dai" className="text-sm text-gray-400 transition-colors hover:text-white">
                  Cho thuê áo dài
                </Link>
              </li>
              <li>
                <Link href="/cho-thue-ao-cuoi" className="text-sm text-gray-400 transition-colors hover:text-white">
                  Cho thuê áo cưới
                </Link>
              </li>
              <li>
                <Link href="/cho-thue-trang-thiet-bi" className="text-sm text-gray-400 transition-colors hover:text-white">
                  Cho thuê thiết bị
                </Link>
              </li>
              <li>
                <Link href="/cho-thue-trang-phuc" className="text-sm text-gray-400 transition-colors hover:text-white">
                  Cho thuê trang phục
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">{t('support.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#faq" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('support.faq')}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('support.documentation')}
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('support.contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">{t('company.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('company.aboutUs')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('company.terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('company.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-400">{t('copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
