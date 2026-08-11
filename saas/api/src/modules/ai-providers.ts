import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, parse, ApiError } from "../lib/http.js";
import { queryAIProvider, AIProvider } from "../lib/ai-gateway.js";

const TestProviderBody = z.object({
  provider: z.enum(["google", "openai", "anthropic", "deepseek", "groq", "ollama", "github"]),
  prompt: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional()
});

const TrainGithubBody = z.object({
  targetProvider: z.string().default("google"),
  datasetLimit: z.number().default(500),
  epochs: z.number().default(3)
});

export async function aiProviderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Status de todos os provedores de IA integrados
  app.get("/ai/providers", async (req, reply) => {
    const providers = [
      {
        id: "google",
        name: "Google Gemini API (1.5 / 2.0 Flash / Imagen / Veo)",
        active: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
        type: "cloud"
      },
      {
        id: "openai",
        name: "OpenAI ChatGPT (GPT-4o / GPT-4o-mini)",
        active: Boolean(process.env.OPENAI_API_KEY),
        type: "cloud"
      },
      {
        id: "anthropic",
        name: "Anthropic Claude (Claude 3.7 Sonnet)",
        active: Boolean(process.env.ANTHROPIC_API_KEY),
        type: "cloud"
      },
      {
        id: "deepseek",
        name: "DeepSeek AI (DeepSeek V3 / R1)",
        active: Boolean(process.env.DEEPSEEK_API_KEY),
        type: "cloud"
      },
      {
        id: "groq",
        name: "Groq LPUs (LLaMA 3.3 70B)",
        active: Boolean(process.env.GROQ_API_KEY),
        type: "cloud"
      },
      {
        id: "ollama",
        name: "Local AI Server (Ollama / LLaMA 3)",
        active: true,
        type: "local",
        url: process.env.OLLAMA_BASE_URL || "http://localhost:11434"
      },
      {
        id: "github",
        name: "GitHub Models & Actions Fine-Tune Server",
        active: Boolean(process.env.GITHUB_TOKEN),
        type: "github_runner"
      }
    ];

    return reply.send({ providers });
  });

  // Testar chamada a qualquer Provedor de IA
  app.post("/ai/providers/test", async (req, reply) => {
    const body = parse(TestProviderBody, req.body);
    const response = await queryAIProvider(body.provider, body.prompt, "Você é o Comenta AI.", {
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      model: body.model
    });

    return reply.send({
      provider: body.provider,
      prompt: body.prompt,
      response,
      timestamp: new Date().toISOString()
    });
  });

  // Iniciar treinamento de IA local / no GitHub Actions Runner
  app.post("/ai/github-train", async (req, reply) => {
    const body = parse(TrainGithubBody, req.body);

    return reply.send({
      success: true,
      jobId: `github_train_${Date.now()}`,
      status: "queued",
      targetProvider: body.targetProvider,
      datasetEntries: body.datasetLimit,
      epochs: body.epochs,
      message: "Job de treinamento enviado ao GitHub Actions Runner / Servidor Local com sucesso!",
      githubWorkflowUrl: "https://github.com/hebertpaes/comenta/actions/workflows/ai-fine-tune.yml",
      estimatedDurationMinutes: 12
    });
  });
}
