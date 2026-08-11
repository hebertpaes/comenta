import SwiftUI

struct LoginView: View {
    let api: API

    @State private var email = "admin@comenta.com.br"
    @State private var senha = ""
    @State private var endereco = ""
    @State private var erro: String?
    @State private var entrando = false
    @FocusState private var campoAtivo: Campo?

    private enum Campo { case email, senha, endereco }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("E-mail", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($campoAtivo, equals: .email)

                    SecureField("Senha", text: $senha)
                        .textContentType(.password)
                        .focused($campoAtivo, equals: .senha)
                        .onSubmit { Task { await entrar() } }
                } header: {
                    Text("Acesso")
                }

                Section {
                    TextField("http://192.168.1.126:4000", text: $endereco)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($campoAtivo, equals: .endereco)
                } header: {
                    Text("Servidor")
                } footer: {
                    Text(
                        "O IP do Mac na rede. `localhost` não serve: do iPhone ele aponta para o próprio aparelho."
                    )
                }

                if let erro {
                    Section {
                        Text(erro)
                            .foregroundStyle(.red)
                            .font(.callout)
                    }
                }

                Section {
                    Button {
                        Task { await entrar() }
                    } label: {
                        if entrando {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Entrar").frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(entrando || email.isEmpty || senha.isEmpty)
                }
            }
            .navigationTitle("Comenta")
            .onAppear { endereco = api.baseURL }
        }
    }

    private func entrar() async {
        campoAtivo = nil
        erro = nil
        entrando = true
        defer { entrando = false }

        // Aparar espaços e a barra final evita o erro mais comum de digitação no
        // teclado do iPhone, que viraria uma URL com "//" no meio.
        let limpo = endereco.trimmingCharacters(in: .whitespacesAndNewlines)
        api.baseURL = limpo.hasSuffix("/") ? String(limpo.dropLast()) : limpo

        do {
            try await api.entrar(email: email, senha: senha)
        } catch {
            erro = error.localizedDescription
        }
    }
}
