'use client'

import React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@rentalshop/ui'
import { Link2, Copy, Share2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button } from '@rentalshop/ui'

export default function AffiliatePage() {
  const locale = useLocale()
  const t = useTranslations('affiliate')
  const isVi = locale === 'vi'

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-text-primary">
            {t('title')}
          </h1>
          <LanguageSwitcher variant="compact" />
        </div>
        <p className="text-text-secondary mb-8">
          {t('lastUpdated')}
        </p>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-8">
          {/* What is an Affiliate Link */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              {t('sections.whatIs.title')}
            </h2>
            <p className="text-text-secondary">
              {t('sections.whatIs.content')}
            </p>
          </section>

          {/* How to Get Your Affiliate Link */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              {t('sections.howToGet.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('sections.howToGet.content')}
            </p>
            <ol className="list-decimal list-inside text-text-secondary space-y-2 ml-4">
              {t.raw('sections.howToGet.steps').map((step: string, index: number) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </section>

          {/* How to Use Your Affiliate Link */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              {t('sections.howToUse.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('sections.howToUse.content')}
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              {t.raw('sections.howToUse.methods').map((method: string, index: number) => (
                <li key={index}>{method}</li>
              ))}
            </ul>
          </section>

          {/* How It Works */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('sections.howItWorks.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('sections.howItWorks.content')}
            </p>
            <ol className="list-decimal list-inside text-text-secondary space-y-2 ml-4">
              {t.raw('sections.howItWorks.steps').map((step: string, index: number) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </section>

          {/* Benefits */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('sections.benefits.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('sections.benefits.content')}
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              {t.raw('sections.benefits.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Best Practices */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              {t('sections.bestPractices.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('sections.bestPractices.content')}
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              {t.raw('sections.bestPractices.tips').map((tip: string, index: number) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </section>

          {/* Important Notes */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              {t('sections.importantNotes.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('sections.importantNotes.content')}
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              {t.raw('sections.importantNotes.notes').map((note: string, index: number) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </section>

          {/* Troubleshooting */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              {t('sections.troubleshooting.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('sections.troubleshooting.content')}
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              {t.raw('sections.troubleshooting.solutions').map((solution: string, index: number) => (
                <li key={index}>{solution}</li>
              ))}
            </ul>
          </section>
        </div>

        {/* Call to Action */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            {isVi ? 'Sẵn sàng bắt đầu?' : 'Ready to get started?'}
          </h3>
          <p className="text-blue-700 mb-4">
            {isVi 
              ? 'Truy cập trang Settings để lấy affiliate link của bạn ngay bây giờ!'
              : 'Visit the Settings page to get your affiliate link now!'}
          </p>
          <Button 
            onClick={() => window.location.href = '/settings'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isVi ? 'Đi đến Settings' : 'Go to Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
