import { useState } from "react";

interface PermissionItem {
  id: string;
  label: string;
  category: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

const ALL_PERMISSIONS: PermissionItem[] = [
  { id: "view_dashboard", label: "📊 Visualizar Dashboard & Métricas", category: "Geral" },
  { id: "manage_conversations", label: "💬 Atender & Gerenciar Conversas", category: "Atendimento" },
  { id: "manage_kanban", label: "📋 Mover & Editar Cards no Kanban", category: "Vendas / CRM" },
  { id: "manage_contacts", label: "👥 Criar & Editar Contatos/Leads", category: "Contatos" },
  { id: "manage_team", label: "🧑‍💼 Cadastrar & Gerenciar Usuários", category: "Equipe" },
  { id: "manage_flowbuilder", label: "⚡ Criar & Editar Fluxos FlowBuilder IA", category: "Automação" },
  { id: "manage_automations", label: "🤖 Configurar Robôs & Regras de Atendimento", category: "Automação" },
  { id: "manage_campaigns", label: "📣 Disparar Campanhas de Mensagens", category: "Marketing" },
  { id: "manage_courses", label: "🎓 Gerenciar Cursos & Videoaulas", category: "Educação" },
  { id: "manage_integrations", label: "🪝 Configurar Hotmart, ABACS, Kiwify & Meta", category: "Integrações" },
  { id: "manage_apikeys", label: "🔑 Criar & Revogar Chaves de API", category: "Segurança" },
  { id: "manage_settings", label: "⚙️ Alterar Configurações Globais", category: "Configurações" }
];

const DEFAULT_ROLES: RoleItem[] = [
  {
    id: "role_admin",
    name: "Administrador Geral",
    description: "Acesso ilimitado a todos os módulos, configurações e financeiro.",
    permissions: ALL_PERMISSIONS.map((p) => p.id)
  },
  {
    id: "role_supervisor",
    name: "Supervisor de Atendimento",
    description: "Gerencia atendentes, conversas, Kanban, contatos e relatórios.",
    permissions: ["view_dashboard", "manage_conversations", "manage_kanban", "manage_contacts", "manage_team", "manage_courses"]
  },
  {
    id: "role_agent",
    name: "Atendente Comercial / Suporte",
    description: "Responde conversas atribuídas, move cards no Kanban e visualiza contatos.",
    permissions: ["view_dashboard", "manage_conversations", "manage_kanban", "manage_contacts"]
  },
  {
    id: "role_marketing",
    name: "Gestor de Marketing",
    description: "Acesso a campanhas em massa, FlowBuilder IA, robôs e relatórios.",
    permissions: ["view_dashboard", "manage_contacts", "manage_flowbuilder", "manage_automations", "manage_campaigns"]
  }
];

export function PermissionsPage() {
  const [roles, setRoles] = useState<RoleItem[]>(DEFAULT_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("role_admin");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedRole: RoleItem = (roles.find((r) => r.id === selectedRoleId) || roles[0] || DEFAULT_ROLES[0]) as RoleItem;

  const handleTogglePermission = (permissionId: string) => {
    setSavedSuccess(false);
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.id !== selectedRoleId) return role;
        const exists = role.permissions.includes(permissionId);
        const newPerms = exists
          ? role.permissions.filter((p) => p !== permissionId)
          : [...role.permissions, permissionId];
        return { ...role, permissions: newPerms };
      })
    );
  };

  const handleSavePermissions = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreateRole = () => {
    const name = prompt("Digite o nome do novo Nível de Acesso (Cargo):");
    if (name) {
      const newRole: RoleItem = {
        id: `role_${Date.now()}`,
        name,
        description: "Cargo personalizado com permissões customizadas.",
        permissions: ["view_dashboard", "manage_conversations"]
      };
      setRoles([...roles, newRole]);
      setSelectedRoleId(newRole.id);
    }
  };

  // Agrupa permissões por categoria
  const categories = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category)));

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2>🛡️ Gerenciamento de Permissões & Níveis de Acesso (RBAC)</h2>
          <p className="muted" style={{ marginTop: -8 }}>
            Defina o que cada perfil de atendente, supervisor ou administrador pode visualizar e modificar no sistema.
          </p>
        </div>
        <button type="button" onClick={handleCreateRole} style={{ fontWeight: 700 }}>
          + Novo Cargo Personalizado
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* Seletor de Cargos / Perfis */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", paddingLeft: 4 }}>
            Cargos & Perfis Cadastrados
          </span>

          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => {
                setSelectedRoleId(role.id);
                setSavedSuccess(false);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 16px",
                borderRadius: 12,
                border: selectedRoleId === role.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: selectedRoleId === role.id ? "rgba(109, 40, 217, 0.12)" : "var(--panel)",
                color: "var(--text)",
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: selectedRoleId === role.id ? "var(--accent)" : "var(--text)" }}>
                {role.name}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.3 }}>
                {role.description}
              </div>
              <span className="tag" style={{ marginTop: 8, fontSize: 10, background: "var(--panel2)" }}>
                {role.permissions.length} permissões ativas
              </span>
            </button>
          ))}
        </div>

        {/* Painel de Matriz de Permissões Editáveis */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                Permissões de: <span style={{ color: "var(--accent)" }}>{selectedRole.name}</span>
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                {selectedRole.description}
              </p>
            </div>
            <button type="button" onClick={handleSavePermissions} style={{ fontWeight: 700, padding: "9px 18px" }}>
              Salvar Alterações
            </button>
          </div>

          {savedSuccess && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#10b981", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              ✓ Permissões do cargo "{selectedRole.name}" salvas e aplicadas com sucesso!
            </div>
          )}

          {/* Matriz por Categorias */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {categories.map((cat) => {
              const categoryPermissions = ALL_PERMISSIONS.filter((p) => p.category === cat);
              return (
                <div key={cat} style={{ background: "var(--panel2)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
                    📁 Módulo: {cat}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                    {categoryPermissions.map((perm) => {
                      const isChecked = selectedRole.permissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: isChecked ? "rgba(109, 40, 217, 0.08)" : "var(--panel)",
                            border: isChecked ? "1px solid var(--accent)" : "1px solid var(--border)",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: isChecked ? 700 : 500
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.id)}
                            style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                          />
                          <span>{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
