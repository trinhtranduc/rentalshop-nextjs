# Intent #1672: connector SEO khai báo đủ ngôn ngữ

Hub viết bài theo từng ngôn ngữ (`seo-agent-hub/docs/connector-update-language.md`) và chỉ viết cho ngôn ngữ có trong `GET /rules` → `locales`. Connector AnyRent trả `["vi"]` nên Hub chỉ viết tiếng Việt. Muốn: Hub viết được mọi ngôn ngữ công khai của AnyRent và bài vào đúng `locale`.
Ràng buộc: không đổi schema, không đổi route nào app cài sẵn gọi.
