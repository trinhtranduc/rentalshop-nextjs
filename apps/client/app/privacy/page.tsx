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
          {isVi ? 'Cập nhật lần cuối: 29 tháng 11, 2025' : 'Last updated: November 29, 2025'}
        </p>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-8">
          {/* 1. Introduction & Data Controller */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '1. Giới thiệu & Chủ thể xử lý dữ liệu' : '1. Introduction & Data Controller'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'AnyRent là phần mềm được phát triển và vận hành bởi một cá nhân lập trình viên tại Việt Nam (sau đây gọi là “tôi”). Chính sách này giải thích cách tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng AnyRent để quản lý cửa hàng cho thuê.'
                  : 'AnyRent is a software application developed and operated by an individual developer based in Vietnam (referred to as “I” or “the developer”). This Policy explains how I collect, use, and protect your personal data when you use AnyRent to manage your rental shop.'}
              </p>
              <p>
                {isVi
                  ? 'Tôi không phải là công ty hay pháp nhân, mà là một cá nhân xây dựng và duy trì ứng dụng này như một dịch vụ phần mềm cá nhân.'
                  : 'I am not a company or legal entity. I operate this application as a private individual providing a personal software service.'}
              </p>
              <div className="mt-2 text-sm text-text-tertiary">
                <p>
                  {isVi
                    ? 'Thông tin liên hệ (Data Controller):'
                    : 'Contact information (Data Controller):'}
                </p>
                <ul className="list-disc list-inside ml-4">
                  <li>
                    {isVi ? 'Tên cá nhân: [Tên đầy đủ của bạn]' : 'Individual name: [Your full name]'}
                  </li>
                  <li>Email: trinhduc20@gmail.com</li>
                  <li>Phone: +84 76 477 4647</li>
                  <li>{isVi ? 'Quốc gia: Việt Nam' : 'Country: Vietnam'}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '2. Thông tin tôi thu thập' : '2. Information I Collect'}
            </h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>
                {isVi
                  ? 'Thông tin tài khoản: Họ tên, email, số điện thoại, mật khẩu (được lưu ở dạng mã hóa), ngôn ngữ ưu tiên.'
                  : 'Account information: Full name, email, phone number, password (stored in encrypted form), preferred language.'}
              </li>
              <li>
                {isVi
                  ? 'Thông tin cửa hàng/doanh nghiệp: Tên cửa hàng, địa chỉ, số điện thoại, mô tả, loại hình kinh doanh.'
                  : 'Shop/business information: Shop name, address, phone number, description, business type.'}
              </li>
              <li>
                {isVi
                  ? 'Thông tin khách hàng của bạn: Họ tên, số điện thoại, email, địa chỉ, ghi chú liên quan đến việc thuê.'
                  : 'Your customers’ information: Names, phone numbers, email addresses, addresses, notes related to rentals.'}
              </li>
              <li>
                {isVi
                  ? 'Dữ liệu đơn hàng và sản phẩm: Thông tin sản phẩm, đơn thuê/bán, lịch sử giao dịch, doanh thu.'
                  : 'Order and product data: Product information, rental/sales orders, transaction history, revenue.'}
              </li>
              <li>
                {isVi
                  ? 'Thông tin kỹ thuật: Địa chỉ IP, loại thiết bị, trình duyệt, thời gian truy cập, log lỗi hệ thống.'
                  : 'Technical information: IP address, device type, browser, access time, system error logs.'}
              </li>
            </ul>
          </section>

          {/* 3. Legal Basis for Processing */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '3. Cơ sở xử lý dữ liệu' : '3. Legal Basis for Processing'}
            </h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>
                {isVi
                  ? 'Thực hiện dịch vụ: Để cung cấp cho bạn các tính năng quản lý cửa hàng cho thuê (tạo đơn, quản lý khách hàng, sản phẩm, doanh thu).'
                  : 'Service performance: To provide you with rental shop management features (orders, customers, products, revenue).'}
              </li>
              <li>
                {isVi
                  ? 'Sự đồng ý: Khi bạn đăng ký tài khoản và tiếp tục sử dụng AnyRent, bạn đồng ý với việc xử lý dữ liệu như mô tả trong chính sách này.'
                  : 'Consent: By registering an account and continuing to use AnyRent, you consent to the processing described in this Policy.'}
              </li>
              <li>
                {isVi
                  ? 'Lợi ích hợp lý: Cải thiện ứng dụng, ngăn chặn lạm dụng, phát hiện lỗi kỹ thuật và bảo vệ tài khoản của bạn.'
                  : 'Legitimate interests: Improving the app, preventing abuse, detecting technical issues, and protecting your account.'}
              </li>
              <li>
                {isVi
                  ? 'Nghĩa vụ pháp lý (nếu có): Khi pháp luật Việt Nam yêu cầu lưu trữ hoặc cung cấp thông tin trong một số trường hợp cụ thể.'
                  : 'Legal obligations (if applicable): When Vietnamese law requires storing or disclosing information in specific situations.'}
              </li>
            </ul>
          </section>

          {/* 4. How I Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '4. Tôi sử dụng thông tin của bạn như thế nào' : '4. How I Use Your Information'}
            </h2>
            <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
              <li>
                {isVi
                  ? 'Tạo và quản lý tài khoản của bạn.'
                  : 'To create and manage your account.'}
              </li>
              <li>
                {isVi
                  ? 'Lưu và hiển thị đơn hàng, khách hàng, sản phẩm và báo cáo cho bạn.'
                  : 'To store and display your orders, customers, products, and reports.'}
              </li>
              <li>
                {isVi
                  ? 'Gửi email hoặc thông báo liên quan đến tài khoản, bảo mật hoặc thay đổi tính năng.'
                  : 'To send emails or notifications related to your account, security, or feature changes.'}
              </li>
              <li>
                {isVi
                  ? 'Phân tích ẩn danh để cải thiện hiệu năng và trải nghiệm người dùng.'
                  : 'To perform anonymized analytics to improve performance and user experience.'}
              </li>
              <li>
                {isVi
                  ? 'Phát hiện và ngăn chặn hành vi gian lận hoặc lạm dụng dịch vụ.'
                  : 'To detect and prevent fraud or abusive behavior.'}
              </li>
            </ul>
          </section>

          {/* 5. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '5. Lưu trữ dữ liệu' : '5. Data Retention'}
            </h2>
            <p className="text-text-secondary">
              {isVi
                ? 'Tôi lưu trữ dữ liệu của bạn trong suốt thời gian tài khoản đang hoạt động. Khi bạn yêu cầu xóa tài khoản hoặc tài khoản hết hạn/không được gia hạn, tôi sẽ cố gắng xóa hoặc ẩn danh dữ liệu liên quan trong vòng 30 ngày, trừ khi pháp luật yêu cầu lưu trữ lâu hơn. Dữ liệu log kỹ thuật có thể được lưu trong thời gian ngắn hơn chỉ để phân tích lỗi và bảo mật.'
                : 'I keep your data for as long as your account is active. When you request account deletion or your account expires/is not renewed, I will aim to delete or anonymize related data within 30 days, unless the law requires longer retention. Technical logs may be stored for a shorter period solely for debugging and security.'}
            </p>
          </section>

          {/* 6. Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '6. Chia sẻ dữ liệu' : '6. Data Sharing'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'Tôi không bán dữ liệu cá nhân của bạn cho bên thứ ba.'
                  : 'I do not sell your personal data to third parties.'}
              </p>
              <p>
                {isVi
                  ? 'Tôi chỉ chia sẻ dữ liệu trong các trường hợp: với nhà cung cấp hạ tầng kỹ thuật (hosting, database, email) để vận hành ứng dụng; khi pháp luật Việt Nam yêu cầu; hoặc khi cần thiết để bảo vệ quyền lợi hợp pháp của tôi (ví dụ: xử lý lạm dụng, gian lận).'
                  : 'I only share data in these cases: with technical infrastructure providers (hosting, database, email) to operate the app; when required by Vietnamese law; or when necessary to protect my legitimate rights (for example, handling abuse or fraud).'}
              </p>
            </div>
          </section>

          {/* 7. International Transfers */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '7. Chuyển dữ liệu ra nước ngoài' : '7. International Data Transfers'}
            </h2>
            <p className="text-text-secondary">
              {isVi
                ? 'Máy chủ và dịch vụ hạ tầng có thể được đặt tại Việt Nam hoặc ở quốc gia khác. Khi đó, dữ liệu của bạn có thể được lưu trữ hoặc xử lý tại các quốc gia đó. Tôi cố gắng lựa chọn nhà cung cấp uy tín với chính sách bảo mật phù hợp.'
                : 'Servers and infrastructure services may be located in Vietnam or other countries. Your data may therefore be stored or processed in those countries. I seek to choose reputable providers with appropriate privacy and security standards.'}
            </p>
          </section>

          {/* 8. Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '8. Bảo mật dữ liệu' : '8. Data Security'}
            </h2>
            <p className="text-text-secondary">
              {isVi
                ? 'Tôi áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để bảo vệ dữ liệu (mã hóa mật khẩu, hạn chế quyền truy cập, sử dụng kết nối an toàn khi khả thi). Tuy nhiên, không có hệ thống nào an toàn tuyệt đối 100%, nên tôi không thể bảo đảm rằng dữ liệu của bạn sẽ không bao giờ bị truy cập trái phép.'
                : 'I use reasonable technical and organizational measures to protect your data (password encryption, limited access control, secure connections where possible). However, no system is 100% secure, so I cannot guarantee that your data will never be accessed without authorization.'}
            </p>
          </section>

          {/* 9. Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '9. Quyền của bạn' : '9. Your Rights'}
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p>
                {isVi
                  ? 'Bạn có thể yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân và tài khoản của mình (trong phạm vi kỹ thuật và pháp luật cho phép). Bạn cũng có thể rút lại sự đồng ý bằng cách ngừng sử dụng dịch vụ và yêu cầu xóa tài khoản.'
                  : 'You may request to access, correct, or delete your personal data and account (to the extent technically and legally possible). You may also withdraw your consent by stopping the use of the service and requesting account deletion.'}
              </p>
              <p>
                {isVi
                  ? 'Để thực hiện các quyền này, hãy liên hệ qua email: trinhduc20@gmail.com. Tôi sẽ cố gắng phản hồi trong vòng 30 ngày.'
                  : 'To exercise these rights, contact me at: trinhduc20@gmail.com. I will do my best to respond within 30 days.'}
              </p>
            </div>
          </section>

          {/* 10. Children’s Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '10. Người dùng dưới 16 tuổi' : '10. Children’s Privacy'}
            </h2>
            <p className="text-text-secondary">
              {isVi
                ? 'AnyRent không được thiết kế cho người dùng dưới 16 tuổi. Nếu bạn dưới 16 tuổi, vui lòng không sử dụng ứng dụng và không cung cấp thông tin cá nhân cho tôi.'
                : 'AnyRent is not designed for users under 16 years old. If you are under 16, please do not use the application and do not provide any personal data to me.'}
            </p>
          </section>

          {/* 11. Changes to This Policy */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '11. Thay đổi chính sách' : '11. Changes to This Policy'}
            </h2>
            <p className="text-text-secondary">
              {isVi
                ? 'Tôi có thể cập nhật Chính sách Quyền riêng tư này theo thời gian. Khi có thay đổi quan trọng, tôi sẽ cập nhật ngày “Cập nhật lần cuối” ở đầu trang và có thể thông báo trong ứng dụng.'
                : 'I may update this Privacy Policy from time to time. When significant changes are made, I will update the “Last updated” date at the top of this page and may notify you within the app.'}
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {isVi ? '12. Liên hệ' : '12. Contact'}
            </h2>
            <p className="text-text-secondary">
              {isVi
                ? 'Nếu bạn có bất kỳ câu hỏi nào về chính sách này hoặc cách tôi xử lý dữ liệu cá nhân, hãy liên hệ qua email: trinhduc20@gmail.com hoặc số điện thoại: +84 76 477 4647.'
                : 'If you have any questions about this Policy or how I handle personal data, please contact me at: trinhduc20@gmail.com or phone: +84 76 477 4647.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

