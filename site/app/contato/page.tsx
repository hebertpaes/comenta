import type { Metadata } from "next";
import React from "react";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contato — Comenta",
  description:
    "Fale com o time do Comenta. Sua mensagem abre uma conversa real na plataforma — o mesmo caminho das mensagens dos seus clientes.",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

export default function ContatoPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <SiteNav />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Fale com a <span className="text-gradient">gente</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Dúvida sobre um recurso, um plano ou se o Comenta serve para a sua operação? Escreva —
              respondemos no WhatsApp.
            </p>

            <div className="mt-10 space-y-6">
              {[
                {
                  icone: "⚡",
                  titulo: "Quer só experimentar?",
                  texto: (
                    <>
                      Não precisa falar com ninguém.{" "}
                      <a href={APP_URL} className="text-fuchsia-600 hover:underline">
                        Crie a conta grátis
                      </a>{" "}
                      e conecte um WhatsApp em poucos minutos.
                    </>
                  ),
                },
                {
                  icone: "📚",
                  titulo: "Dúvida técnica?",
                  texto: (
                    <>
                      A{" "}
                      <a href="/docs" className="text-fuchsia-600 hover:underline">
                        documentação
                      </a>{" "}
                      cobre canais, campanhas, API e webhooks — talvez a resposta já esteja lá.
                    </>
                  ),
                },
                {
                  icone: "🛡️",
                  titulo: "Vai disparar em massa?",
                  texto: (
                    <>
                      Vale ler antes como o{" "}
                      <a href="/recursos/campanhas" className="text-fuchsia-600 hover:underline">
                        ritmo do envio
                      </a>{" "}
                      protege o seu número de ser bloqueado.
                    </>
                  ),
                },
              ].map((b) => (
                <div key={b.titulo} className="flex gap-4">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-100 to-indigo-100 text-xl">
                    {b.icone}
                  </div>
                  <div>
                    <div className="font-bold">{b.titulo}</div>
                    <p className="mt-1 text-slate-600">{b.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ContactForm />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
