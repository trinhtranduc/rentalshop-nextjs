# API: Order Notes Images (Mobile & Web)

Cách gọi API đúng khi **tạo** hoặc **chỉnh sửa** note images (thêm / xóa ảnh) trên mobile và web.

---

## Endpoint

- **Cập nhật order (settings + note images):** `PUT /api/orders/:orderId`
- **orderId:** số (publicId của order), ví dụ `1234`

---

## 1. Chỉ xóa ảnh (không thêm ảnh mới)

Gửi **JSON**, không dùng FormData.

- **Content-Type:** `application/json`
- **Body:** object chứa mảng `notesImages` là danh sách URL **sau khi xóa** (không gửi file).

**Ví dụ:** Đang có 3 ảnh `[url1, url2, url3]`, xóa `url2` → gửi:

```json
{
  "notesImages": ["url1", "url3"]
}
```

Có thể gửi kèm các field khác (notes, damageFee, ...) nếu cần.

```http
PUT /api/orders/1234
Content-Type: application/json

{
  "notesImages": ["https://...", "https://..."]
}
```

---

## 2. Chỉ thêm ảnh mới (không xóa)

Gửi **FormData** (multipart), có file đính kèm.

- **Content-Type:** `multipart/form-data` (do client set tự động, có boundary).
- **Form fields:**
  - **Bắt buộc:** `data` = chuỗi JSON. Có thể là `"{}"` nếu chỉ upload ảnh, không đổi field khác.
  - **File:** nhiều part cùng tên `notesImages`, mỗi part một file ảnh.

Backend sẽ:
- Upload từng file lên storage.
- Lấy danh sách URL hiện có của order trong DB.
- Gán `notesImages` = **danh sách cũ + danh sách URL mới**.

**Ví dụ (pseudo):**

```
PUT /api/orders/1234
Content-Type: multipart/form-data; boundary=----...

------...
Content-Disposition: form-data; name="data"

{}
------...
Content-Disposition: form-data; name="notesImages"; filename="photo1.jpg"
Content-Type: image/jpeg

<binary>
------...
Content-Disposition: form-data; name="notesImages"; filename="photo2.jpg"
Content-Type: image/jpeg

<binary>
------...--
```

**Mobile (ví dụ Swift / Kotlin):**

- Tạo multipart request.
- Thêm part `data` với value là chuỗi `"{}"` (hoặc JSON đầy đủ nếu cập nhật thêm field khác).
- Thêm từng file ảnh với **field name** là `notesImages` (nhiều part cùng tên).

---

## 3. Vừa xóa vừa thêm ảnh

Backend **không** hỗ trợ trong một request vừa “thay mảng” vừa “upload file”. Cần **2 request**:

1. **Request 1 – áp dụng xóa (cập nhật mảng):**  
   `PUT /api/orders/:orderId` với **JSON**:
   - `notesImages`: mảng URL **sau khi xóa** (không có ảnh bị xóa).
2. **Request 2 – thêm ảnh mới (nếu có):**  
   `PUT /api/orders/:orderId` với **FormData**:
   - `data`: `"{}"` (hoặc JSON khác nếu cần).
   - Các file mới: field name `notesImages`, nhiều part.

Thứ tự: gọi request 1 xong (thành công) rồi mới gọi request 2 nếu có file mới.

---

## 4. Giới hạn số ảnh

- Ở **UI** (web) đang giới hạn tối đa **3 ảnh** cho notes images.
- API không ép giới hạn; mobile nên áp dụng cùng rule (tối đa 3) để đồng bộ với web.

---

## 5. Tóm tắt nhanh cho mobile

| Hành động              | Content-Type        | Body / Form                    |
|------------------------|--------------------|---------------------------------|
| Chỉ xóa ảnh            | `application/json` | `{ "notesImages": ["url1", ...] }` |
| Chỉ thêm ảnh           | `multipart/form-data` | `data` = `"{}"`, files với key `notesImages` |
| Vừa xóa vừa thêm       | Gọi 2 lần: 1) JSON (mảng sau xóa), 2) FormData (file mới) nếu cần |

---

## 6. Response & auth

- **Auth:** Gửi kèm header `Authorization: Bearer <token>` (cùng cách các API order khác).
- **Success:** HTTP 200, body theo chuẩn `ResponseBuilder.success`, có `data` là order đã cập nhật (gồm `notesImages` mới).
- **Lỗi:** 4xx/5xx, body theo `ResponseBuilder.error` (code + message).

File này mô tả đúng cách dùng API khi tạo và edit note image (thêm / xóa) từ mobile.
