'use client'

import React from 'react'
import { useLocale } from 'next-intl'
import { LanguageSwitcher } from '@rentalshop/ui'
import { Mail, Phone } from 'lucide-react'

export default function TermsPage() {
  const locale = useLocale()
  const isVi = locale === 'vi'

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-text-primary">
            {isVi ? 'Điều khoản dịch vụ – AnyRent' : 'Terms of Service – AnyRent'}
          </h1>
          <LanguageSwitcher variant="compact" />
        </div>
        <p className="text-text-secondary mb-8">
          {isVi ? 'Cập nhật lần cuối: 5 tháng 7, 2025' : 'Last updated: July 5, 2025'}
        </p>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-8">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '1. Mô tả dịch vụ' : '1. Service Description'}</h2>
            <p className="text-text-secondary mb-3">
              {isVi
                ? 'AnyRent là ứng dụng hỗ trợ quản lý cửa hàng cho thuê: quản lý đơn hàng, sản phẩm/tồn kho và doanh thu.'
                : 'AnyRent helps you manage rental shops: orders, inventory/products and revenue.'}
            </p>
            <p className="text-text-tertiary text-sm">
              {isVi
                ? 'Ứng dụng không xử lý thanh toán hay vận chuyển thực tế; tất cả giao dịch do người dùng tự quản lý.'
                : 'The app does not process payments or logistics; all transactions are managed by the user.'}
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '2. Tài khoản người dùng' : '2. User Account'}</h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>{isVi ? 'Cung cấp thông tin chính xác khi đăng ký.' : 'Provide accurate and complete information during registration.'}</li>
              <li>{isVi ? 'Tự chịu trách nhiệm bảo mật tài khoản/mật khẩu.' : 'You are responsible for keeping your account and password secure.'}</li>
              <li>{isVi ? 'Tài khoản có thể bị chấm dứt nếu vi phạm.' : 'Accounts may be terminated if misuse is detected.'}</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '3. Quyền sử dụng' : '3. License to Use'}</h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>{isVi ? 'Cấp quyền sử dụng không độc quyền, không chuyển nhượng cho mục đích quản lý cửa hàng.' : 'Non‑exclusive, non‑transferable right to use the app for managing your store.'}</li>
              <li>{isVi ? 'Không sao chép, chỉnh sửa, phân phối hoặc đảo ngược mã nguồn.' : 'Do not copy, modify, distribute, or reverse engineer the app.'}</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '4. Xóa dữ liệu & chấm dứt' : '4. Data Deletion & Termination'}</h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>{isVi ? 'Tài khoản không hoạt động/không gia hạn 7 ngày sẽ bị xóa dữ liệu.' : 'Inactive/expired accounts for 7 days will be permanently deleted.'}</li>
              <li>{isVi ? 'Bạn có thể yêu cầu xóa tài khoản bất kỳ lúc nào.' : 'You may request account deletion at any time.'}</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '5. Trách nhiệm & giới hạn' : '5. Liability Disclaimer'}</h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>{isVi ? 'Ứng dụng cung cấp "như hiện có"; không bảo đảm không lỗi/không gián đoạn.' : 'The app is provided "as is"; no guarantees of error‑free or uninterrupted service.'}</li>
              <li>{isVi ? 'Người dùng chịu trách nhiệm dữ liệu và hoạt động của mình.' : 'Users are responsible for their data and activities.'}</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '6. Thay đổi điều khoản' : '6. Changes to Terms'}</h2>
            <p className="text-text-secondary">
              {isVi ? 'Chúng tôi có thể cập nhật Điều khoản và sẽ thông báo khi có thay đổi.' : 'We may update these Terms and will notify you when changes occur.'}
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{isVi ? '7. Liên hệ' : '7. Contact'}</h2>
            <div className="bg-bg-secondary rounded-lg p-4 inline-block">
              <div className="flex items-center text-text-secondary mb-1">
                <Mail className="w-4 h-4 mr-2" />
                <span>trinhduc20@gmail.com</span>
              </div>
              <div className="flex items-center text-text-secondary">
                <Phone className="w-4 h-4 mr-2" />
                <span>+84 76 477 4647</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}



