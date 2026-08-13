import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { AppLayout } from "./AppLayout";
import { RequireAuth, RequireAdmin } from "./guards";
import { LoginPage } from "../features/auth/LoginPage";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";

/**
 * Rotas do painel.
 *
 * A versão anterior navegava com `useState("dashboard")`: nenhuma tela tinha
 * URL, não dava para mandar link de uma conversa para um colega, o botão de
 * voltar do navegador saía do painel e um F5 sempre caía no dashboard. Agora
 * cada tela é uma rota, e a conversa aberta vai no path.
 *
 * As telas internas entram por `lazy`, então cada uma vira um chunk próprio: o
 * usuário baixa o dashboard ao abrir o painel, não as quinze telas de uma vez.
 * Login e troca de senha ficam no bundle inicial porque são a primeira coisa
 * que aparece.
 */
export const routes: RouteObject[] = [
  { path: "/entrar", element: <LoginPage /> },
  { path: "/trocar-senha", element: <ChangePasswordPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: "dashboard",
        lazy: async () => ({
          Component: (await import("../features/dashboard/DashboardPage")).DashboardPage,
        }),
      },
      {
        path: "conversas",
        lazy: async () => ({
          Component: (await import("../features/conversations/ConversationsPage"))
            .ConversationsPage,
        }),
      },
      {
        path: "conversas/:id",
        lazy: async () => ({
          Component: (await import("../features/conversations/ConversationsPage"))
            .ConversationsPage,
        }),
      },
      {
        path: "kanban",
        lazy: async () => ({
          Component: (await import("../features/kanban/KanbanPage")).KanbanPage,
        }),
      },
      {
        path: "equipe",
        lazy: async () => ({
          Component: (await import("../features/team/TeamChatPage")).TeamChatPage,
        }),
      },
      {
        path: "contatos",
        lazy: async () => ({
          Component: (await import("../features/contacts/ContactsPage")).ContactsPage,
        }),
      },
      {
        path: "respostas",
        lazy: async () => ({
          Component: (await import("../features/quick-replies/QuickRepliesPage")).QuickRepliesPage,
        }),
      },
      {
        path: "automacoes",
        lazy: async () => ({
          Component: (await import("../features/automations/AutomationsPage")).AutomationsPage,
        }),
      },
      {
        path: "flowbuilder",
        lazy: async () => ({
          Component: (await import("../features/flowbuilder/FlowBuilderPage")).FlowBuilderPage,
        }),
      },
      {
        path: "ferramentas",
        lazy: async () => ({
          Component: (await import("../features/tools/ToolsPage")).ToolsPage,
        }),
      },
      {
        path: "erp",
        lazy: async () => ({
          Component: (await import("../features/erp/ErpCrmPage")).ErpCrmPage,
        }),
      },
      {
        path: "agentes",
        lazy: async () => ({
          Component: (await import("../features/agents/AgentsPage")).AgentsPage,
        }),
      },
      {
        path: "spark",
        lazy: async () => ({
          Component: (await import("../features/agents/AgentsPage")).AgentsPage,
        }),
      },
      {
        path: "cursos",
        lazy: async () => ({
          Component: (await import("../features/academy/AcademyPage")).AcademyPage,
        }),
      },
      {
        path: "cursos/:id",
        lazy: async () => ({
          Component: (await import("../features/academy/CoursePage")).CoursePage,
        }),
      },
      {
        path: "conexoes",
        lazy: async () => ({
          Component: (await import("../features/channels/ConnectionsPage")).ConnectionsPage,
        }),
      },
      {
        path: "avaliacoes",
        lazy: async () => ({
          Component: (await import("../features/ratings/RatingsPage")).RatingsPage,
        }),
      },

      // Só administradores. O guarda replica o que a API já exige em
      // requireAdmin — a checagem no cliente é conveniência, não segurança.
      {
        element: <RequireAdmin />,
        children: [
          {
            path: "usuarios",
            lazy: async () => ({
              Component: (await import("../features/users/UsersPage")).UsersPage,
            }),
          },
          {
            path: "filas",
            lazy: async () => ({
              Component: (await import("../features/queues/QueuesPage")).QueuesPage,
            }),
          },
          {
            path: "tags",
            lazy: async () => ({
              Component: (await import("../features/tags/TagsPage")).TagsPage,
            }),
          },
          {
            path: "config",
            lazy: async () => ({
              Component: (await import("../features/settings/SettingsPage")).SettingsPage,
            }),
          },
          {
            path: "permissoes",
            lazy: async () => ({
              Component: (await import("../features/permissions/PermissionsPage")).PermissionsPage,
            }),
          },
          {
            path: "campanhas",
            lazy: async () => ({
              Component: (await import("../features/campaigns/CampaignsPage")).CampaignsPage,
            }),
          },
          {
            path: "chaves",
            lazy: async () => ({
              Component: (await import("../features/apikeys/ApiKeysPage")).ApiKeysPage,
            }),
          },
          {
            path: "webhooks",
            lazy: async () => ({
              Component: (await import("../features/webhooks/WebhooksPage")).WebhooksPage,
            }),
          },
        ],
      },

      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
];
