import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Os tokens são lidos do localStorage no import e guardados em variáveis de
 * módulo, então cada teste precisa de uma importação limpa.
 */
async function load({ access = "", refresh = "" } = {}) {
  localStorage.clear();
  if (access) localStorage.setItem("comenta_token", access);
  if (refresh) localStorage.setItem("comenta_refresh", refresh);
  vi.resetModules();
  const [http, tokens, endpoints] = await Promise.all([
    import("./http"),
    import("./tokens"),
    import("../api/endpoints"),
  ]);
  return { ...http, ...tokens, ...endpoints };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = () => globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

/** Acessa uma chamada do mock com erro claro quando ela não existe — mais útil
 *  em teste do que o `| undefined` que o noUncheckedIndexedAccess devolve. */
function call(i: number): [string, { headers: Record<string, string>; body: string }] {
  const c = fetchMock().mock.calls[i];
  if (!c) throw new Error(`fetch não foi chamado ${i + 1} vez(es)`);
  return c as [string, { headers: Record<string, string>; body: string }];
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("renovação do access token", () => {
  it("renova e repete a requisição quando toma 401", async () => {
    const { http } = await load({ access: "velho", refresh: "r1" });

    fetchMock()
      .mockResolvedValueOnce(json(401, { error: "expirado" }))
      .mockResolvedValueOnce(json(200, { accessToken: "novo", refreshToken: "r2" }))
      .mockResolvedValueOnce(json(200, { data: [{ id: "c1" }] }));

    await expect(http.get("/contacts")).resolves.toEqual({ data: [{ id: "c1" }] });

    expect(fetchMock()).toHaveBeenCalledTimes(3);
    expect(String(call(1)[0])).toContain("/auth/refresh");

    // A repetição tem de sair com o token novo, não com o que acabou de falhar.
    expect(call(2)[1].headers.Authorization).toBe("Bearer novo");
    // E a rotação precisa ser persistida, senão o próximo refresh usa o antigo.
    expect(localStorage.getItem("comenta_token")).toBe("novo");
    expect(localStorage.getItem("comenta_refresh")).toBe("r2");
  });

  it("renova uma vez só quando várias requisições tomam 401 juntas", async () => {
    const { http } = await load({ access: "velho", refresh: "r1" });

    fetchMock().mockImplementation((url: string, init: RequestInit) => {
      if (String(url).includes("/auth/refresh")) {
        return Promise.resolve(json(200, { accessToken: "novo", refreshToken: "r2" }));
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        auth === "Bearer novo" ? json(200, { data: [] }) : json(401, { error: "expirado" })
      );
    });

    await Promise.all([http.get("/contacts"), http.get("/queues"), http.get("/tags")]);

    const refreshes = fetchMock().mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes("/auth/refresh")
    );
    expect(refreshes).toHaveLength(1);
  });

  it("derruba a sessão quando o refresh também falha", async () => {
    const { http, isLoggedIn } = await load({ access: "velho", refresh: "expirado" });

    fetchMock()
      .mockResolvedValueOnce(json(401, { error: "expirado" }))
      .mockResolvedValueOnce(json(401, { error: "Refresh token inválido ou expirado" }));

    await expect(http.get("/contacts")).rejects.toThrow();
    expect(isLoggedIn()).toBe(false);
    expect(localStorage.getItem("comenta_token")).toBeNull();
    expect(localStorage.getItem("comenta_refresh")).toBeNull();
  });

  it("não tenta renovar quando o 401 vem do próprio login", async () => {
    const { auth } = await load();

    fetchMock().mockResolvedValueOnce(json(401, { error: "Credenciais inválidas" }));

    await expect(auth.login("a@b.com", "errada")).rejects.toThrow("Credenciais inválidas");
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it("não tenta renovar quando não há refresh token guardado", async () => {
    const { http } = await load({ access: "velho" });

    fetchMock().mockResolvedValueOnce(json(401, { error: "expirado" }));

    await expect(http.get("/contacts")).rejects.toThrow();
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });
});

describe("erros da API", () => {
  it("preserva o status para a UI distinguir 403 de 500", async () => {
    const { http, ApiError } = await load({ access: "a1", refresh: "r1" });

    fetchMock().mockResolvedValueOnce(json(403, { error: "Somente administradores" }));

    const err = await http.get("/users").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, message: "Somente administradores" });
    // Um 403 não pode disparar renovação de token: a sessão está válida, o que
    // falta é permissão.
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it("trata 204 como resposta vazia em vez de tentar ler JSON", async () => {
    const { http } = await load({ access: "a1" });

    fetchMock().mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(http.del("/contacts/abc")).resolves.toBeNull();
  });
});

describe("logout", () => {
  it("revoga o refresh token no servidor e limpa o local", async () => {
    const { auth, isLoggedIn } = await load({ access: "a1", refresh: "r1" });

    fetchMock().mockResolvedValue(json(200, { ok: true }));
    auth.logout();

    expect(isLoggedIn()).toBe(false);
    expect(localStorage.getItem("comenta_refresh")).toBeNull();

    const [url, init] = call(0);
    expect(String(url)).toContain("/auth/logout");
    expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" });
  });

  it("não chama o servidor quando não havia sessão", async () => {
    const { auth } = await load();
    auth.logout();
    expect(fetchMock()).not.toHaveBeenCalled();
  });
});
