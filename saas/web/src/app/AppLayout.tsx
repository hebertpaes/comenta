import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { BotaoInstalar } from "../components/BotaoInstalar";
import { CommandPalette } from "../components/CommandPalette";
import { Logo } from "../components/Logo";
import { useTheme } from "../lib/useTheme";
import { NAV, type NavItem } from "./nav";

const BRAND_COLORS = [
  { name: "Roxo Violeta", hex: "#6d28d9" },
  { name: "Verde Esmeralda", hex: "#10b981" },
  { name: "Azul Oceano", hex: "#2563eb" },
  { name: "Vermelho Rosa", hex: "#e11d48" },
  { name: "Dourado Âmbar", hex: "#f59e0b" },
];

export function AppLayout() {
  const { me, isAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem("comenta_accent_color") || "#6d28d9";
  });

  const [menuItems, setMenuItems] = useState<NavItem[]>(() => {
    const saved = localStorage.getItem("comenta_custom_nav");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* fallback */
      }
    }
    return NAV;
  });

  const [editMenuModal, setEditMenuModal] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
    localStorage.setItem("comenta_accent_color", accentColor);
  }, [accentColor]);

  const items = menuItems.filter((i) => !i.adminOnly || isAdmin);

  const toggleMenuItem = (to: string) => {
    const updated = menuItems.map((item) =>
      item.to === to ? { ...item, hidden: !item.hidden } : item
    );
    setMenuItems(updated);
    localStorage.setItem("comenta_custom_nav", JSON.stringify(updated));
  };

  const resetMenu = () => {
    setMenuItems(NAV);
    localStorage.removeItem("comenta_custom_nav");
  };

  return (
    <div className="app">
      {/* Sidebar Desktop com Navegação App Premium */}
      <aside className="side">
        <Logo />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
            Menu Principal
          </span>
          <button
            type="button"
            onClick={() => setEditMenuModal(true)}
            style={{ background: "none", border: 0, padding: 0, fontSize: 12, color: "var(--accent)", fontWeight: 700, cursor: "pointer" }}
          >
            ✏️ Editar
          </button>
        </div>

        <nav className="nav">
          {items.filter((i) => !i.hidden).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)", fontSize: 13 }} className="muted">
          {/* Seletor de Cores Editável do Tema */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              🎨 Cor Principal da Marca:
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setAccentColor(c.hex)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: c.hex,
                    border: accentColor === c.hex ? "2px solid #fff" : "none",
                    padding: 0,
                    cursor: "pointer",
                    boxShadow: accentColor === c.hex ? "0 0 8px " + c.hex : "none"
                  }}
                />
              ))}
            </div>
          </div>

          <BotaoInstalar />

          <button className="themebtn" onClick={() => setPaletteOpen(true)}>
            <span>🔎 Buscar Rápida</span>
            <kbd className="kbd">⌘K</kbd>
          </button>

          <button className="themebtn" onClick={toggle}>
            {theme === "dark" ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: "0 4px" }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{me?.company.name}</span>
            <button
              className="link"
              onClick={() => {
                logout();
                navigate("/entrar", { replace: true });
              }}
              style={{ fontSize: 12, color: "#ef4444" }}
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="main">
        <Outlet />
      </main>

      {/* Barra de Navegação Inferior estilo App Mobile Native */}
      <div className="mobile-bottom-bar">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">📊</span>
          <span>Início</span>
        </NavLink>
        <NavLink to="/conversas" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">💬</span>
          <span>Chat</span>
        </NavLink>
        <NavLink to="/kanban" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">📋</span>
          <span>Kanban</span>
        </NavLink>
        <NavLink to="/flowbuilder" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">⚡</span>
          <span>Fluxos</span>
        </NavLink>
        <NavLink to="/cursos" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">🎓</span>
          <span>Aulas</span>
        </NavLink>
        <NavLink to="/config" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">⚙️</span>
          <span>Ajustes</span>
        </NavLink>
      </div>

      {/* Modal de Personalização dos Menus */}
      {editMenuModal && (
        <div className="palette-backdrop" onClick={() => setEditMenuModal(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>⚙️ Personalizar Menus do Painel</h3>
              <button type="button" onClick={() => setEditMenuModal(false)} className="ghost" style={{ padding: "4px 10px" }}>
                ✕ Fechar
              </button>
            </div>

            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              Marque ou desmarque os itens para exibir ou ocultar do seu menu lateral.
            </p>

            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
              {menuItems.map((item) => (
                <label
                  key={item.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--panel2)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!item.hidden}
                    onChange={() => toggleMenuItem(item.to)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" onClick={resetMenu} className="ghost" style={{ fontSize: 12 }}>
                Restaurar Padrão
              </button>
              <button type="button" onClick={() => setEditMenuModal(false)} style={{ fontSize: 12 }}>
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paleta de Comandos ⌘K */}
      <CommandPalette isAdmin={isAdmin} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
