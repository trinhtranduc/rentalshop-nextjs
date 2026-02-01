export interface HuggingFaceClientOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface HuggingFaceResponse {
  generated_text: string;
}

export class HuggingFaceClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(options: HuggingFaceClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'mistralai/Mistral-7B-Instruct-v0.2';
    // Updated to use new router endpoint (api-inference.huggingface.co is deprecated)
    this.baseUrl = options.baseUrl || 'https://router.huggingface.co/models';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Generate text using HuggingFace Inference API
   */
  async generate(
    prompt: string,
    options?: {
      maxLength?: number;
      temperature?: number;
      topP?: number;
      doSample?: boolean;
    }
  ): Promise<string> {
    const url = `${this.baseUrl}/${this.model}`;
    
    const requestBody = {
      inputs: prompt,
      parameters: {
        max_new_tokens: options?.maxLength || 2000,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.95,
        do_sample: options?.doSample !== false,
        return_full_text: false,
      },
      options: {
        wait_for_model: true, // Wait for model to load if needed
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if it's a model loading error (503)
        if (response.status === 503) {
          const estimatedTime = response.headers.get('x-wait-for-model')
            ? parseInt(response.headers.get('x-wait-for-model') || '0')
            : this.retryDelay * (attempt + 1);
          
          console.log(`Model is loading, waiting ${estimatedTime}ms before retry ${attempt + 1}/${this.maxRetries}`);
          await this.sleep(estimatedTime);
          continue;
        }
        
        // Check for rate limit (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after')
            ? parseInt(response.headers.get('retry-after') || '0') * 1000
            : this.retryDelay * (attempt + 1) * 2;
          
          console.log(`Rate limited, waiting ${retryAfter}ms before retry ${attempt + 1}/${this.maxRetries}`);
          await this.sleep(retryAfter);
          continue;
        }
        
        // For other errors, throw immediately
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HuggingFace API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: HuggingFaceResponse | HuggingFaceResponse[] = await response.json();
        
        // Handle both single response and array response
        const result = Array.isArray(data) ? data[0] : data;
        
        if (!result || !result.generated_text) {
          throw new Error('Invalid response from HuggingFace API');
        }

        return result.generated_text.trim();
      } catch (error) {
        lastError = error as Error;
        
        // If it's an abort error, don't retry
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout after 2 minutes');
        }

        // Wait before retry
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * (attempt + 1));
        }
      }
    }

    throw new Error(`Failed to generate after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Check if model is available
   */
  async checkModelAvailability(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.model}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
