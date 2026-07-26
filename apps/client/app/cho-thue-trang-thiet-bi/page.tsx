import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Phần mềm Quản lý Cho thuê Trang thiết bị | AnyRent',
  description: 'Phần mềm quản lý cho thuê trang thiết bị, máy móc, dụng cụ chuyên nghiệp. Theo dõi tình trạng thiết bị, lịch bảo trì, đơn hàng và khách hàng. Dùng thử miễn phí.',
  keywords: [
    'phần mềm quản lý cho thuê trang thiết bị',
    'ứng dụng quản lý cho thuê thiết bị',
    'app quản lý cho thuê máy móc',
    'quản lý cho thuê dụng cụ',
    'phần mềm quản lý cho thuê equipment',
    'quản lý kho thiết bị cho thuê',
  ],
  alternates: { canonical: '/cho-thue-trang-thiet-bi' },
  openGraph: {
    title: 'Phần mềm Quản lý Cho thuê Trang thiết bị | AnyRent',
    description: 'Giải pháp quản lý cho thuê trang thiết bị, máy móc toàn diện trên iOS và Web.',
    type: 'website',
    url: '/cho-thue-trang-thiet-bi',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AnyRent - Phần mềm quản lý cho thuê trang thiết bị',
  applicationCategory: 'BusinessApplication',
  operatingSystem: ['iOS', 'Web'],
  description: 'Phần mềm quản lý cho thuê trang thiết bị, máy móc, dụng cụ chuyên nghiệp tại Việt Nam.',
  offers: { '@type': 'Offer', price: '99000', priceCurrency: 'VND' },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop' },
    { '@type': 'ListItem', position: 2, name: 'Cho thuê Trang thiết bị', item: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'}/cho-thue-trang-thiet-bi` },
  ],
};

export default function ChoThueTrangThietBiPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-blue-50 to-cyan-100 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Phần mềm Quản lý <span className="text-blue-600">Cho thuê Trang thiết bị</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Quản lý cho thuê máy móc, dụng cụ, thiết bị sự kiện chuyên nghiệp. Theo dõi tình trạng, lịch bảo trì và đơn hàng từ mọi nơi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Dùng thử miễn phí 14 ngày
              </Link>
              <Link href="https://apps.apple.com/vn/app/anyrent/id6754793592" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Tải ứng dụng iOS
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Tính năng quản lý cho thuê thiết bị</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Feature title="Theo dõi tình trạng thiết bị" desc="Quản lý trạng thái: sẵn sàng, đang cho thuê, đang sửa chữa, bảo trì định kỳ." />
              <Feature title="Lịch bảo trì tự động" desc="Đặt lịch bảo trì theo số giờ sử dụng hoặc theo chu kỳ. Nhắc nhở tự động khi đến hạn." />
              <Feature title="Quản lý phụ kiện kèm theo" desc="Gán phụ kiện, dây cáp, hộp đựng vào từng thiết bị. Kiểm tra đầy đủ khi nhận trả." />
              <Feature title="Tính giá linh hoạt" desc="Giá theo giờ, ngày, tuần hoặc tháng. Hỗ trợ chiết khấu cho khách thuê dài hạn." />
              <Feature title="Hợp đồng & tiền cọc" desc="Tạo hợp đồng cho thuê, quản lý tiền đặt cọc, phí hư hỏng và phí trả muộn." />
              <Feature title="Báo cáo hiệu suất" desc="Thống kê thiết bị nào cho thuê nhiều nhất, tỷ lệ sử dụng, doanh thu theo từng thiết bị." />
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-blue-600 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Quản lý thiết bị cho thuê hiệu quả hơn</h2>
            <p className="text-blue-100 mb-8">Phù hợp cho: cho thuê thiết bị sự kiện, máy xây dựng, dụng cụ công nghiệp, thiết bị y tế, máy in/photocopy.</p>
            <Link href="/register" className="inline-flex items-center justify-center px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Đăng ký miễn phí ngay
            </Link>
          </div>
        </section>

        <div className="py-8 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← Quay lại trang chủ AnyRent</Link>
        </div>
      </div>
    </>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}
