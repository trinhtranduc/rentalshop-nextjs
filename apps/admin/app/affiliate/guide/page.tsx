'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge
} from '@rentalshop/ui';
import {
  Share2,
  Link,
  Copy,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Users,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@rentalshop/ui';

export default function AffiliateGuidePage() {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toastSuccess('Đã sao chép link!');
  };

  return (
    <PageWrapper>
      <PageContent>
        <PageHeader>
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          </div>
          <PageTitle subtitle="Hướng dẫn sử dụng chương trình Affiliate">
            Chương trình Affiliate
          </PageTitle>
        </PageHeader>

        {/* Overview Section */}
        <Card className="mb-6 border-2 border-action-primary bg-gradient-to-r from-action-primary/5 to-action-primary/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-action-primary/10 rounded-lg">
                <Share2 className="h-8 w-8 text-action-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-action-primary mb-2">
                  Kiếm 10% hoa hồng từ mỗi đơn hàng
                </h2>
                <p className="text-text-secondary mb-4">
                  Chương trình Affiliate cho phép bạn kiếm thu nhập thụ động bằng cách giới thiệu khách hàng mới đến nền tảng. 
                  Bạn sẽ nhận được 10% tổng giá trị đơn hàng từ mỗi khách hàng được giới thiệu.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center gap-3 p-4 bg-bg-card rounded-lg border">
                    <DollarSign className="h-6 w-6 text-action-success" />
                    <div>
                      <div className="font-bold text-lg">10%</div>
                      <div className="text-sm text-text-secondary">Hoa hồng</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-bg-card rounded-lg border">
                    <TrendingUp className="h-6 w-6 text-action-primary" />
                    <div>
                      <div className="font-bold text-lg">Tự động</div>
                      <div className="text-sm text-text-secondary">Thanh toán</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-bg-card rounded-lg border">
                    <Users className="h-6 w-6 text-action-warning" />
                    <div>
                      <div className="font-bold text-lg">Không giới hạn</div>
                      <div className="text-sm text-text-secondary">Số lượng giới thiệu</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cách thức hoạt động</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-action-primary/10 flex items-center justify-center text-action-primary font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Lấy link giới thiệu</h3>
                  <p className="text-text-secondary">
                    Vào trang quản lý Affiliate để lấy link giới thiệu duy nhất của bạn. 
                    Link này sẽ được gắn với tài khoản của bạn để theo dõi các đơn hàng được giới thiệu.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-action-primary/10 flex items-center justify-center text-action-primary font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Chia sẻ link</h3>
                  <p className="text-text-secondary">
                    Chia sẻ link giới thiệu của bạn qua email, mạng xã hội, website, hoặc bất kỳ kênh nào bạn muốn. 
                    Mỗi khi có người click vào link và đăng ký tài khoản mới, họ sẽ được gắn với bạn.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-action-primary/10 flex items-center justify-center text-action-primary font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Nhận hoa hồng</h3>
                  <p className="text-text-secondary">
                    Khi khách hàng được giới thiệu tạo đơn hàng và thanh toán thành công, 
                    bạn sẽ tự động nhận được 10% tổng giá trị đơn hàng. Hoa hồng sẽ được cộng vào tài khoản của bạn.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Chi tiết hoa hồng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-bg-secondary rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Tỷ lệ hoa hồng</span>
                  <Badge variant="default" className="text-lg">10%</Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  Áp dụng cho tổng giá trị đơn hàng (bao gồm cả phí vận chuyển nếu có)
                </p>
              </div>

              <div className="p-4 bg-bg-secondary rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Thời gian thanh toán</span>
                  <Badge variant="default">Tự động</Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  Hoa hồng được cộng vào tài khoản ngay khi đơn hàng được thanh toán thành công
                </p>
              </div>

              <div className="p-4 bg-bg-secondary rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Theo dõi</span>
                  <Badge variant="default">Real-time</Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  Bạn có thể theo dõi số lượng đơn hàng được giới thiệu và tổng hoa hồng trong trang quản lý Affiliate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Calculation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ví dụ tính hoa hồng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-bg-secondary rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-action-success" />
                  <span className="font-semibold">Ví dụ 1: Đơn hàng 1,000,000 VND</span>
                </div>
                <div className="ml-7 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Tổng giá trị đơn hàng:</span>
                    <span className="font-medium">1,000,000 VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Hoa hồng (10%):</span>
                    <span className="font-bold text-action-success">100,000 VND</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-bg-secondary rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-action-success" />
                  <span className="font-semibold">Ví dụ 2: Đơn hàng 5,000,000 VND</span>
                </div>
                <div className="ml-7 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Tổng giá trị đơn hàng:</span>
                    <span className="font-medium">5,000,000 VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Hoa hồng (10%):</span>
                    <span className="font-bold text-action-success">500,000 VND</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mẹo để tăng doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-action-success flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Chia sẻ trên nhiều kênh</h4>
                  <p className="text-sm text-text-secondary">
                    Sử dụng email, mạng xã hội, blog, hoặc website để tiếp cận nhiều đối tượng hơn
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-action-success flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Tạo nội dung giá trị</h4>
                  <p className="text-sm text-text-secondary">
                    Chia sẻ trải nghiệm thực tế và lợi ích của nền tảng để thu hút khách hàng
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-action-success flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Theo dõi hiệu quả</h4>
                  <p className="text-sm text-text-secondary">
                    Kiểm tra trang quản lý Affiliate thường xuyên để xem link nào đang hoạt động tốt nhất
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-action-success flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Xây dựng mối quan hệ</h4>
                  <p className="text-sm text-text-secondary">
                    Hỗ trợ khách hàng được giới thiệu để họ có trải nghiệm tốt và quay lại sử dụng
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-2 border-action-primary">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Sẵn sàng bắt đầu?</h3>
              <p className="text-text-secondary mb-4">
                Lấy link giới thiệu của bạn ngay bây giờ và bắt đầu kiếm hoa hồng
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="default"
                  onClick={() => router.push('/affiliate')}
                  className="flex items-center gap-2"
                >
                  <Link className="h-4 w-4" />
                  Quản lý Affiliate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </PageWrapper>
  );
}
