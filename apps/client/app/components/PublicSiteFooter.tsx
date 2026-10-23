'use client'

import Link from 'next/link'
import { Mail, Phone, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePublicHref } from '../../lib/public-content/use-public-href'
import { CrispChat } from './CrispChat'

export default function PublicSiteFooter() {
  const t = useTranslations('landing.footer')
  // #1114: links stay in the language of the page; industry pages are Vietnamese only
  const href = usePublicHref()

  return (
    <>
    <CrispChat />
    <footer id="contact" className="relative overflow-hidden bg-slate-900 py-12 text-white" role="contentinfo">
      <div className="pointer-events-none absolute -top-20 right-10 h-[300px] w-[300px] rounded-full bg-sky-500/15 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AnyRent</span>
            </div>
            <p className="mb-4 text-sm text-gray-400">{t('description')}</p>
            <div className="space-y-3">
              <a
                href={`mailto:${t('emailAddress')}`}
                className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {t('emailAddress')}
              </a>
              <a
                href="https://wa.me/840764774647"
                className="inline-flex text-gray-400 transition-colors hover:text-white"
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
                <Link href={href('features')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('product.features')}
                </Link>
              </li>
              <li>
                <Link href={href('pricing')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('product.pricing')}
                </Link>
              </li>
              <li>
                <Link href={href('download')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('product.downloadApp')}
                </Link>
              </li>
              <li>
                <Link href={href('image-search')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('imageSearch')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">{t('industries.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={href('industry:cho-thue-ao-dai')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('industries.aoDai')}
                </Link>
              </li>
              <li>
                <Link href={href('industry:cho-thue-ao-cuoi')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('industries.weddingDress')}
                </Link>
              </li>
              <li>
                <Link href={href('industry:cho-thue-trang-thiet-bi')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('industries.equipment')}
                </Link>
              </li>
              <li>
                <Link href={href('industry:cho-thue-trang-phuc')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('industries.costume')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">{t('support.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={href('faq')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('support.faq')}
                </Link>
              </li>
              <li>
                <Link href={href('blog')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('support.documentation')}
                </Link>
              </li>
              <li>
                <Link href={href('contact')} className="text-sm text-gray-400 transition-colors hover:text-white">
                  {t('support.contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">{t('company.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={href('features')} className="text-sm text-gray-400 transition-colors hover:text-white">
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
    </>
  )
}
