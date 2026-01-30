# 🆓 Free AI Hosting Guide cho Blog System

## 🎯 Mục Tiêu

Host AI service **hoàn toàn miễn phí** để sinh bài viết cho blog system.

---

## 🏆 Best FREE Options (Ranked)

### **1. Hugging Face Inference API** ⭐⭐⭐⭐⭐ (Recommended)

**Why Best:**
- ✅ **1000 requests/month FREE** (đủ cho ~30-50 bài viết/tháng)
- ✅ **No credit card required**
- ✅ High quality models (Mistral, Llama 2)
- ✅ Easy API integration
- ✅ Pay-per-use nếu vượt free tier ($0.0002 per 1K tokens)

**Setup:**
```bash
# 1. Sign up tại https://huggingface.co (FREE)
# 2. Tạo API token: https://huggingface.co/settings/tokens
# 3. Add to Railway env: HUGGINGFACE_API_KEY=your_token
```

**Usage:**
```typescript
const response = await fetch(
  'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
  {
    headers: { 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
    method: 'POST',
    body: JSON.stringify({ inputs: prompt })
  }
);
```

**Cost:** $0/month (up to 1000 requests)

---

### **2. Oracle Cloud Always Free** ⭐⭐⭐⭐⭐ (Best for Self-hosted)

**Why Best:**
- ✅ **FREE forever** (không expire)
- ✅ 2 VMs với 1GB RAM mỗi VM
- ✅ 200GB storage
- ✅ 10TB bandwidth/month
- ✅ Can run Ollama với lightweight models

**Limitations:**
- ⚠️ Only 1GB RAM per VM (chỉ chạy được models nhỏ: Phi-2, TinyLlama)
- ⚠️ Need credit card (nhưng không charge nếu dùng free tier)

**Setup:**
```bash
# 1. Sign up: https://www.oracle.com/cloud/free/
# 2. Create Always Free VM (Ampere A1: 1GB RAM)
# 3. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 4. Pull lightweight model
ollama pull phi-2  # ~2GB, works với swap

# 5. Expose via HTTP (use nginx reverse proxy)
```

**Models that work on 1GB RAM:**
- **Phi-2 (2.7B)**: ~3GB với swap - Good quality
- **TinyLlama (1.1B)**: ~2GB - Acceptable quality
- **Gemma 2B**: ~3GB với swap - Good quality

**Cost:** $0/month (forever)

---

### **3. Modal.com** ⭐⭐⭐⭐

**Why Good:**
- ✅ **FREE: $30 credit/month** (~150-300 requests)
- ✅ Run Ollama models
- ✅ Pay-per-use after free tier
- ✅ Good for production

**Setup:**
```bash
# 1. Sign up: https://modal.com
# 2. Get $30 free credit
# 3. Deploy Ollama service
```

**Cost:** $0/month (up to $30 credit)

---

### **4. Google Colab (FREE GPU)** ⭐⭐⭐

**Why Good:**
- ✅ **FREE GPU** (T4, A100)
- ✅ Run Ollama hoặc Python models
- ✅ 12-24 hours runtime per session

**Limitations:**
- ⚠️ Cần restart mỗi session
- ⚠️ Not ideal cho production (unreliable)
- ⚠️ Need to keep notebook running

**Use Case:** Testing, development, occasional use

**Cost:** $0/month

---

### **5. Fly.io** ⭐⭐⭐⭐

**Why Good:**
- ✅ **FREE: 3 shared VMs**
- ✅ 160GB bandwidth/month
- ✅ Can run Ollama
- ✅ Good for production

**Limitations:**
- ⚠️ Limited RAM (256MB-1GB per VM)
- ⚠️ Only lightweight models

**Cost:** $0/month (free tier)

---

### **6. Render** ⭐⭐⭐

**Why Good:**
- ✅ **FREE: 750 hours/month**
- ✅ Can run Ollama

**Limitations:**
- ⚠️ Spins down after inactivity (cold starts)
- ⚠️ Limited RAM
- ⚠️ Not ideal for production

**Cost:** $0/month

---

## 🏗️ Recommended FREE Architecture

### **Multi-tier Fallback Strategy** (100% FREE)

```
┌─────────────────────────────────────────────────────┐
│         Railway API (FREE - existing)              │
│  POST /api/ai/generate-post                        │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Try HuggingFace API  │ ← FREE: 1000 req/month
        │  (Primary)            │
        └───────────────────────┘
                    │ (if fails/quota exceeded)
                    ▼
        ┌───────────────────────┐
        │  Oracle Cloud Ollama  │ ← FREE: Forever
        │  (Fallback 1)         │   (Phi-2 model)
        └───────────────────────┘
                    │ (if fails)
                    ▼
        ┌───────────────────────┐
        │  Modal.com            │ ← FREE: $30/month
        │  (Fallback 2)         │
        └───────────────────────┘
```

**Total Cost: $0/month** cho production! 🎉

---

## 📋 Implementation Guide

### **Step 1: Setup HuggingFace (Primary)**

```typescript
// packages/ai-service/src/llm/huggingface-client.ts
export class HuggingFaceClient {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  async generate(prompt: string, model = 'mistralai/Mistral-7B-Instruct-v0.2'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data[0]?.generated_text || data.generated_text || '';
  }
}
```

### **Step 2: Setup Oracle Cloud Ollama (Fallback)**

```bash
# On Oracle Cloud VM
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull lightweight model
ollama pull phi-2

# 3. Install nginx for reverse proxy
sudo apt install nginx

# 4. Configure nginx
sudo nano /etc/nginx/sites-available/ollama
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name your-oracle-ip;

    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```typescript
// packages/ai-service/src/llm/ollama-client.ts
export class OllamaClient {
  private baseUrl: string; // Oracle Cloud VM URL

  async generate(prompt: string, model = 'phi-2'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    const data = await response.json();
    return data.response;
  }
}
```

### **Step 3: Implement Fallback Logic**

```typescript
// packages/ai-service/src/llm/ai-client.ts
export class AIClient {
  private huggingface: HuggingFaceClient;
  private ollama: OllamaClient;
  private modal: ModalClient;

  async generate(prompt: string): Promise<string> {
    // Try HuggingFace first (FREE tier)
    try {
      return await this.huggingface.generate(prompt);
    } catch (error) {
      console.warn('HuggingFace failed, trying Ollama:', error);
      
      // Fallback to Oracle Cloud Ollama (FREE)
      try {
        return await this.ollama.generate(prompt);
      } catch (error2) {
        console.warn('Ollama failed, trying Modal:', error2);
        
        // Last resort: Modal.com (FREE tier)
        return await this.modal.generate(prompt);
      }
    }
  }
}
```

---

## 💰 Cost Comparison

| Solution | Monthly Cost | Requests/Month | Quality |
|----------|--------------|----------------|---------|
| **HuggingFace (FREE)** | **$0** | 1000 | ⭐⭐⭐⭐⭐ |
| **Oracle Cloud (FREE)** | **$0** | Unlimited | ⭐⭐⭐ |
| **Modal.com (FREE)** | **$0** | ~150-300 | ⭐⭐⭐⭐ |
| **Hybrid (All FREE)** | **$0** | **~1500+** | ⭐⭐⭐⭐ |

**Winner: Hybrid FREE solution** - Best of all worlds! 🏆

---

## 🚀 Quick Start (5 minutes)

### **Option A: HuggingFace Only (Simplest)**

```bash
# 1. Get HuggingFace token
# Visit: https://huggingface.co/settings/tokens

# 2. Add to Railway
railway variables set HUGGINGFACE_API_KEY=your_token

# 3. Done! ✅
```

### **Option B: Full FREE Stack (Recommended)**

```bash
# 1. Setup HuggingFace (5 min)
# - Sign up, get token, add to Railway

# 2. Setup Oracle Cloud (30 min)
# - Sign up Oracle Cloud
# - Create Always Free VM
# - Install Ollama + Phi-2 model
# - Configure nginx
# - Add OLLAMA_URL to Railway

# 3. Done! ✅
# Now you have 1000+ free requests/month!
```

---

## ✅ Checklist

- [ ] Sign up HuggingFace (FREE)
- [ ] Get API token
- [ ] Add to Railway env vars
- [ ] Test API call
- [ ] (Optional) Setup Oracle Cloud Ollama fallback
- [ ] (Optional) Setup Modal.com fallback
- [ ] Implement fallback logic
- [ ] Test all fallbacks

---

## 🎯 Recommendation

**For Production:**
1. **Start with HuggingFace** (FREE, easiest)
2. **Add Oracle Cloud Ollama** as fallback (FREE, unlimited)
3. **Add Modal.com** as last resort (FREE tier)

**Total: $0/month, ~1500+ requests/month, production-ready!** 🎉

---

## 📚 Resources

- [HuggingFace Inference API](https://huggingface.co/docs/api-inference)
- [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/)
- [Modal.com Free Tier](https://modal.com/pricing)
- [Fly.io Free Tier](https://fly.io/docs/about/pricing/)
