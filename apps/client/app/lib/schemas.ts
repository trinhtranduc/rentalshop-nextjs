/**
 * SEO Structured Data Schemas for Landing Page
 * This file contains JSON-LD schema definitions for better SEO
 */

export const createSchemas = (t: any, baseUrl: string) => {
  return {
    softwareApplication: {
      '@context': 'https://schema.org' as const,
      '@type': 'SoftwareApplication' as const,
      name: 'AnyRent',
      applicationCategory: 'BusinessApplication',
      operatingSystem: ['iOS', 'Android', 'Web'],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'VND',
      },
      description: t('hero.description'),
      url: baseUrl,
    },

    organization: {
      '@context': 'https://schema.org' as const,
      '@type': 'Organization' as const,
      name: 'AnyRent',
      url: baseUrl,
      logo: `${baseUrl}/anyrent-logo-light.svg`,
      description: t('hero.description'),
      sameAs: [
        'https://apps.apple.com/vn/app/anyrent/id6754793592',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        availableLanguage: ['Vietnamese', 'English', 'Chinese', 'Korean', 'Japanese'],
      },
    },

    breadcrumb: {
      '@context': 'https://schema.org' as const,
      '@type': 'BreadcrumbList' as const,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: t('navigation.features'),
          item: `${baseUrl}#features`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: t('navigation.pricing'),
          item: `${baseUrl}#pricing`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: t('navigation.faq'),
          item: `${baseUrl}#faq`,
        },
        {
          '@type': 'ListItem',
          position: 5,
          name: t('navigation.contact'),
          item: `${baseUrl}#contact`,
        },
      ],
    },

    article: {
      '@context': 'https://schema.org' as const,
      '@type': 'Article' as const,
      headline: t('hero.title') + ' ' + t('hero.subtitle'),
      description: t('hero.description'),
      author: {
        '@type': 'Organization',
        name: 'AnyRent',
      },
      publisher: {
        '@type': 'Organization',
        name: 'AnyRent',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/anyrent-logo-light.svg`,
        },
      },
      datePublished: '2024-01-01',
      dateModified: new Date().toISOString().split('T')[0],
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': baseUrl,
      },
    },

    localBusiness: {
      '@context': 'https://schema.org' as const,
      '@type': 'LocalBusiness' as const,
      name: 'AnyRent',
      description: t('hero.description'),
      url: baseUrl,
      logo: `${baseUrl}/anyrent-logo-light.svg`,
      image: `${baseUrl}/anyrent-logo-light.svg`,
      priceRange: '$$',
      telephone: '+84764774647',
      email: 'trinhduc20@gmail.com',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'VN',
        addressLocality: 'Vietnam',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 16.0544,
        longitude: 108.2022,
      },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
      },
    },

    product: {
      '@context': 'https://schema.org' as const,
      '@type': 'Product' as const,
      name: 'AnyRent',
      description: t('hero.description'),
      brand: {
        '@type': 'Brand',
        name: 'AnyRent',
      },
      review: [
        {
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: 'Áo Dài Shop Owner',
          },
          datePublished: '2025-01-15',
          reviewBody: 'AnyRent đã giúp tôi quản lý cửa hàng cho thuê áo dài một cách hiệu quả và chuyên nghiệp.',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: '5',
            bestRating: '5',
          },
        },
        {
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: 'Wedding Dress Rental Manager',
          },
          datePublished: '2025-01-10',
          reviewBody: 'Tính năng quản lý đơn hàng rất tiện lợi. Tôi có thể theo dõi tất cả đơn hàng cho thuê áo cưới dễ dàng.',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: '5',
            bestRating: '5',
          },
        },
        {
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: 'Equipment Rental Business Owner',
          },
          datePublished: '2025-01-05',
          reviewBody: 'Ứng dụng di động rất tiện lợi. Tôi có thể quản lý cho thuê thiết bị từ bất kỳ đâu.',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: '5',
            bestRating: '5',
          },
        },
      ],
    },

    website: {
      '@context': 'https://schema.org' as const,
      '@type': 'WebSite' as const,
      name: 'AnyRent',
      url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  };
};

export const createFAQSchema = (faqItems: Array<{ question: string; answer: string }>) => {
  return {
    '@context': 'https://schema.org' as const,
    '@type': 'FAQPage' as const,
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
};
