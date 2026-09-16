import Foundation

// MARK: - Modelos
// Espelham só o que a tela usa. A API devolve mais campos; `Decodable` ignora
// o resto sozinho, então adicionar campo no backend não quebra o app.

struct Contact: Decodable, Hashable {
    let id: String
    let name: String
    let phone: String?
}

struct Conversation: Decodable, Identifiable, Hashable {
    let id: String
    let status: String
    let unreadCount: Int
    let lastMessageAt: Date?
    let contact: Contact

    /// Rótulo em português para o status cru da API.
    var statusLabel: String {
        switch status {
        case "pending": return "Aguardando"
        case "open": return "Em atendimento"
        case "resolved": return "Resolvida"
        default: return status
        }
    }
}

struct Message: Decodable, Identifiable, Hashable {
    let id: String
    let direction: String
    let body: String
    let createdAt: Date?

    /// `in` = veio do cliente; `out` = resposta da equipe.
    var isFromContact: Bool { direction == "in" }
}

struct ConversationDetail: Decodable {
    let id: String
    let contact: Contact
    let messages: [Message]
}

private struct Page<T: Decodable>: Decodable { let data: [T] }

private struct LoginResponse: Decodable {
    let accessToken: String
    let user: User
    struct User: Decodable { let name: String }
}

// MARK: - Erros

enum APIError: LocalizedError {
    case semRede(String)
    case status(Int, String)

    var errorDescription: String? {
        switch self {
        case .semRede(let detalhe):
            return "Não consegui falar com o servidor: \(detalhe)"
        case .status(401, _):
            return "E-mail ou senha incorretos."
        case .status(let code, let msg):
            return msg.isEmpty ? "Erro \(code)" : msg
        }
    }
}

// MARK: - Cliente

/// Cliente da API do Comenta.
///
/// O endereço base é configurável na tela de login porque, no protótipo, a API
/// roda no Mac: do iPhone `localhost` seria o próprio aparelho, então é preciso
/// o IP do Mac na rede (ex.: http://192.168.1.126:4000).
@Observable
final class API {
    /// Endereço padrão. Trocável na tela de login e guardado entre sessões.
    static let enderecoPadrao = "http://192.168.1.126:4000"

    var baseURL: String {
        didSet { UserDefaults.standard.set(baseURL, forKey: "baseURL") }
    }
    private(set) var token: String?
    private(set) var nomeUsuario: String?

    var estaLogado: Bool { token != nil }

    init() {
        baseURL = UserDefaults.standard.string(forKey: "baseURL") ?? Self.enderecoPadrao
    }

    // A API devolve datas ISO-8601 com milissegundos ("2026-07-25T21:34:37.693Z").
    // O `.iso8601` padrão do JSONDecoder NÃO aceita fração de segundo e falharia
    // em toda conversa — por isso o formatador customizado.
    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let simples = ISO8601DateFormatter()
        simples.formatOptions = [.withInternetDateTime]
        d.dateDecodingStrategy = .custom { dec in
            let texto = try dec.singleValueContainer().decode(String.self)
            if let data = fmt.date(from: texto) ?? simples.date(from: texto) { return data }
            throw DecodingError.dataCorrupted(
                .init(codingPath: dec.codingPath, debugDescription: "Data inesperada: \(texto)")
            )
        }
        return d
    }()

    private func requisicao(_ metodo: String, _ caminho: String, corpo: [String: Any]? = nil)
        async throws -> Data
    {
        guard let url = URL(string: baseURL + caminho) else {
            throw APIError.semRede("endereço inválido: \(baseURL)")
        }
        var req = URLRequest(url: url)
        req.httpMethod = metodo
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let corpo { req.httpBody = try JSONSerialization.data(withJSONObject: corpo) }

        let dados: Data
        let resposta: URLResponse
        do {
            (dados, resposta) = try await URLSession.shared.data(for: req)
        } catch {
            // Sem isto o usuário veria a mensagem crua do URLSession, que não
            // ajuda a perceber que o iPhone está fora da rede do Mac.
            throw APIError.semRede(error.localizedDescription)
        }

        let code = (resposta as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let msg = (try? JSONSerialization.jsonObject(with: dados) as? [String: Any])?["error"]
            throw APIError.status(code, (msg as? String) ?? "")
        }
        return dados
    }

    func entrar(email: String, senha: String) async throws {
        let dados = try await requisicao(
            "POST", "/auth/login", corpo: ["email": email, "password": senha])
        let r = try Self.decoder.decode(LoginResponse.self, from: dados)
        token = r.accessToken
        nomeUsuario = r.user.name
    }

    func sair() {
        token = nil
        nomeUsuario = nil
    }

    func conversas() async throws -> [Conversation] {
        let dados = try await requisicao("GET", "/conversations?perPage=50")
        return try Self.decoder.decode(Page<Conversation>.self, from: dados).data
    }

    func conversa(id: String) async throws -> ConversationDetail {
        let dados = try await requisicao("GET", "/conversations/\(id)")
        return try Self.decoder.decode(ConversationDetail.self, from: dados)
    }

    @discardableResult
    func responder(id: String, texto: String) async throws -> Message {
        let dados = try await requisicao(
            "POST", "/conversations/\(id)/messages", corpo: ["body": texto])
        return try Self.decoder.decode(Message.self, from: dados)
    }

    /// Pede ao Claude uma sugestão de resposta para a conversa.
    ///
    /// A API devolve só o texto sugerido — quem decide enviar é o atendente,
    /// então o app preenche o campo em vez de mandar direto.
    func sugerirResposta(id: String) async throws -> String {
        let dados = try await requisicao("POST", "/conversations/\(id)/ai/suggest")
        return try Self.decoder.decode(Suggestion.self, from: dados).suggestion
    }
}

private struct Suggestion: Decodable { let suggestion: String }
