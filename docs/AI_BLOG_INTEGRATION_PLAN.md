# 📋 Plan Tích Hợp AI cho Hệ Thống Blog

## 🎯 Mục Tiêu

Tích hợp AI để:
1. **Sinh bài viết tự động** theo prompt từ admin
2. **Tối ưu SEO** tự động (meta tags, keywords, structure)
3. **Đánh giá điểm số SEO** (0-100) với recommendations

---

## 🏗️ Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard (Next.js)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AI Content Generator Form                           │   │
│  │  - Prompt input                                       │   │
│  │  - Keyword, tone, length, category                   │   │
│  │  - Generate button                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Generated Content Preview                           │   │
│  │  - Title, content, meta description                  │   │
│  │  - SEO Score (real-time)                             │   │
│  │  - SEO Recommendations                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Next.js API Routes)                   │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ /api/ai/generate │  │ /api/ai/seo-score │                │
│  │                  │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         AI Service Layer (Python/Node.js)                   │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  LLM Service     │  │  SEO Analyzer     │                │
│  │  (Ollama/LocalAI)│  │  (Python libs)     │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Công Nghệ Open Source Đề Xuất

### 1. **LLM Engine (Content Generation)**

#### ⚠️ **Railway Deployment Considerations**

**Railway Memory Limits:**
- Hobby Plan: 512MB - 2GB RAM
- Pro Plan: 4GB - 8GB RAM
- Ollama 7B model cần: **~4-8GB RAM**
- Ollama 8B model cần: **~6-10GB RAM**

**Kết luận:** Railway **KHÔNG phù hợp** để chạy Ollama trực tiếp vì:
- ❌ Memory limits quá thấp cho LLM models
- ❌ Cost cao nếu upgrade plan (Pro $20/month + extra RAM)
- ❌ Performance chậm do CPU limits

#### ✅ **Recommended Solutions for Railway**

#### Option 1: Free AI Services (Best for Budget) ⭐⭐⭐⭐⭐
**Hoàn toàn miễn phí, không cần infrastructure:**

**A. Hugging Face Inference API** (FREE tier - Recommended) ⭐⭐⭐⭐⭐
```typescript
// ✅ FREE: 1000 requests/month (đủ cho ~30-50 bài viết/tháng)
// ✅ No credit card required
// ✅ Models: Mistral, Llama 2, CodeLlama
// ✅ Paid: $0.0002 per 1K tokens (chỉ trả khi vượt free tier)

const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
  headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
  method: 'POST',
  body: JSON.stringify({ inputs: prompt })
});
```

**Setup:**
1. Sign up tại https://huggingface.co (FREE)
2. Tạo API token tại https://huggingface.co/settings/tokens
3. Add token vào Railway env: `HUGGINGFACE_API_KEY`

**B. Google Colab (FREE GPU)** ⭐⭐⭐⭐
- ✅ FREE GPU access (T4, A100)
- ✅ Run Ollama hoặc Python models
- ✅ 12-24 hours runtime per session
- ⚠️ Cần restart mỗi session
- ⚠️ Not ideal cho production

**C. Kaggle Notebooks (FREE GPU)** ⭐⭐⭐
- ✅ FREE GPU (P100, T4)
- ✅ 30 hours/week GPU time
- ⚠️ Limited for production use

**D. Modal.com (FREE tier)** ⭐⭐⭐⭐
- ✅ FREE: $30 credit/month
- ✅ Run Ollama models
- ✅ Pay-per-use after free tier
- ✅ Good for production

**E. Replicate (FREE tier)** ⭐⭐⭐
- ✅ FREE: $5 credit/month (~50-100 requests)
- ✅ Pay-per-use after
- ✅ Easy API

#### Option 2: Self-hosted FREE (Best for Long-term) ⭐⭐⭐⭐
**Host Ollama trên free VPS/cloud:**

**A. Oracle Cloud Always Free** ⭐⭐⭐⭐⭐ (BEST FREE OPTION)
- ✅ **FREE forever**: 2 VMs với 1GB RAM mỗi VM
- ✅ **FREE**: 200GB storage
- ✅ **FREE**: 10TB bandwidth/month
- ✅ Can run Ollama với lightweight models (Phi-2, TinyLlama)
- ✅ No credit card required (some regions)
- ⚠️ Limited RAM (1GB) - chỉ chạy được models nhỏ

**Setup:**
```bash
# Create free VM on Oracle Cloud
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull lightweight model
ollama pull phi-2  # ~2GB, fits in 1GB RAM với swap
```

**B. Google Cloud Free Tier** ⭐⭐⭐
- ✅ FREE: $300 credit for 90 days
- ✅ FREE: f1-micro instance (limited)
- ⚠️ Credit expires after 90 days

**C. AWS Free Tier** ⭐⭐⭐
- ✅ FREE: t2.micro for 12 months
- ⚠️ Expires after 12 months

**D. Azure Free Tier** ⭐⭐⭐
- ✅ FREE: $200 credit for 30 days
- ⚠️ Credit expires

**E. Fly.io (FREE tier)** ⭐⭐⭐⭐
- ✅ FREE: 3 shared VMs
- ✅ 160GB bandwidth/month
- ✅ Can run Ollama
- ⚠️ Limited resources

**F. Render (FREE tier)** ⭐⭐⭐
- ✅ FREE: 750 hours/month
- ⚠️ Spins down after inactivity
- ⚠️ Limited RAM

#### Option 3: Hybrid Free Solution (Recommended) ⭐⭐⭐⭐⭐
**Kết hợp nhiều free services:**

```
Primary: HuggingFace API (FREE 1000 requests/month)
  ↓ (nếu hết free tier)
Fallback: Oracle Cloud Ollama (FREE forever)
  ↓ (nếu cần quality cao)
Secondary: Modal.com (FREE $30/month)
```

**Cost: $0/month** cho ~50-100 bài viết/tháng! 🎉

#### Option 4: Paid Services (If free tier not enough) ⭐⭐
**Khi cần nhiều requests hơn free tier:**

- **Together.ai**: $0.0002 per 1K tokens (~$0.01 per article)
- **VPS (DigitalOcean, Hetzner)**: $6-12/month, 4-8GB RAM
- **RunPod.io**: GPU instances, pay-per-use (~$0.20/hour)
- **Vast.ai**: Cheap GPU rentals (~$0.10/hour)

#### Option 3: Lightweight Models (Nếu phải chạy trên Railway) ⭐
**Sử dụng models nhỏ hơn:**
- **TinyLlama (1.1B)**: ~2GB RAM - Quality thấp
- **Phi-2 (2.7B)**: ~3GB RAM - Acceptable quality
- **Gemma 2B**: ~3GB RAM - Good quality

**⚠️ Trade-off:** Quality thấp hơn, nhưng có thể chạy trên Railway Pro plan

#### Option 4: Ollama Cloud (Nếu có) ⭐⭐⭐
**Ollama đang phát triển cloud service - chờ release**

---

### **Recommendation cho Railway Deployment (FREE):**

**Best FREE Approach: Multi-tier Fallback** ⭐⭐⭐⭐⭐
1. **Primary**: HuggingFace API (FREE 1000 requests/month)
2. **Fallback 1**: Oracle Cloud Ollama (FREE forever, lightweight models)
3. **Fallback 2**: Modal.com (FREE $30/month credit)
4. **SEO Analysis**: Chạy trên Railway (Node.js, không cần LLM) - FREE

**Total Cost: $0/month** cho production use! 🎉

**Implementation:**
```typescript
// packages/ai-service/src/llm/ai-client.ts
export class AIClient {
  async generate(prompt: string): Promise<string> {
    try {
      // Try HuggingFace first (FREE)
      return await this.generateWithHuggingFace(prompt);
    } catch (error) {
      // Fallback to Oracle Cloud Ollama (FREE)
      try {
        return await this.generateWithOllama(prompt, 'oracle-cloud-url');
      } catch (error2) {
        // Last resort: Modal.com (FREE tier)
        return await this.generateWithModal(prompt);
      }
    }
  }
}
```

---

## 🚂 Railway Deployment Strategy

### **Railway Limitations cho AI Workloads**

| Resource | Hobby Plan | Pro Plan | Ollama 7B Needs |
|----------|------------|----------|-----------------|
| **RAM** | 512MB-2GB | 4GB-8GB | **~4-8GB** |
| **CPU** | Limited | Better | CPU-intensive |
| **Cost** | $5/month | $20+/month | + Extra RAM costs |

**Verdict:** Railway **KHÔNG phù hợp** để chạy Ollama trực tiếp vì:
- ❌ Memory limits quá thấp cho LLM models
- ❌ Cost cao nếu upgrade (Pro + extra RAM = $30-50/month)
- ❌ Performance chậm do CPU limits

### **✅ Recommended Architecture cho Railway**

```
┌─────────────────────────────────────────────────────────┐
│              Railway (Next.js API)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/ai/generate-post                            │   │
│  │  → Calls external AI service                      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/ai/seo-score                                │   │
│  │  → Runs locally (Node.js, lightweight)           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│      External AI Service (HuggingFace/Together.ai)       │
│  - No infrastructure needed                              │
│  - Pay-per-use ($0.01-0.05 per article)                 │
│  - High quality models                                  │
└─────────────────────────────────────────────────────────┘
```

### **Best Practice: Hybrid Approach**

1. **Content Generation**: External service (HuggingFace/Together.ai)
   - ✅ No infrastructure
   - ✅ High quality
   - ✅ Pay-per-use (cost-effective)
   - ✅ Scales automatically

2. **SEO Analysis**: Run on Railway (Node.js)
   - ✅ Lightweight (no LLM needed)
   - ✅ Fast response
   - ✅ No external dependency

3. **Fallback**: Optional lightweight model
   - ⚠️ Only if external service down
   - ⚠️ Lower quality but functional

### 2. **SEO Analysis Tools**

#### Python Libraries:
- **`readability`** - Đánh giá độ dễ đọc
- **`textstat`** - Flesch reading ease, word count
- **`nltk`** - Keyword extraction, frequency analysis
- **`spacy`** - NLP analysis, entity recognition
- **Custom SEO scorer** - Tự build dựa trên Yoast SEO logic

#### Node.js Libraries:
- **`natural`** - NLP utilities
- **`text-statistics`** - Readability metrics
- **Custom implementation** - SEO scoring algorithm

### 3. **Integration Framework**

- **LangChain** (Python) - Chain LLM calls, prompt templates
- **LangChain.js** (Node.js) - Tương tự cho Node.js
- **Simple HTTP client** - Nếu dùng Ollama API trực tiếp

---

## 📦 Cấu Trúc Package Mới

```
packages/
├── ai-service/                    # NEW: AI Service Package
│   ├── src/
│   │   ├── llm/
│   │   │   ├── ollama-client.ts   # Ollama API client
│   │   │   ├── prompt-templates.ts # SEO-optimized prompts
│   │   │   └── content-generator.ts
│   │   ├── seo/
│   │   │   ├── analyzer.ts        # SEO analysis engine
│   │   │   ├── scorer.ts          # SEO scoring (0-100)
│   │   │   ├── keyword-analyzer.ts
│   │   │   └── recommendations.ts
│   │   └── index.ts
│   └── package.json
```

---

## 🚀 Implementation Plan

### **Phase 1: Setup AI Infrastructure** (Week 1)

#### 1.1 Choose AI Service Provider

**Option A: Hugging Face Inference API** (Recommended for Railway) ⭐
```bash
# Get API token from https://huggingface.co/settings/tokens
# Free tier: 1000 requests/month
# Paid: $0.0002 per 1K tokens
```

**Option B: Together.ai** (Best quality/price)
```bash
# Sign up at https://together.ai
# Models: Llama 2, Mistral, CodeLlama
# Cost: ~$0.01 per article
```

**Option C: Self-hosted Ollama** (If you have separate server)
```bash
# Install on VPS/DigitalOcean ($6-12/month)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3:8b
```

#### 1.2 Create AI Service Package
- [ ] Tạo `packages/ai-service/` package
- [ ] Setup TypeScript config
- [ ] Install dependencies: `axios`, `zod` (validation)

#### 1.3 Build AI Client (External Service)
```typescript
// packages/ai-service/src/llm/ai-client.ts
export class AIClient {
  private provider: 'huggingface' | 'together' | 'ollama';
  private apiKey: string;
  
  async generate(prompt: string): Promise<string> {
    if (this.provider === 'huggingface') {
      return this.generateWithHuggingFace(prompt);
    } else if (this.provider === 'together') {
      return this.generateWithTogether(prompt);
    } else {
      return this.generateWithOllama(prompt);
    }
  }
  
  private async generateWithHuggingFace(prompt: string): Promise<string> {
    // Call HuggingFace Inference API
  }
  
  private async generateWithTogether(prompt: string): Promise<string> {
    // Call Together.ai API
  }
}
```

---

### **Phase 2: Content Generation** (Week 1-2)

#### 2.1 Create Prompt Templates
```typescript
// SEO-optimized prompt template
const BLOG_POST_PROMPT = `
Write a comprehensive, SEO-optimized blog post with the following requirements:

Topic: {keyword}
Tone: {tone}
Target Audience: {audience}
Word Count: {wordCount}

Requirements:
- Include H1, H2, H3 headings
- Use keyword naturally throughout
- Write engaging introduction and conclusion
- Include actionable tips/examples
- Optimize for readability

Format output as HTML with proper heading tags.
`;
```

#### 2.2 Build Content Generator
```typescript
// packages/ai-service/src/llm/content-generator.ts
export interface GeneratePostInput {
  keyword: string;
  tone?: 'professional' | 'casual' | 'friendly';
  wordCount?: number;
  category?: string;
  includeExamples?: boolean;
}

export interface GeneratedPost {
  title: string;
  content: string; // HTML
  excerpt: string;
  metaDescription: string;
  suggestedSlug: string;
  keywords: string[];
}
```

#### 2.3 Create API Route
```typescript
// apps/api/app/api/ai/generate-post/route.ts
export const POST = withAuthRoles(['ADMIN'])(async (request) => {
  const body = await request.json();
  const { keyword, tone, wordCount } = body;
  
  const generated = await generateBlogPost({
    keyword,
    tone,
    wordCount,
  });
  
  return NextResponse.json(
    ResponseBuilder.success('POST_GENERATED', generated)
  );
});
```

---

### **Phase 3: SEO Analysis & Scoring** (Week 2-3)

#### 3.1 Build SEO Analyzer
```typescript
// packages/ai-service/src/seo/analyzer.ts
export interface SEOAnalysis {
  score: number; // 0-100
  keywordDensity: number;
  wordCount: number;
  readabilityScore: number;
  headingStructure: {
    hasH1: boolean;
    h2Count: number;
    h3Count: number;
  };
  metaTags: {
    titleLength: number;
    descriptionLength: number;
    hasKeywords: boolean;
  };
  issues: SEOIssue[];
  recommendations: string[];
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: string;
}
```

#### 3.2 Implement SEO Scorer
```typescript
// packages/ai-service/src/seo/scorer.ts
export function calculateSEOScore(
  content: string,
  keyword: string,
  metaTitle: string,
  metaDescription: string
): SEOAnalysis {
  // Calculate scores:
  // - Keyword density (10 points)
  // - Content length (15 points)
  // - Heading structure (15 points)
  // - Meta tags (20 points)
  // - Readability (20 points)
  // - Internal links (10 points)
  // - Image alt texts (10 points)
  
  return {
    score: totalScore,
    // ... other metrics
  };
}
```

#### 3.3 Create SEO API Route
```typescript
// apps/api/app/api/ai/seo-score/route.ts
export const POST = withAuthRoles(['ADMIN'])(async (request) => {
  const { content, keyword, title, metaDescription } = await request.json();
  
  const analysis = calculateSEOScore(content, keyword, title, metaDescription);
  
  return NextResponse.json(
    ResponseBuilder.success('SEO_ANALYSIS_COMPLETE', analysis)
  );
});
```

---

### **Phase 4: UI Integration** (Week 3-4)

#### 4.1 Create AI Generator Component
```typescript
// packages/ui/src/components/features/Posts/AIContentGenerator.tsx
export function AIContentGenerator({
  onGenerate,
  onContentGenerated,
}: AIContentGeneratorProps) {
  // Form với:
  // - Keyword input
  // - Tone selector
  // - Word count slider
  // - Category selector
  // - Generate button
}
```

#### 4.2 Create SEO Score Display
```typescript
// packages/ui/src/components/features/Posts/SEOScoreCard.tsx
export function SEOScoreCard({ score, analysis }: SEOScoreCardProps) {
  // Hiển thị:
  // - Overall score (0-100) với color coding
  // - Breakdown by category
  // - Issues list
  // - Recommendations
}
```

#### 4.3 Integrate vào PostForm
```typescript
// packages/ui/src/components/forms/PostForm.tsx
// Thêm:
// - "Generate with AI" button
// - AI generator dialog
// - SEO score sidebar (real-time)
// - Auto-fill form từ generated content
```

#### 4.4 Create Admin Page
```typescript
// apps/admin/app/posts/ai-generator/page.tsx
// Standalone page cho AI content generation
```

---

### **Phase 5: Advanced Features** (Week 4-5)

#### 5.1 Content Refinement
- [ ] "Improve SEO" button - Regenerate với SEO focus
- [ ] "Expand section" - Generate thêm content cho section cụ thể
- [ ] "Simplify" - Make content easier to read

#### 5.2 SEO Recommendations Engine
```typescript
// Auto-suggest improvements:
// - "Add more H2 headings"
// - "Increase keyword density to 1.5%"
// - "Meta description should be 150-160 characters"
```

#### 5.3 Caching & Optimization
- [ ] Cache generated content (avoid re-generation)
- [ ] Rate limiting
- [ ] Background job processing (cho long articles)

---

## 📊 SEO Scoring Algorithm

### Scoring Breakdown (Total: 100 points)

| Category | Points | Criteria |
|----------|--------|----------|
| **Keyword Optimization** | 20 | Density (1-2%), placement (title, H1, first paragraph) |
| **Content Quality** | 20 | Word count (min 300), readability (Flesch 60+), uniqueness |
| **Heading Structure** | 15 | H1 present, H2/H3 hierarchy, keyword in headings |
| **Meta Tags** | 20 | Title length (50-60 chars), description (150-160 chars), keywords |
| **Internal Linking** | 10 | At least 2-3 internal links |
| **Images** | 10 | Alt text present, relevant images |
| **Mobile Optimization** | 5 | Content readable on mobile |

### Implementation Example:
```typescript
function calculateKeywordScore(content: string, keyword: string): number {
  const keywordCount = (content.match(new RegExp(keyword, 'gi')) || []).length;
  const wordCount = content.split(/\s+/).length;
  const density = (keywordCount / wordCount) * 100;
  
  // Ideal density: 1-2%
  if (density >= 1 && density <= 2) return 20;
  if (density >= 0.5 && density < 1) return 15;
  if (density > 2 && density <= 3) return 10;
  return 5;
}
```

---

## 🔧 Technical Implementation Details

### 1. Ollama Integration

```typescript
// packages/ai-service/src/llm/ollama-client.ts
import axios from 'axios';

export class OllamaClient {
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }
  
  async generate(
    prompt: string,
    model = 'llama3:8b',
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.maxTokens || 2000,
      },
    });
    
    return response.data.response;
  }
  
  async *streamGenerate(
    prompt: string,
    model = 'llama3:8b'
  ): AsyncGenerator<string> {
    const response = await axios.post(
      `${this.baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: true,
      },
      { responseType: 'stream' }
    );
    
    for await (const chunk of response.data) {
      const data = JSON.parse(chunk.toString());
      if (data.response) {
        yield data.response;
      }
    }
  }
}
```

### 2. SEO Analyzer Implementation

```typescript
// packages/ai-service/src/seo/analyzer.ts
import { JSDOM } from 'jsdom';
import * as textstat from 'textstat';

export function analyzeSEO(
  htmlContent: string,
  keyword: string,
  metaTitle: string,
  metaDescription: string
): SEOAnalysis {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  // Extract text content
  const textContent = document.body.textContent || '';
  const wordCount = textContent.split(/\s+/).length;
  
  // Keyword analysis
  const keywordCount = (textContent.match(new RegExp(keyword, 'gi')) || []).length;
  const keywordDensity = (keywordCount / wordCount) * 100;
  
  // Heading structure
  const h1Count = document.querySelectorAll('h1').length;
  const h2Count = document.querySelectorAll('h2').length;
  const h3Count = document.querySelectorAll('h3').length;
  
  // Readability
  const fleschScore = textstat.fleschReadingEase(textContent);
  
  // Calculate score
  let score = 0;
  const issues: SEOIssue[] = [];
  const recommendations: string[] = [];
  
  // Keyword score (20 points)
  if (keywordDensity >= 1 && keywordDensity <= 2) {
    score += 20;
  } else if (keywordDensity >= 0.5 && keywordDensity < 1) {
    score += 15;
    issues.push({
      type: 'warning',
      message: 'Keyword density is low. Aim for 1-2%.',
    });
  } else {
    score += 5;
    issues.push({
      type: 'error',
      message: `Keyword density is ${keywordDensity.toFixed(2)}%. Should be 1-2%.`,
    });
  }
  
  // Content length (15 points)
  if (wordCount >= 300) {
    score += 15;
  } else {
    score += Math.max(0, (wordCount / 300) * 15);
    issues.push({
      type: 'warning',
      message: `Content is ${wordCount} words. Recommended: 300+ words.`,
    });
  }
  
  // Heading structure (15 points)
  if (h1Count === 1) score += 5;
  else issues.push({ type: 'error', message: 'Should have exactly 1 H1 tag.' });
  
  if (h2Count >= 2) score += 10;
  else issues.push({ type: 'warning', message: 'Add more H2 headings for better structure.' });
  
  // Meta tags (20 points)
  if (metaTitle.length >= 50 && metaTitle.length <= 60) score += 10;
  else issues.push({ type: 'warning', message: 'Meta title should be 50-60 characters.' });
  
  if (metaDescription.length >= 150 && metaDescription.length <= 160) score += 10;
  else issues.push({ type: 'warning', message: 'Meta description should be 150-160 characters.' });
  
  // Readability (20 points)
  if (fleschScore >= 60) score += 20;
  else {
    score += Math.max(0, (fleschScore / 60) * 20);
    recommendations.push('Improve readability by using shorter sentences and simpler words.');
  }
  
  return {
    score: Math.min(100, score),
    keywordDensity,
    wordCount,
    readabilityScore: fleschScore,
    headingStructure: {
      hasH1: h1Count === 1,
      h2Count,
      h3Count,
    },
    metaTags: {
      titleLength: metaTitle.length,
      descriptionLength: metaDescription.length,
      hasKeywords: metaTitle.toLowerCase().includes(keyword.toLowerCase()),
    },
    issues,
    recommendations,
  };
}
```

---

## 🎨 UI/UX Design

### AI Generator Dialog
```
┌─────────────────────────────────────────────────┐
│  AI Content Generator                    [X]   │
├─────────────────────────────────────────────────┤
│  Keyword: [________________________]            │
│  Tone: [Professional ▼]                         │
│  Word Count: [====|====] 1500 words             │
│  Category: [Select category ▼]                 │
│  Include Examples: [✓]                          │
│                                                 │
│  [Generate Article] [Cancel]                    │
└─────────────────────────────────────────────────┘
```

### SEO Score Sidebar
```
┌─────────────────────────┐
│  SEO Score              │
│  ┌───────────────────┐ │
│  │      85/100       │ │
│  │    [████████░░]   │ │
│  └───────────────────┘ │
│                        │
│  Keyword: 20/20 ✓      │
│  Content: 15/15 ✓      │
│  Headings: 12/15 ⚠     │
│  Meta Tags: 18/20 ⚠    │
│  Readability: 20/20 ✓  │
│                        │
│  ⚠ Issues (2)          │
│  • Add more H2 headings│
│  • Meta title too long  │
│                        │
│  💡 Recommendations     │
│  • Use keyword in H1    │
│  • Add internal links   │
└─────────────────────────┘
```

---

## 📝 API Endpoints

### 1. Generate Post
```http
POST /api/ai/generate-post
Authorization: Bearer <token>
Content-Type: application/json

{
  "keyword": "react hooks best practices",
  "tone": "professional",
  "wordCount": 2000,
  "category": "web-development",
  "includeExamples": true
}

Response:
{
  "success": true,
  "data": {
    "title": "10 React Hooks Best Practices for Modern Development",
    "content": "<h1>...</h1><p>...</p>",
    "excerpt": "...",
    "metaDescription": "...",
    "suggestedSlug": "react-hooks-best-practices",
    "keywords": ["react", "hooks", "best practices"]
  }
}
```

### 2. Analyze SEO
```http
POST /api/ai/seo-score
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "<h1>...</h1><p>...</p>",
  "keyword": "react hooks",
  "title": "React Hooks Guide",
  "metaDescription": "..."
}

Response:
{
  "success": true,
  "data": {
    "score": 85,
    "keywordDensity": 1.5,
    "wordCount": 1200,
    "readabilityScore": 65,
    "headingStructure": {
      "hasH1": true,
      "h2Count": 5,
      "h3Count": 12
    },
    "issues": [...],
    "recommendations": [...]
  }
}
```

---

## 🔒 Security & Best Practices

1. **Rate Limiting**: Limit AI requests per user (e.g., 10/hour)
2. **Content Validation**: Check for inappropriate content
3. **Plagiarism Check**: Optional integration với Copyscape API
4. **Human Review**: Always require admin approval before publishing
5. **Error Handling**: Graceful fallbacks nếu Ollama server down
6. **Caching**: Cache generated content để tránh re-generation

---

## 📈 Success Metrics

- **Content Quality**: Generated posts có SEO score > 80
- **Time Savings**: Giảm 70% thời gian viết bài
- **SEO Performance**: Generated posts có ranking tốt hơn manual posts
- **User Adoption**: 80% admin sử dụng AI generator

---

## 🚦 Next Steps

1. **Review & Approve Plan** - Team review
2. **Setup Ollama** - Install và test locally
3. **Create AI Service Package** - Start với basic structure
4. **Build MVP** - Simple generate + score functionality
5. **Test & Iterate** - Gather feedback, improve prompts
6. **Deploy** - Production rollout

---

## 📚 Resources

- [Ollama Documentation](https://ollama.com/docs)
- [LangChain.js](https://js.langchain.com/)
- [TextStat (Readability)](https://pypi.org/project/textstat/)
- [Yoast SEO Guidelines](https://yoast.com/seo-blog/)

---

**Estimated Timeline**: 4-5 weeks
**Team Size**: 1-2 developers
**Priority**: High (game-changer cho content creation)
