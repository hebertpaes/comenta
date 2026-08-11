import SwiftUI

struct ConversasView: View {
    let api: API

    @State private var conversas: [Conversation] = []
    @State private var erro: String?
    @State private var carregando = true

    var body: some View {
        NavigationStack {
            Group {
                if carregando && conversas.isEmpty {
                    ProgressView("Carregando…")
                } else if let erro, conversas.isEmpty {
                    ContentUnavailableView {
                        Label("Sem conexão", systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(erro)
                    } actions: {
                        Button("Tentar de novo") { Task { await carregar() } }
                    }
                } else if conversas.isEmpty {
                    ContentUnavailableView(
                        "Nenhuma conversa",
                        systemImage: "bubble.left.and.bubble.right",
                        description: Text("Quando alguém escrever, aparece aqui.")
                    )
                } else {
                    List(conversas) { conversa in
                        NavigationLink(value: conversa) {
                            LinhaConversa(conversa: conversa)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Conversas")
            .navigationDestination(for: Conversation.self) { conversa in
                ConversaView(api: api, conversa: conversa)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if let nome = api.nomeUsuario {
                            Text(nome)
                        }
                        Button("Sair", role: .destructive) { api.sair() }
                    } label: {
                        Image(systemName: "person.crop.circle")
                    }
                }
            }
            .refreshable { await carregar() }
            .task { await carregar() }
        }
    }

    private func carregar() async {
        carregando = true
        defer { carregando = false }
        do {
            conversas = try await api.conversas()
            erro = nil
        } catch {
            erro = error.localizedDescription
        }
    }
}

private struct LinhaConversa: View {
    let conversa: Conversation

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(cor)
                .frame(width: 9, height: 9)

            VStack(alignment: .leading, spacing: 2) {
                Text(conversa.contact.name)
                    .font(.body.weight(.medium))
                Text(conversa.statusLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if conversa.unreadCount > 0 {
                Text("\(conversa.unreadCount)")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(.tint, in: Capsule())
                    .foregroundStyle(.white)
            }
        }
        .padding(.vertical, 4)
    }

    private var cor: Color {
        switch conversa.status {
        case "pending": return .orange
        case "open": return .blue
        default: return .green
        }
    }
}
