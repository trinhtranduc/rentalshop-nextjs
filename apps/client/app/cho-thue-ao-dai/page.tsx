import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Phần mềm Quản lý Cho thuê Áo dài | AnyRent',
  description: 'Phần mềm quản lý cửa hàng cho thuê áo dài chuyên nghiệp. Quản lý đơn hàng, kho áo dài, lịch đặt, khách hàng và báo cáo doanh thu. Dùng thử miễn phí 14 ngày.',
  keywords: [
    'phần mềm quản lý cho thuê áo dài',
    'ứng dụng quản lý cửa hàng cho thuê áo dài',
    'app quản lý shop áo dài',
    'quản lý kho áo dài',
    'phần mềm quản lý tiệm cho thuê áo dài',
    'quản lý đơn hàng cho thuê áo dài',
    'lịch đặt áo dài',
    'quản lý cho thuê áo dài online',
  ],
  alternates: {
    canonical: '/cho-thue-ao-dai',
  },
  openGraph: {
    title: 'Phần mềm Quản lý Cho thuê Áo dài | AnyRent',
    description: 'Giải pháp quản lý cửa hàng cho thuê áo dài toàn diện. Quản lý đơn hàng, kho, khách hàng trên iOS và Web.',
    type: 'website',
    url: '/cho-thue-ao-dai',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AnyRent - Phần mềm quản lý cho thuê áo dài',
  applicationCategory: 'BusinessApplication',
  operatingSystem: ['iOS', 'Web'],
  description: 'Phần mềm quản lý cửa hàng cho thuê áo dài chuyên nghiệp tại Việt Nam. Quản lý đơn hàng, kho áo dài, lịch đặt và khách hàng.',
  offers: {
    '@type': 'Offer',
    price: '99000',
    priceCurrency: 'VND',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '200',
    bestRating: '5',
  },
};

export default function ChoThueAoDaiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-gradient-to-br from-pink-50 to-rose-100 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Phần mềm Quản lý <span className="text-rose-600">Cho thuê Áo dài</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Giải pháp quản lý cửa hàng cho thuê áo dài toàn diện. Theo dõi đơn hàng, quản lý kho áo dài theo size/màu, lịch đặt trực quan và báo cáo doanh thu chi tiết.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors">
                Dùng thử miễn phí 14 ngày
              </Link>
              <Link href="https://apps.apple.com/vn/app/anyrent/id6754793592" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Tải ứng dụng iOS
              </Link>
            </div>
          </div>
        </section>

        {/* Features specific to áo dài */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Tính năng dành riêng cho cửa hàng cho thuê áo dài
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                title="Quản lý kho áo dài"
                description="Phân loại theo size, màu sắc, kiểu dáng. Theo dõi tình trạng từng bộ áo dài: sẵn sàng, đang cho thuê, đang giặt."
              />
              <FeatureCard
                title="Lịch đặt áo dài"
                description="Xem lịch đặt trực quan, tránh trùng đơn. Biết ngay bộ nào trống ngày nào để tư vấn khách hàng nhanh chóng."
              />
              <FeatureCard
                title="Quản lý đơn hàng"
                description="Tạo đơn nhanh, theo dõi trạng thái từ đặt cọc → lấy hàng → trả hàng. Tính tiền thuê tự động theo số ngày."
              />
              <FeatureCard
                title="Quản lý khách hàng"
                description="Lưu thông tin khách, lịch sử thuê, size áo. Dễ dàng tư vấn và chăm sóc khách hàng quay lại."
              />
              <FeatureCard
                title="Báo cáo doanh thu"
                description="Xem doanh thu theo ngày/tháng/năm. Biết bộ áo nào hot nhất, mùa nào đông khách để chuẩn bị kho."
              />
              <FeatureCard
                title="Đa nền tảng"
                description="Quản lý trên iPhone/iPad khi ở cửa hàng, dùng Web khi ở nhà. Dữ liệu đồng bộ real-time."
              />
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Phù hợp với mọi loại cửa hàng cho thuê áo dài
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <UseCaseCard title="Cửa hàng cho thuê áo dài cưới" items={['Quản lý bộ sưu tập theo mùa', 'Đặt cọc và lịch hẹn thử đồ', 'Theo dõi phụ kiện kèm theo']} />
              <UseCaseCard title="Tiệm cho thuê áo dài truyền thống" items={['Phân loại theo dịp: lễ, tết, sự kiện', 'Quản lý nhiều size cùng mẫu', 'Tính giá thuê theo ngày']} />
              <UseCaseCard title="Studio cho thuê áo dài chụp ảnh" items={['Gói combo áo dài + chụp ảnh', 'Lịch đặt theo slot thời gian', 'Quản lý phụ kiện, mấn, giày']} />
              <UseCaseCard title="Chuỗi cửa hàng áo dài" items={['Quản lý nhiều chi nhánh', 'Chuyển kho giữa các cửa hàng', 'Báo cáo tổng hợp toàn hệ thống']} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-rose-600 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Bắt đầu quản lý cửa hàng cho thuê áo dài chuyên nghiệp
            </h2>
            <p className="text-rose-100 mb-8">
              Dùng thử miễn phí 14 ngày, không cần thẻ tín dụng. Hỗ trợ setup trong 5 phút.
            </p>
            <Link href="/register" className="inline-flex items-center justify-center px-8 py-3 bg-white text-rose-600 rounded-lg font-semibold hover:bg-rose-50 transition-colors">
              Đăng ký miễn phí ngay
            </Link>
          </div>
        </section>

        {/* Back to home */}
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

function UseCaseCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <h3 className="font-semibold text-lg mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-rose-500 mt-0.5">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
