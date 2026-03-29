import { prisma } from "@/lib/db"
import { PROVIDERS } from "@/lib/llm-providers"
import { cache } from "react"
import { LLMConfig, LLMProvider } from "@/ai/providers/llmProvider"

export type SettingsMap = Record<string, string>

/**
 * Helper to extract LLM provider settings from SettingsMap.
 */
export function getLLMSettings(settings: SettingsMap) {
  const priorities = (settings.llm_providers || "openai,google,mistral").split(",").map(p => p.trim()).filter(Boolean)

  const providers: LLMConfig[] = priorities.map((provider) => {
    if (provider === "openai") {
      return {
        provider: provider as LLMProvider,
        apiKey: settings.openai_api_key || "",
        model: settings.openai_model_name || PROVIDERS[0]['defaultModelName'],
      }
    }
    if (provider === "google") {
      return {
        provider: provider as LLMProvider,
        apiKey: settings.google_api_key || "",
        model: settings.google_model_name || PROVIDERS[1]['defaultModelName'],
      }
    }
    if (provider === "mistral") {
      return {
        provider: provider as LLMProvider,
        apiKey: settings.mistral_api_key || "",
        model: settings.mistral_model_name || PROVIDERS[2]['defaultModelName'],
      }
    }
    return null
  }).filter((provider): provider is LLMConfig => provider !== null)

  if (process.env.CUSTOM_LLM_BASE_URL) {
    providers.unshift({
      provider: "openai-compatible" as LLMProvider,
      baseUrl: process.env.CUSTOM_LLM_BASE_URL,
      model: process.env.CUSTOM_LLM_MODEL_NAME || "qwen2.5-vl-7b-instruct",
      apiKey: process.env.CUSTOM_LLM_API_KEY || "lm-studio",
    })
  }

  return {
    providers,
  }
}

export const getSettings = cache(async (userId: string): Promise<SettingsMap> => {
  const settings = await prisma.setting.findMany({
    where: { userId },
  })

  return settings.reduce((acc, setting) => {
    acc[setting.code] = setting.value || ""
    return acc
  }, {} as SettingsMap)
})

export const updateSettings = cache(async (userId: string, code: string, value: string | undefined) => {
  return await prisma.setting.upsert({
    where: { userId_code: { code, userId } },
    update: { value },
    create: {
      code,
      value,
      name: code,
      userId,
    },
  })
})
