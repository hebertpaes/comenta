import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { Logo } from "../components/Logo";
import { useTheme } from "../lib/useTheme";

interface NavItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "📊 Dashboard" },
  { to: "/conversas", label: "💬 Conversas" },
  { to: "/kanban", label: "📋 Kanban" },
  { to: "/equipe", label: "💬 Equipe" },
  { to: "/contatos", label: "👥 Contatos" },
  { to: "/usuarios", label: "🧑‍💼 Usuários", adminOnly: true },
  { to: "/filas", label: "🗂️ Filas", adminOnly: true },
  { to: "/respostas", label: "⚡ Respostas" },
  { to: "/tags", label: "🏷️ Tags", adminOnly: true },
  { to: "/config", label: "⚙️ Configurações", adminOnly: true },
  { to: "/automacoes", label: "🤖 Automações" },
  { to: "/campanhas", label: "📣 Campanhas", adminOnly: true },
  { to: "/ferramentas", label: "🧩 Ferramentas" },
  { to: "/cursos", label: "🎓 Academia" },
  { to: "/conexoes", label: "📲 Conexões" },
];

export function AppLayout() {
  const { me, isAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="app">
      <aside className="side">
        <Logo />
        <nav className="nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div
          style={{ position: "absolute", bottom: 18, fontSize: 13, width: 192 }}
          className="muted"
        >
          <button className="themebtn" onClick={toggle}>
            {theme === "dark" ? "☀️ Modo claro" : "🌙 Modo escuro"}
          </button>
          {me?.company.name}
          <br />
          <button
            className="link"
            onClick={() => {
              logout();
              navigate("/entrar", { replace: true });
            }}
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
