import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Phần mềm Quản lý Cho thuê Áo cưới | AnyRent',
  description: 'Phần mềm quản lý cửa hàng cho thuê áo cưới, váy cưới chuyên nghiệp. Quản lý bộ sưu tập, lịch đặt, đơn hàng cưới và khách hàng. Dùng thử miễn phí.',
  keywords: [
    'phần mềm quản lý cho thuê áo cưới',
    'ứng dụng quản lý cửa hàng cho thuê áo cưới',
    'app quản lý shop áo cưới',
    'quản lý cho thuê váy cưới',
    'phần mềm quản lý tiệm áo cưới',
    'quản lý đơn hàng cho thuê áo cưới',
    'phần mềm quản lý studio áo cưới',
  ],
  alternates: {
    canonical: '/cho-thue-ao-cuoi',
  },
  openGraph: {
    title: 'Phần mềm Quản lý Cho thuê Áo cưới | AnyRent',
    description: 'Giải pháp quản lý cửa hàng cho thuê áo cưới, váy cưới toàn diện trên iOS và Web.',
    type: 'website',
    url: '/cho-thue-ao-cuoi',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AnyRent - Phần mềm quản lý cho thuê áo cưới',
  applicationCategory: 'BusinessApplication',
  operatingSystem: ['iOS', 'Web'],
  description: 'Phần mềm quản lý cửa hàng cho thuê áo cưới, váy cưới chuyên nghiệp tại Việt Nam.',
  offers: {
    '@type': 'Offer',
    price: '99000',
    priceCurrency: 'VND',
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Trang chủ',
      item: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Cho thuê Áo cưới',
      item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/cho-thue-ao-cuoi`,
    },
  ],
};

export default function ChoThueAoCuoiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-100 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Phần mềm Quản lý <span className="text-purple-600">Cho thuê Áo cưới</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Giải pháp chuyên nghiệp cho studio và cửa hàng cho thuê áo cưới. Quản lý bộ sưu tập, lịch hẹn thử đồ, đơn đặt cưới và chăm sóc khách hàng.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                Dùng thử miễn phí 14 ngày
              </Link>
              <Link href="https://apps.apple.com/vn/app/anyrent/id6754793592" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Tải ứng dụng iOS
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Tính năng quản lý cho thuê áo cưới chuyên nghiệp
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                title="Quản lý bộ sưu tập"
                description="Phân loại áo cưới theo phong cách: công chúa, đuôi cá, chữ A, minimalist. Quản lý ảnh, size, tình trạng từng bộ."
              />
              <FeatureCard
                title="Lịch hẹn & đặt cọc"
                description="Quản lý lịch hẹn thử đồ, đặt cọc giữ váy. Tránh trùng đơn cho cùng bộ váy trong cùng thời gian."
              />
              <FeatureCard
                title="Gói combo cưới"
                description="Tạo gói combo: váy cưới + vest chú rể + phụ kiện. Tính giá trọn gói hoặc từng item riêng."
              />
              <FeatureCard
                title="Quản lý phụ kiện"
                description="Theo dõi voan, giày, trang sức, hoa cài. Gán phụ kiện vào đơn hàng để không thiếu khi giao."
              />
              <FeatureCard
                title="Chăm sóc khách hàng"
                description="Lưu số đo, sở thích khách. Nhắc lịch trả váy tự động. Gợi ý upsell cho khách quay lại."
              />
              <FeatureCard
                title="Báo cáo mùa cưới"
                description="Thống kê doanh thu theo mùa cưới. Biết váy nào hot nhất để đầu tư bổ sung kho."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-purple-600 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Quản lý cửa hàng áo cưới dễ dàng hơn bao giờ hết
            </h2>
            <p className="text-purple-100 mb-8">
              Hơn 100 studio áo cưới đang dùng AnyRent. Dùng thử miễn phí, không cần thẻ tín dụng.
            </p>
            <Link href="/register" className="inline-flex items-center justify-center px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors">
              Đăng ký miễn phí ngay
            </Link>
          </div>
        </section>

        <div className="py-8 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Quay lại trang chủ AnyRent
          </Link>
        </div>
      </div>
    </>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
