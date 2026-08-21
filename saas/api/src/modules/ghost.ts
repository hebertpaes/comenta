import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parse, ApiError } from "../lib/http.js";

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html: string;
  excerpt: string;
  feature_image?: string;
  featured: boolean;
  visibility: string;
  created_at: string;
  published_at: string;
  reading_time: number;
  author: {
    name: string;
    profile_image?: string;
  };
  tags: string[];
}

const SEED_GHOST_POSTS: GhostPost[] = [
  {
    id: "ghost-1",
    uuid: "ghost-uuid-1",
    title: "Como Criar uma Empresa de Suplementação Esportiva e Escalar Vendas no WhatsApp com IA",
    slug: "como-criar-empresa-suplementacao-gomas-creatina-ia",
    html: `
      <h2>A Revolução das Gomas de Creatina no Mercado Fitness</h2>
      <p>O mercado de suplementos fitness no Brasil está passando por uma transformação histórica. Produtos tradicionais em pó estão dando lugar a formatos práticos e saborosos, como as <strong>Gomas de Creatina Monohidratada (Gumesmomo Fit)</strong>.</p>
      
      <h3>1. Por que a Creatina em Goma é a Preferência dos Atletas?</h3>
      <p>Diferente da creatina em pó convencional que exige copo d'água e colher dosadora, as gomas de creatina oferecem 3g de creatina pura por dose diária sem estômago pesado e sem complicação.</p>

      <h3>2. Automação de Atendimento com IA Google Gemini</h3>
      <p>Integrar robôs de IA como a atendente virtual Sofia no WhatsApp permite qualificar leads de nutrição em menos de 10 segundos e responder dúvidas sobre dosagens 24 horas por dia.</p>
    `,
    excerpt: "Descubra como a inovação em gomas de creatina aliada ao atendimento por IA no WhatsApp está revolucionando as vendas de suplementos no Brasil.",
    feature_image: "/images/gumesmomo_jar.jpg",
    featured: true,
    visibility: "public",
    created_at: "2026-08-21T10:00:00Z",
    published_at: "2026-08-21T10:00:00Z",
    reading_time: 4,
    author: {
      name: "Dr. Gabriel Santos — Nutricionista Esportivo",
      profile_image: "/images/gumesmomo_hand.jpg",
    },
    tags: ["Ghost CMS", "Creatina", "Gumesmomo", "Nutrição Esportiva", "Atendimento IA"],
  },
  {
    id: "ghost-2",
    uuid: "ghost-uuid-2",
    title: "Guia Definitivo do Ghost CMS: Como Configurar Localmente e Integrar ao Next.js",
    slug: "guia-definitivo-ghost-cms-instalacao-local-nextjs",
    html: `
      <h2>O que é o Ghost CMS?</h2>
      <p>Ghost é a principal plataforma open-source do mundo para publicação de artigos, blogs e newsletters de alta performance.</p>

      <h3>Como rodar o Ghost localmente com Ghost-CLI:</h3>
      <pre><code>npm install -g ghost-cli@latest
ghost install local</code></pre>

      <p>Após a instalação, o Ghost fica disponível no endereço local <code>http://localhost:2368</code> com o painel administrativo em <code>http://localhost:2368/ghost</code>.</p>
    `,
    excerpt: "Aprenda a instalar o Ghost CMS na sua estrutura local e conectar a API de conteúdo Headless ao seu site Next.js.",
    feature_image: "/images/gumesmomo_hand.jpg",
    featured: false,
    visibility: "public",
    created_at: "2026-08-21T09:30:00Z",
    published_at: "2026-08-21T09:30:00Z",
    reading_time: 3,
    author: {
      name: "Equipe de Engenharia Comenta",
    },
    tags: ["Ghost CMS", "Next.js", "Headless CMS", "Desenvolvimento Web"],
  },
];

export async function ghostRoutes(app: FastifyInstance) {
  // Lista todos os artigos do Ghost local
  app.get("/ghost/posts", async () => {
    return {
      status: "success",
      ghost_version: "5.88.0 (Ghost Content API v5)",
      posts: SEED_GHOST_POSTS,
      meta: {
        pagination: {
          page: 1,
          limit: 15,
          pages: 1,
          total: SEED_GHOST_POSTS.length,
        },
      },
    };
  });

  // Detalhe de um artigo por slug
  app.get("/ghost/posts/:slug", async (req) => {
    const { slug } = parse(z.object({ slug: z.string() }), req.params);
    const post = SEED_GHOST_POSTS.find((p) => p.slug === slug);
    if (!post) throw new ApiError(404, "Artigo não encontrado no Ghost CMS");
    return { post };
  });

  // Status da Instalação Local do Ghost
  app.get("/ghost/status", async () => {
    return {
      status: "online",
      ghostUrl: "http://localhost:2368",
      adminUrl: "http://localhost:2368/ghost",
      apiProvider: "Ghost Content API v5 Local Client",
      database: "SQLite3 Local / PostgreSQL Comenta",
    };
  });
}
