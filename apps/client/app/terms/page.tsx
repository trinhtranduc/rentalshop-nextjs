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
            {isVi ? 'Điều khoản sử dụng – AnyRent' : 'Terms of Service – AnyRent'}
          </h1>
          <LanguageSwitcher variant="compact" />
        </div>
        <p className="text-text-secondary mb-8">
          {isVi ? 'Cập nhật lần cuối: 29 tháng 11, 2025' : 'Last updated: November 29, 2025'}
        </p>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-8">
          {/* 1. Acceptance of Terms & Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '1. Chấp nhận điều khoản & Giới thiệu' : '1. Acceptance of Terms & Introduction'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'Bằng việc tạo tài khoản hoặc sử dụng AnyRent, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý bị ràng buộc bởi Điều khoản Sử dụng này và Chính sách Quyền riêng tư.'
                  : 'By creating an account or using AnyRent, you confirm that you have read, understood, and agree to be bound by these Terms of Service and the Privacy Policy.'}
              </p>
              <p className="text-text-tertiary text-sm">
                {isVi
                  ? 'AnyRent là phần mềm được phát triển và vận hành bởi một cá nhân lập trình viên tại Việt Nam, không phải công ty hay pháp nhân.'
                  : 'AnyRent is developed and operated by an individual developer based in Vietnam, not by a company or legal entity.'}
              </p>
            </div>
          </section>

          {/* 2. Service Description */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '2. Mô tả dịch vụ' : '2. Service Description'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'AnyRent là ứng dụng hỗ trợ bạn quản lý cửa hàng cho thuê và bán hàng, bao gồm quản lý sản phẩm, khách hàng, đơn hàng và doanh thu.'
                  : 'AnyRent is a software application that helps you manage your rental and sales shop, including products, customers, orders, and revenue.'}
              </p>
              <p className="text-text-tertiary text-sm">
                {isVi
                  ? 'AnyRent không trực tiếp xử lý thanh toán, vận chuyển hay hợp đồng thuê giữa bạn và khách hàng của bạn; mọi giao dịch thực tế hoàn toàn do bạn và khách hàng của bạn thực hiện và chịu trách nhiệm.'
                  : 'AnyRent does not directly handle payments, shipping, or rental contracts between you and your customers; all real-world transactions are carried out and managed solely by you and your customers.'}
              </p>
            </div>
          </section>

          {/* 3. Eligibility & Account */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '3. Đối tượng sử dụng & Tài khoản' : '3. Eligibility & Account'}
            </h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>
                {isVi
                  ? 'Bạn phải từ 18 tuổi trở lên hoặc có đủ năng lực hành vi dân sự theo luật Việt Nam để sử dụng ứng dụng này.'
                  : 'You must be at least 18 years old, or have full legal capacity under Vietnamese law, to use this application.'}
              </li>
              <li>
                {isVi
                  ? 'Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu của mình, cũng như mọi hoạt động diễn ra dưới tài khoản đó.'
                  : 'You are responsible for keeping your account and password secure, and for all activities under your account.'}
              </li>
              <li>
                {isVi
                  ? 'Bạn phải cung cấp thông tin chính xác và cập nhật khi đăng ký và sử dụng tài khoản.'
                  : 'You must provide accurate and up-to-date information when registering and using your account.'}
              </li>
            </ul>
          </section>

          {/* 4. User Obligations */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '4. Nghĩa vụ của người dùng' : '4. User Obligations'}
            </h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>
                {isVi
                  ? 'Không sử dụng AnyRent cho mục đích trái pháp luật hoặc gây hại cho người khác.'
                  : 'Do not use AnyRent for unlawful purposes or to harm others.'}
              </li>
              <li>
                {isVi
                  ? 'Không lưu trữ hoặc nhập nội dung vi phạm quyền riêng tư, xúc phạm, lừa đảo hoặc bất hợp pháp.'
                  : 'Do not store or input content that is illegal, offensive, fraudulent, or violates others’ privacy.'}
              </li>
              <li>
                {isVi
                  ? 'Không cố gắng truy cập trái phép vào hệ thống, tài khoản của người dùng khác hoặc can thiệp vào hoạt động bình thường của dịch vụ.'
                  : 'Do not attempt to gain unauthorized access to the system, other users’ accounts, or interfere with the normal operation of the service.'}
              </li>
              <li>
                {isVi
                  ? 'Không sao chép, sửa đổi, phân phối, dịch ngược, giải mã hoặc cố gắng trích xuất mã nguồn của ứng dụng.'
                  : 'Do not copy, modify, distribute, reverse engineer, decompile, or attempt to extract the source code of the application.'}
              </li>
            </ul>
          </section>

          {/* 5. Intellectual Property & License */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '5. Sở hữu trí tuệ & Giấy phép sử dụng' : '5. Intellectual Property & License'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'Toàn bộ mã nguồn, thiết kế và nội dung hệ thống của AnyRent (trừ dữ liệu do bạn nhập) thuộc quyền sở hữu của tôi với tư cách cá nhân hoặc được sử dụng theo giấy phép hợp lệ.'
                  : 'All source code, design, and system content of AnyRent (excluding the data you input) are owned by me as an individual developer or used under valid licenses.'}
              </p>
              <p>
                {isVi
                  ? 'Bạn được cấp một quyền sử dụng hạn chế, không độc quyền, không chuyển nhượng để dùng AnyRent nhằm quản lý cửa hàng của mình.'
                  : 'You are granted a limited, non-exclusive, non-transferable license to use AnyRent for managing your own shop.'}
              </p>
            </div>
          </section>

          {/* 6. Your Data */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '6. Dữ liệu và nội dung của bạn' : '6. Your Data and Content'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'Bạn giữ quyền sở hữu đối với dữ liệu và nội dung mà bạn nhập vào AnyRent (thông tin cửa hàng, khách hàng, đơn hàng, v.v.).'
                  : 'You retain ownership of the data and content you input into AnyRent (shop information, customers, orders, etc.).'}
              </p>
              <p>
                {isVi
                  ? 'Bằng việc sử dụng dịch vụ, bạn cho phép tôi sử dụng dữ liệu đó chỉ để vận hành, bảo trì và cải thiện ứng dụng, như được mô tả trong Chính sách Quyền riêng tư.'
                  : 'By using the service, you allow me to use such data solely to operate, maintain, and improve the application, as described in the Privacy Policy.'}
              </p>
            </div>
          </section>

          {/* 7. Disclaimers & Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '7. Miễn trừ trách nhiệm & Giới hạn trách nhiệm' : '7. Disclaimers & Limitation of Liability'}
            </h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>
                {isVi
                  ? 'AnyRent được cung cấp “như hiện có” (as is), không có bất kỳ bảo đảm rõ ràng hoặc ngầm định nào về độ chính xác, ổn định hoặc phù hợp cho một mục đích cụ thể.'
                  : 'AnyRent is provided “as is”, without any express or implied warranties regarding accuracy, stability, or fitness for a particular purpose.'}
              </li>
              <li>
                {isVi
                  ? 'Tôi không chịu trách nhiệm đối với bất kỳ thiệt hại gián tiếp, đặc biệt, ngẫu nhiên hoặc hậu quả nào phát sinh từ việc bạn sử dụng hoặc không thể sử dụng ứng dụng.'
                  : 'I am not liable for any indirect, special, incidental, or consequential damages arising from your use or inability to use the application.'}
              </li>
            </ul>
          </section>

          {/* 8. Termination & Data Deletion */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '8. Chấm dứt & Xóa dữ liệu' : '8. Termination & Data Deletion'}
            </h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>
                {isVi
                  ? 'Bạn có thể ngừng sử dụng AnyRent bất kỳ lúc nào và yêu cầu xóa tài khoản thông qua email liên hệ.'
                  : 'You may stop using AnyRent at any time and request account deletion via the contact email.'}
              </li>
              <li>
                {isVi
                  ? 'Tôi có thể chấm dứt hoặc tạm đình chỉ tài khoản của bạn nếu phát hiện vi phạm nghiêm trọng Điều khoản này hoặc hành vi lạm dụng.'
                  : 'I may terminate or suspend your account if I detect serious violations of these Terms or abusive behavior.'}
              </li>
              <li>
                {isVi
                  ? 'Khi tài khoản bị xóa hoặc hết hạn/không được gia hạn, tôi sẽ cố gắng xóa hoặc ẩn danh dữ liệu liên quan trong vòng 30 ngày, trừ khi pháp luật yêu cầu lưu trữ lâu hơn.'
                  : 'When an account is deleted or expires/is not renewed, I will aim to delete or anonymize related data within 30 days, unless the law requires longer retention.'}
              </li>
              <li>
                {isVi
                  ? 'Nếu bạn ngừng sử dụng hoặc hủy dịch vụ trước khi hết kỳ thanh toán hiện tại, chúng tôi không hoàn lại bất kỳ khoản phí nào (toàn phần hoặc một phần) cho khoảng thời gian chưa sử dụng.'
                  : 'If you stop using or cancel the service before the end of your current billing period, no fees (in full or in part) will be refunded for the remaining unused time.'}
              </li>
            </ul>
          </section>

          {/* 9. Governing Law & Dispute Resolution */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '9. Luật áp dụng & Giải quyết tranh chấp' : '9. Governing Law & Dispute Resolution'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh từ hoặc liên quan đến việc sử dụng AnyRent sẽ được ưu tiên giải quyết bằng thương lượng thiện chí.'
                  : 'These Terms are governed by the laws of Vietnam. Any disputes arising out of or in connection with the use of AnyRent shall first be attempted to be resolved through good‑faith negotiation.'}
              </p>
              <p>
                {isVi
                  ? 'Nếu không thể giải quyết bằng thương lượng, tranh chấp sẽ được giải quyết tại tòa án có thẩm quyền tại Việt Nam.'
                  : 'If negotiation fails, the dispute shall be submitted to the competent courts in Vietnam.'}
              </p>
            </div>
          </section>

          {/* 10. Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '10. Thay đổi Điều khoản' : '10. Changes to the Terms'}
            </h2>
            <p className="text-text-secondary">
              {isVi
                ? 'Tôi có thể cập nhật Điều khoản Sử dụng này theo thời gian. Khi có thay đổi quan trọng, tôi sẽ cập nhật ngày “Cập nhật lần cuối” ở đầu trang và có thể thông báo trong ứng dụng. Nếu bạn tiếp tục sử dụng AnyRent sau khi Điều khoản được cập nhật, bạn được xem là đã chấp nhận phiên bản mới.'
                : 'I may update these Terms of Service from time to time. When significant changes are made, I will update the “Last updated” date at the top of this page and may notify you within the app. By continuing to use AnyRent after such updates, you are deemed to have accepted the new version.'}
            </p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '11. Liên hệ' : '11. Contact'}
            </h2>
            <div className="bg-bg-secondary rounded-lg p-4 inline-block text-text-secondary">
              <div className="flex items-center mb-1">
                <Mail className="w-4 h-4 mr-2" />
                <span>trinhduc20@gmail.com</span>
              </div>
              <div className="flex items-center">
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

