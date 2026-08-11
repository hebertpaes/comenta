import SwiftUI

struct ConversaView: View {
    let api: API
    let conversa: Conversation

    @State private var mensagens: [Message] = []
    @State private var texto = ""
    @State private var erro: String?
    @State private var enviando = false
    @State private var sugerindo = false

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { scroll in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(mensagens) { msg in
                            Balao(mensagem: msg).id(msg.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: mensagens.count) {
                    // Depois de enviar, o campo some sob o teclado se a lista não
                    // acompanhar — rolar para a última mensagem resolve.
                    if let ultima = mensagens.last {
                        withAnimation { scroll.scrollTo(ultima.id, anchor: .bottom) }
                    }
                }
            }

            if let erro {
                Text(erro)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.bottom, 4)
            }

            HStack(spacing: 8) {
                // Sugestão do Claude: preenche o campo, não envia. A revisão do
                // atendente é o ponto — é ele quem assina a mensagem.
                Button {
                    Task { await sugerir() }
                } label: {
                    if sugerindo {
                        ProgressView().frame(width: 22)
                    } else {
                        Image(systemName: "sparkles").font(.title3)
                    }
                }
                .disabled(sugerindo || enviando)

                TextField("Responder…", text: $texto, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)

                Button {
                    Task { await enviar() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                }
                .disabled(enviando || texto.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding()
            .background(.bar)
        }
        .navigationTitle(conversa.contact.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await carregar() }
    }

    private func carregar() async {
        do {
            mensagens = try await api.conversa(id: conversa.id).messages
            erro = nil
        } catch {
            erro = error.localizedDescription
        }
    }

    private func sugerir() async {
        sugerindo = true
        defer { sugerindo = false }
        do {
            texto = try await api.sugerirResposta(id: conversa.id)
            erro = nil
        } catch {
            // A API distingue chave recusada, limite atingido e IA desligada —
            // mostrar a mensagem dela é mais útil que um "falhou" genérico.
            erro = error.localizedDescription
        }
    }

    private func enviar() async {
        let corpo = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !corpo.isEmpty else { return }
        enviando = true
        defer { enviando = false }
        do {
            let nova = try await api.responder(id: conversa.id, texto: corpo)
            mensagens.append(nova)
            texto = ""
            erro = nil
        } catch {
            // O texto continua no campo de propósito: falhou o envio, o
            // atendente não deve perder o que escreveu.
            erro = error.localizedDescription
        }
    }
}

private struct Balao: View {
    let mensagem: Message

    var body: some View {
        HStack {
            if !mensagem.isFromContact { Spacer(minLength: 40) }

            Text(mensagem.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    mensagem.isFromContact ? AnyShapeStyle(.quaternary) : AnyShapeStyle(.tint),
                    in: RoundedRectangle(cornerRadius: 16)
                )
                // AnyShapeStyle nos dois lados: `.primary` e `.white` são tipos
                // de estilo diferentes, e o ternário não unifica sozinho.
                .foregroundStyle(
                    mensagem.isFromContact
                        ? AnyShapeStyle(.primary) : AnyShapeStyle(Color.white)
                )

            if mensagem.isFromContact { Spacer(minLength: 40) }
        }
    }
}
