import SwiftUI

@main
struct ComentaApp: App {
    @State private var api = API()

    var body: some Scene {
        WindowGroup {
            if api.estaLogado {
                ConversasView(api: api)
            } else {
                LoginView(api: api)
            }
        }
    }
}
