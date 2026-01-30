# Hướng dẫn lấy HuggingFace API Key

## 📋 Tổng quan

HuggingFace Inference API cho phép bạn sử dụng các AI models miễn phí để generate blog content. Free tier bao gồm **1,000 requests/tháng**.

## 🔑 Bước 1: Đăng ký/Đăng nhập HuggingFace

1. Truy cập: **https://huggingface.co/join**
   - Nếu chưa có tài khoản, đăng ký miễn phí
   - Hoặc đăng nhập tại: **https://huggingface.co/login**

## 🔑 Bước 2: Tạo API Token

1. Sau khi đăng nhập, vào **Settings**:
   - Click vào avatar/profile ở góc trên bên phải
   - Chọn **Settings**
   - Hoặc truy cập trực tiếp: **https://huggingface.co/settings/tokens**

2. Tạo token mới:
   - Click button **"New token"** hoặc **"Create new token"**
   - Đặt tên token (ví dụ: `RentalShop AI` hoặc `Blog Content Generator`)
   - Chọn quyền: **Read** (đủ cho Inference API)
   - Click **"Generate token"**

3. **QUAN TRỌNG**: Copy token ngay lập tức!
   - Token chỉ hiển thị **1 lần duy nhất**
   - Nếu quên, phải tạo token mới

## 🔑 Bước 3: Thêm vào Project

### Local Development

1. Tạo file `.env.local` trong root project (nếu chưa có):
   ```bash
   # Copy từ env.example
   cp env.example .env.local
   ```

2. Thêm API key vào `.env.local`:
   ```bash
   HUGGINGFACE_API_KEY=hf_your_token_here
   ```

3. Restart dev server:
   ```bash
   yarn dev:api
   ```

### Railway Deployment

1. Vào Railway Dashboard: https://railway.app
2. Chọn project và service **API**
3. Vào tab **Variables**
4. Click **"New Variable"**
5. Thêm:
   - **Name**: `HUGGINGFACE_API_KEY`
   - **Value**: `hf_your_token_here`
6. Click **"Add"**
7. Service sẽ tự động redeploy

## ✅ Kiểm tra API Key

Sau khi thêm API key, bạn có thể test bằng cách:

1. Vào Admin Dashboard
2. Tạo Post mới
3. Click **"Generate with AI"**
4. Nhập keyword và generate

Nếu thành công, content sẽ được generate. Nếu lỗi, kiểm tra:
- API key đã được thêm đúng chưa
- API key có quyền Read chưa
- Service đã restart/redeploy chưa

## 🔒 Bảo mật

- **KHÔNG** commit API key vào Git
- **KHÔNG** share API key công khai
- File `.env.local` đã được ignore trong `.gitignore`
- Railway variables được mã hóa tự động

## 📊 Free Tier Limits

- **1,000 requests/tháng** miễn phí
- Không cần credit card
- Có thể upgrade nếu cần thêm requests

## 🔄 Model mặc định

- Model: `mistralai/Mistral-7B-Instruct-v0.2`
- Có thể đổi bằng cách set `HUGGINGFACE_MODEL` trong env

## 🆘 Troubleshooting

### Lỗi: "HUGGINGFACE_API_KEY_NOT_CONFIGURED"
- Kiểm tra API key đã được thêm vào env chưa
- Restart service sau khi thêm env variable

### Lỗi: "Invalid API key"
- Kiểm tra token đã copy đúng chưa (không có khoảng trắng)
- Token phải bắt đầu với `hf_`
- Tạo token mới nếu cần

### Lỗi: "Model is loading"
- Model đang được load lần đầu (có thể mất 30-60 giây)
- Hệ thống sẽ tự động retry
- Nếu vẫn lỗi, thử model khác

## 📚 Tài liệu tham khảo

- HuggingFace Inference API: https://huggingface.co/docs/api-inference/index
- API Documentation: https://huggingface.co/docs/api-inference/quicktour
- Models Hub: https://huggingface.co/models
