'use client'

import React from 'react'
import { useLocale } from 'next-intl'
import { LanguageSwitcher } from '@rentalshop/ui'

export default function PrivacyPage() {
  const locale = useLocale()
  const isVi = locale === 'vi'

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-text-primary">
            {isVi ? 'Chính sách quyền riêng tư – AnyRent' : 'Privacy Policy – AnyRent'}
          </h1>
          <LanguageSwitcher variant="compact" />
        </div>
        <p className="text-text-secondary mb-8">
          {isVi ? 'Cập nhật lần cuối: 5 tháng 7, 2025' : 'Last updated: July 5, 2025'}
        </p>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-8">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '1. Thông tin chúng tôi thu thập' : '1. Information We Collect'}</h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>{isVi ? 'Thông tin định danh: Họ tên, Email, Số điện thoại' : 'Personally Identifiable Information: Full name, Email, Phone'}</li>
              <li>{isVi ? 'Thông tin doanh nghiệp: Tên và địa chỉ cửa hàng' : 'Business Information: Shop name and address'}</li>
              <li>{isVi ? 'Dữ liệu thiết bị & nhật ký sử dụng' : 'Device and usage logs'}</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '2. Cơ sở pháp lý xử lý dữ liệu' : '2. Legal Basis for Processing'}</h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>{isVi ? 'Sự đồng ý của người dùng' : 'User consent'}</li>
              <li>{isVi ? 'Cần thiết để thực hiện chức năng dịch vụ' : 'Contractual necessity to provide core functions'}</li>
              <li>{isVi ? 'Nghĩa vụ pháp lý (nếu có)' : 'Legal obligations (if applicable)'}</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '3. Mục đích sử dụng' : '3. How We Use Your Information'}</h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>{isVi ? 'Đăng ký và quản lý tài khoản' : 'Register and manage your account'}</li>
              <li>{isVi ? 'Hỗ trợ quản lý đơn thuê, sản phẩm, doanh thu' : 'Support rental orders, products and revenue management'}</li>
              <li>{isVi ? 'Cải thiện sản phẩm và gửi thông báo liên quan' : 'Improve product and send relevant notices'}</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '4. Thời gian lưu trữ' : '4. Data Retention'}</h2>
            <p className="text-text-secondary">
              {isVi ? 'Cho đến khi bạn yêu cầu xóa hoặc cần thiết cho mục đích thu thập.' : 'Until you request deletion or as necessary to fulfill the purposes.'}
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '5. Bảo mật dữ liệu' : '5. Data Security'}</h2>
            <p className="text-text-secondary">
              {isVi ? 'Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu. Không hệ thống nào an toàn tuyệt đối.' : 'We apply appropriate technical and organizational measures. No system is 100% secure.'}
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '6. Chia sẻ thông tin' : '6. Data Sharing'}</h2>
            <p className="text-text-secondary">
              {isVi ? 'Không bán/chia sẻ dữ liệu cá nhân cho bên thứ ba trừ khi có sự đồng ý hoặc theo yêu cầu pháp luật.' : 'We do not sell/share personal data to third parties unless with consent or required by law.'}
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '7. Quyền của người dùng' : '7. Your Rights'}</h2>
            <p className="text-text-secondary">
              {isVi ? 'Bạn có quyền truy cập, chỉnh sửa, xóa, phản đối hoặc rút lại sự đồng ý.' : 'You may access, rectify, delete, object or withdraw consent.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}



