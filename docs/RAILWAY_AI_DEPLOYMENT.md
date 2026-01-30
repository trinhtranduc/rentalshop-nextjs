# 🚂 Railway AI Deployment Guide

## ⚠️ Railway Limitations cho AI Workloads

### Memory & Resource Constraints

| Plan | RAM Limit | CPU | Cost | Ollama 7B Needs |
|------|-----------|-----|------|-----------------|
| **Hobby** | 512MB-2GB | Limited | $5/mo | ❌ Not enough |
| **Pro** | 4GB-8GB | Better | $20/mo | ⚠️ Borderline |
| **Pro + Extra RAM** | 8GB-16GB | Better | $30-50/mo | ✅ Possible but expensive |

**Ollama Model Memory Requirements:**
- **Llama 3 8B**: ~6-10GB RAM
- **Mistral 7B**: ~4-8GB RAM
- **Phi-2 2.7B**: ~3GB RAM (smallest usable)
- **TinyLlama 1.1B**: ~2GB RAM (low quality)

### ❌ Why Railway is NOT ideal for Ollama:

1. **Memory Limits**: Even Pro plan barely fits 7B models
2. **Cost**: Extra RAM costs add up quickly ($30-50/month)
3. **Performance**: CPU limits make inference slow
4. **Cold Starts**: Models need to load into memory (slow)

---

## ✅ Recommended Solutions for Railway

### **Solution 1: External AI Services** (Best for Railway) ⭐⭐⭐

#### A. Hugging Face Inference API

**Pros:**
- ✅ Free tier: 1000 requests/month
- ✅ Paid: $0.0002 per 1K tokens (~$0.01 per article)
- ✅ No infrastructure needed
- ✅ High quality models (Mistral, Llama 2)
- ✅ Auto-scaling

**Setup:**
```typescript
// packages/ai-service/src/llm/huggingface-client.ts
import axios from 'axios';

export class HuggingFaceClient {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  async generate(prompt: string, model = 'mistralai/Mistral-7B-Instruct-v0.2'): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/${model}`,
      { inputs: prompt },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data[0].generated_text;
  }
}
```

**Cost:** ~$0.01-0.05 per article (very affordable)

#### B. Together.ai

**Pros:**
- ✅ Open source models (Llama 2, Mistral, CodeLlama)
- ✅ Pay-per-use: $0.0002 per 1K tokens
- ✅ Fast inference
- ✅ No setup needed

**Setup:**
```typescript
// packages/ai-service/src/llm/together-client.ts
export class TogetherClient {
  private apiKey: string;
  private baseUrl = 'https://api.together.xyz/v1/completions';

  async generate(prompt: string): Promise<string> {
    const response = await axios.post(
      this.baseUrl,
      {
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        prompt,
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.data.choices[0].text;
  }
}
```

#### C. Replicate

**Pros:**
- ✅ Many open source models
- ✅ Pay-per-use
- ✅ Easy API

---

### **Solution 2: Separate Ollama Service** (If you need self-hosted) ⭐⭐

**Architecture:**
```
Railway (API) → HTTP Request → Self-hosted Ollama Server
```

**Self-hosted Options:**

#### A. VPS (DigitalOcean, Hetzner, Vultr)
- **Cost**: $6-12/month
- **RAM**: 4-8GB
- **Setup**: Install Ollama on VPS, expose via HTTP
- **Pros**: Full control, no per-request costs
- **Cons**: Need to manage server

#### B. RunPod.io (GPU instances)
- **Cost**: Pay-per-use (~$0.20/hour for GPU)
- **Pros**: GPU acceleration, fast inference
- **Cons**: More expensive for continuous use

#### C. Vast.ai (Cheap GPU rentals)
- **Cost**: Very cheap (~$0.10/hour)
- **Pros**: Extremely affordable
- **Cons**: Less reliable, need to manage

**Implementation:**
```typescript
// packages/ai-service/src/llm/ollama-client.ts
export class OllamaClient {
  private baseUrl: string; // Your self-hosted Ollama URL

  async generate(prompt: string, model = 'llama3:8b'): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model,
      prompt,
      stream: false,
    });

    return response.data.response;
  }
}
```

---

### **Solution 3: Lightweight Models on Railway** (Last resort) ⭐

**Only if you MUST run on Railway:**

Use smaller models that fit in Railway Pro plan:
- **Phi-2 (2.7B)**: ~3GB RAM - Acceptable quality
- **Gemma 2B**: ~3GB RAM - Good quality
- **TinyLlama (1.1B)**: ~2GB RAM - Low quality

**⚠️ Trade-offs:**
- Lower quality content
- Still need Pro plan ($20/month)
- Slower inference

---

## 🏗️ Recommended Architecture

### **Hybrid Approach** (Best for Railway)

```
┌─────────────────────────────────────────────────────┐
│         Railway (Next.js API Service)               │
│  ┌──────────────────────────────────────────────┐   │
│  │  POST /api/ai/generate-post                 │   │
│  │  → Calls external AI service (HuggingFace)  │   │
│  │  → Returns generated content                │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  POST /api/ai/seo-score                       │   │
│  │  → Runs locally (Node.js, lightweight)       │   │
│  │  → No external dependency                     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│    External AI Service (HuggingFace/Together.ai)    │
│  - No infrastructure on Railway                     │
│  - Pay-per-use ($0.01-0.05 per article)            │
│  - High quality models                             │
│  - Auto-scaling                                     │
└─────────────────────────────────────────────────────┘
```

---

## 💰 Cost Comparison

| Solution | Setup Cost | Per Article | Monthly (100 articles) |
|----------|------------|-------------|------------------------|
| **HuggingFace API** | $0 | $0.01-0.05 | **$1-5** ✅ |
| **Together.ai** | $0 | $0.01-0.03 | **$1-3** ✅ |
| **Railway + Ollama** | $20-50 | $0 | **$20-50** ❌ |
| **VPS + Ollama** | $6-12 | $0 | **$6-12** ⚠️ |
| **RunPod GPU** | $0 | $0.20-0.50 | **$20-50** ❌ |

**Winner: External AI Services** (HuggingFace/Together.ai)
- ✅ Lowest cost
- ✅ No infrastructure management
- ✅ Best quality
- ✅ Auto-scaling

---

## 🚀 Implementation Steps

### Step 1: Choose AI Provider

**Recommended: HuggingFace Inference API**
1. Sign up at https://huggingface.co
2. Get API token from https://huggingface.co/settings/tokens
3. Add to Railway environment variables: `HUGGINGFACE_API_KEY`

### Step 2: Create AI Service Package

```bash
# Create package
mkdir -p packages/ai-service/src/llm
mkdir -p packages/ai-service/src/seo

# Install dependencies
cd packages/ai-service
yarn add axios zod
yarn add -D @types/node typescript
```

### Step 3: Build AI Client

```typescript
// packages/ai-service/src/llm/ai-client.ts
import { HuggingFaceClient } from './huggingface-client';
import { TogetherClient } from './together-client';

export class AIClient {
  private client: HuggingFaceClient | TogetherClient;

  constructor(provider: 'huggingface' | 'together' = 'huggingface') {
    if (provider === 'huggingface') {
      this.client = new HuggingFaceClient(process.env.HUGGINGFACE_API_KEY!);
    } else {
      this.client = new TogetherClient(process.env.TOGETHER_API_KEY!);
    }
  }

  async generateBlogPost(prompt: string): Promise<string> {
    return this.client.generate(prompt);
  }
}
```

### Step 4: Create API Route

```typescript
// apps/api/app/api/ai/generate-post/route.ts
import { AIClient } from '@rentalshop/ai-service';

export const POST = withAuthRoles(['ADMIN'])(async (request) => {
  const { keyword, tone, wordCount } = await request.json();
  
  const aiClient = new AIClient('huggingface');
  const content = await aiClient.generateBlogPost(
    `Write a comprehensive blog post about: ${keyword}`
  );
  
  return NextResponse.json({ success: true, data: { content } });
});
```

### Step 5: Deploy to Railway

```bash
# Add environment variable
railway variables set HUGGINGFACE_API_KEY=your_token_here

# Deploy
railway up
```

---

## ✅ Final Recommendation

**For Railway Deployment:**

1. ✅ **Use External AI Service** (HuggingFace/Together.ai)
   - No infrastructure on Railway
   - Low cost ($1-5/month for 100 articles)
   - High quality
   - Auto-scaling

2. ✅ **Run SEO Analysis on Railway**
   - Lightweight (Node.js)
   - No external dependency
   - Fast response

3. ⚠️ **Avoid running Ollama on Railway**
   - Too expensive
   - Memory constraints
   - Performance issues

**This approach gives you:**
- ✅ Best cost/performance ratio
- ✅ No infrastructure management
- ✅ High quality AI content
- ✅ Scales automatically
- ✅ Works perfectly on Railway
