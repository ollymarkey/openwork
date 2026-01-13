import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// Provider configuration schema
export const ProviderConfigSchema = z.object({
  anthropic: z
    .object({
      apiKey: z.string().optional(),
      baseURL: z.string().url().optional(),
    })
    .optional(),
  openai: z
    .object({
      apiKey: z.string().optional(),
      baseURL: z.string().url().optional(),
      organization: z.string().optional(),
    })
    .optional(),
  google: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
  ollama: z
    .object({
      baseURL: z.string().url().default("http://localhost:11434/v1"),
    })
    .optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Supported providers
export type ProviderId = "anthropic" | "openai" | "google" | "ollama";

// Model definitions per provider
export const PROVIDER_MODELS: Record<ProviderId, string[]> = {
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "o1",
    "o1-mini",
  ],
  google: [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
  ],
  ollama: [
    "llama3.2",
    "llama3.1",
    "mistral",
    "codellama",
    "deepseek-coder",
    "qwen2.5-coder",
  ],
};

// Default models per provider
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  google: "gemini-1.5-pro",
  ollama: "llama3.2",
};

/**
 * Creates a provider instance based on the provider ID and configuration
 */
export function createProvider(providerId: ProviderId, config?: ProviderConfig) {
  switch (providerId) {
    case "anthropic":
      return createAnthropic({
        apiKey: config?.anthropic?.apiKey ?? process.env.ANTHROPIC_API_KEY,
        baseURL: config?.anthropic?.baseURL,
      });

    case "openai":
      return createOpenAI({
        apiKey: config?.openai?.apiKey ?? process.env.OPENAI_API_KEY,
        baseURL: config?.openai?.baseURL,
        organization: config?.openai?.organization,
      });

    case "google":
      return createGoogleGenerativeAI({
        apiKey: config?.google?.apiKey ?? process.env.GOOGLE_API_KEY,
      });

    case "ollama":
      // Ollama uses OpenAI-compatible API
      return createOpenAI({
        apiKey: "ollama", // Ollama doesn't need a real API key
        baseURL: config?.ollama?.baseURL ?? "http://localhost:11434/v1",
      });

    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

/**
 * Gets the language model for a specific provider and model
 */
export function getLanguageModel(
  providerId: ProviderId,
  modelId: string,
  config?: ProviderConfig
) {
  const provider = createProvider(providerId, config);
  return provider(modelId);
}

/**
 * Validates that a model is supported by a provider
 */
export function isValidModel(providerId: ProviderId, modelId: string): boolean {
  // For Ollama, any model name is valid (user can have custom models)
  if (providerId === "ollama") return true;
  return PROVIDER_MODELS[providerId]?.includes(modelId) ?? false;
}

/**
 * Gets provider info for the UI
 */
export function getProviderInfo(providerId: ProviderId) {
  const info: Record<ProviderId, { name: string; description: string; requiresKey: boolean }> = {
    anthropic: {
      name: "Anthropic",
      description: "Claude models - excellent for coding and reasoning",
      requiresKey: true,
    },
    openai: {
      name: "OpenAI",
      description: "GPT models - versatile and widely supported",
      requiresKey: true,
    },
    google: {
      name: "Google",
      description: "Gemini models - fast and multimodal",
      requiresKey: true,
    },
    ollama: {
      name: "Ollama",
      description: "Local models - private and free",
      requiresKey: false,
    },
  };
  return info[providerId];
}
