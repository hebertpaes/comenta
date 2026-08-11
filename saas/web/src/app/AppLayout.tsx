import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { BotaoInstalar } from "../components/BotaoInstalar";
import { CommandPalette } from "../components/CommandPalette";
import { Logo } from "../components/Logo";
import { useTheme } from "../lib/useTheme";
import { NAV } from "./nav";

export function AppLayout() {
  const { me, isAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  // Estado da paleta mora aqui para que o botão da lateral — o caminho de quem
  // está no celular e não tem ⌘K — abra a mesma coisa que o atalho.
  const [paletteOpen, setPaletteOpen] = useState(false);

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
          <BotaoInstalar />
          <button className="themebtn" onClick={() => setPaletteOpen(true)}>
            🔎 Buscar <kbd className="kbd">⌘K</kbd>
          </button>
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
      <CommandPalette isAdmin={isAdmin} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
