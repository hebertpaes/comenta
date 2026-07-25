import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O módulo lê os tokens do localStorage no import e guarda em variáveis de
// módulo, então cada teste precisa de uma importação limpa.
async function loadApi({ access = "", refresh = "" } = {}) {
  localStorage.clear();
  if (access) localStorage.setItem("comenta_token", access);
  if (refresh) localStorage.setItem("comenta_refresh", refresh);
  vi.resetModules();
  return import("./api.js");
}

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("renovação do access token", () => {
  it("renova e repete a requisição quando toma 401", async () => {
    const { api } = await loadApi({ access: "velho", refresh: "r1" });

    fetch
      .mockResolvedValueOnce(json(401, { error: "expirado" }))
      .mockResolvedValueOnce(json(200, { accessToken: "novo", refreshToken: "r2" }))
      .mockResolvedValueOnce(json(200, { data: [{ id: "c1" }] }));

    await expect(api.contacts()).resolves.toEqual({ data: [{ id: "c1" }] });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][0]).toContain("/auth/refresh");

    // A repetição tem de sair com o token novo, não com o que acabou de falhar.
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe("Bearer novo");
    // E a rotação precisa ser persistida, senão o próximo refresh usa o antigo.
    expect(localStorage.getItem("comenta_token")).toBe("novo");
    expect(localStorage.getItem("comenta_refresh")).toBe("r2");
  });

  it("renova uma vez só quando várias requisições tomam 401 juntas", async () => {
    const { api } = await loadApi({ access: "velho", refresh: "r1" });

    fetch.mockImplementation((url) => {
      if (String(url).includes("/auth/refresh")) {
        return Promise.resolve(json(200, { accessToken: "novo", refreshToken: "r2" }));
      }
      const auth = "Bearer novo";
      return Promise.resolve(
        fetch.mock.calls.at(-1)?.[1]?.headers?.Authorization === auth
          ? json(200, { data: [] })
          : json(401, { error: "expirado" })
      );
    });

    await Promise.all([api.contacts(), api.queues(), api.tags()]);

    const refreshes = fetch.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshes).toHaveLength(1);
  });

  it("derruba a sessão quando o refresh também falha", async () => {
    const { api, isLoggedIn } = await loadApi({ access: "velho", refresh: "expirado" });

    fetch
      .mockResolvedValueOnce(json(401, { error: "expirado" }))
      .mockResolvedValueOnce(json(401, { error: "Refresh token inválido ou expirado" }));

    await expect(api.contacts()).rejects.toThrow();
    expect(isLoggedIn()).toBe(false);
    expect(localStorage.getItem("comenta_token")).toBeNull();
    expect(localStorage.getItem("comenta_refresh")).toBeNull();
  });

  it("não tenta renovar quando o 401 vem do próprio login", async () => {
    const { api } = await loadApi();

    fetch.mockResolvedValueOnce(json(401, { error: "Credenciais inválidas" }));

    await expect(api.login("a@b.com", "errada")).rejects.toThrow("Credenciais inválidas");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("não tenta renovar quando não há refresh token guardado", async () => {
    const { api } = await loadApi({ access: "velho" });

    fetch.mockResolvedValueOnce(json(401, { error: "expirado" }));

    await expect(api.contacts()).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("logout", () => {
  it("revoga o refresh token no servidor e limpa o local", async () => {
    const { api, isLoggedIn } = await loadApi({ access: "a1", refresh: "r1" });

    fetch.mockResolvedValue(json(200, { ok: true }));
    api.logout();

    expect(isLoggedIn()).toBe(false);
    expect(localStorage.getItem("comenta_refresh")).toBeNull();

    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain("/auth/logout");
    expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" });
  });

  it("não chama o servidor quando não havia sessão", async () => {
    const { api } = await loadApi();
    api.logout();
    expect(fetch).not.toHaveBeenCalled();
  });
});
