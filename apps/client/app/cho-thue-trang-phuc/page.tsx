import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Phần mềm Quản lý Cho thuê Trang phục | AnyRent',
  description: 'Phần mềm quản lý cho thuê trang phục biểu diễn, cosplay, trang phục sự kiện, đồng phục. Quản lý kho, đơn hàng, lịch đặt và khách hàng. Dùng thử miễn phí.',
  keywords: [
    'phần mềm quản lý cho thuê trang phục',
    'ứng dụng quản lý cho thuê trang phục biểu diễn',
    'app quản lý cho thuê đồ cosplay',
    'quản lý cho thuê trang phục sự kiện',
    'phần mềm quản lý cho thuê đồng phục',
    'quản lý kho trang phục cho thuê',
  ],
  alternates: { canonical: '/cho-thue-trang-phuc' },
  openGraph: {
    title: 'Phần mềm Quản lý Cho thuê Trang phục | AnyRent',
    description: 'Giải pháp quản lý cho thuê trang phục biểu diễn, cosplay, sự kiện toàn diện.',
    type: 'website',
    url: '/cho-thue-trang-phuc',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AnyRent - Phần mềm quản lý cho thuê trang phục',
  applicationCategory: 'BusinessApplication',
  operatingSystem: ['iOS', 'Web'],
  description: 'Phần mềm quản lý cho thuê trang phục biểu diễn, cosplay, trang phục sự kiện chuyên nghiệp.',
  offers: { '@type': 'Offer', price: '99000', priceCurrency: 'VND' },
};

export default function ChoThueTrangPhucPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-amber-50 to-orange-100 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Phần mềm Quản lý <span className="text-amber-600">Cho thuê Trang phục</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Giải pháp cho cửa hàng cho thuê trang phục biểu diễn, cosplay, trang phục sự kiện, đồng phục. Quản lý bộ sưu tập, size, phụ kiện và lịch đặt dễ dàng.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors">
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
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Tính năng quản lý cho thuê trang phục</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Feature title="Quản lý bộ sưu tập" desc="Phân loại theo thể loại: biểu diễn, cosplay, sự kiện, lịch sử, fantasy. Quản lý ảnh và mô tả chi tiết." />
              <Feature title="Quản lý size & phụ kiện" desc="Theo dõi từng size có sẵn. Gán phụ kiện kèm theo: mũ, giày, găng tay, trang sức." />
              <Feature title="Lịch đặt trực quan" desc="Xem nhanh bộ nào đang trống, bộ nào đã đặt. Tránh trùng đơn cho trang phục hot." />
              <Feature title="Quản lý giặt/sửa chữa" desc="Theo dõi trang phục đang giặt, đang sửa. Đánh dấu sẵn sàng cho thuê khi hoàn thành." />
              <Feature title="Gói combo sự kiện" desc="Tạo gói cho thuê nhiều bộ: nhóm nhảy, đoàn kịch, tiệc hóa trang. Tính giá trọn gói." />
              <Feature title="Quản lý hư hỏng" desc="Ghi nhận tình trạng trước/sau cho thuê. Tính phí hư hỏng tự động vào đơn hàng." />
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Phù hợp với nhiều loại hình</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <UseCase title="Cho thuê trang phục biểu diễn" items={['Quần áo nhóm nhảy, ca sĩ', 'Trang phục kịch, musical', 'Đồng phục đội nhóm sự kiện']} />
              <UseCase title="Cho thuê đồ cosplay" items={['Cosplay anime, game, phim', 'Phụ kiện: tóc giả, vũ khí prop', 'Cho thuê theo event/convention']} />
              <UseCase title="Trang phục sự kiện" items={['Halloween, tiệc hóa trang', 'Trang phục chụp ảnh concept', 'Đồng phục team building']} />
              <UseCase title="Trang phục truyền thống" items={['Hanbok, Kimono, Áo tứ thân', 'Trang phục dân tộc', 'Cho thuê theo dịp lễ hội']} />
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-amber-600 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Quản lý trang phục cho thuê chuyên nghiệp</h2>
            <p className="text-amber-100 mb-8">Dùng thử miễn phí 14 ngày. Setup trong 5 phút, không cần kỹ thuật.</p>
            <Link href="/register" className="inline-flex items-center justify-center px-8 py-3 bg-white text-amber-600 rounded-lg font-semibold hover:bg-amber-50 transition-colors">
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

function UseCase({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <h3 className="font-semibold text-lg mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-amber-500 mt-0.5">✓</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}
