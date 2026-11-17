import Anthropic from '@anthropic-ai/sdk';
import { SUMMARY_JSON_SCHEMA, parseSummaryContent, type SummaryContent } from './prompt';

/** #1612 Claude Haiku 5.5: the owner chose the cheapest model for a short weekly text */
export const SUMMARY_MODEL = 'claude-haiku-5-5';

export class AiSummaryError extends Error {}

export interface SummaryRequest {
  system: string;
  user: string;
}

export interface WrittenSummary {
  content: SummaryContent;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export type SummaryWriter = (request: SummaryRequest) => Promise<WrittenSummary>;

/** The feature is on when the API has a key (Railway variable). Unset = button hidden, nothing else changes. */
export function aiSummaryAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

/** One call, JSON output checked against the schema. Refusal, truncation or bad JSON throw AiSummaryError. */
export const writeSummaryWithClaude: SummaryWriter = async ({ system, user }) => {
  // Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL for a local fake server in e2e) from the environment
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 });
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SUMMARY_JSON_SCHEMA } }
    });
  } catch (error) {
    throw new AiSummaryError(error instanceof Error ? error.message : 'request failed');
  }
  if (response.stop_reason === 'refusal') throw new AiSummaryError('refusal');
  if (response.stop_reason === 'max_tokens') throw new AiSummaryError('max_tokens');
  const text = response.content.find((block) => block.type === 'text');
  const content = text && text.type === 'text' ? parseSummaryContent(text.text) : null;
  if (!content) throw new AiSummaryError('unexpected output');
  return {
    content,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens
  };
};
