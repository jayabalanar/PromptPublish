import type { GlobalConfig } from "payload";

export const AISettings: GlobalConfig = {
  slug: "ai-settings",
  fields: [
    {
      name: "provider",
      type: "select",
      defaultValue: "anthropic",
      options: [
        { label: "Anthropic (Claude)", value: "anthropic" },
        { label: "Google Gemini", value: "gemini" },
        { label: "NVIDIA (Free)", value: "nvidia" },
        { label: "OpenAI", value: "openai" },
      ],
    },
    {
      name: "model",
      type: "text",
      defaultValue: "claude-sonnet-4-6",
    },
    { name: "anthropicKey", type: "text" },
    { name: "geminiKey", type: "text" },
    { name: "nvidiaKey", type: "text" },
    { name: "openaiKey", type: "text" },
  ],
};
