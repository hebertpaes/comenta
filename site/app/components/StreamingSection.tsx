"use client";

import React, { useState } from "react";

interface CourseItem {
  id: string;
  title: string;
  category: string;
  rating: string;
  duration: string;
  lessons: number;
  badge: string;
  image: string;
  youtubeId: string;
  synopsis: string;
}

const COURSES: CourseItem[] = [
  {
    id: "c1",
    title: "Formação Atendente IA & Vendas no WhatsApp",
    category: "IA Generativa",
    rating: "99% Relevante",
    duration: "45 min",
    lessons: 3,
    badge: "🔥 TOP 1 BRASIL",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    youtubeId: "dQw4w9WgXcQ",
    synopsis: "Aprenda a criar e treinar robôs autônomos com Google Gemini para responder clientes 24/7 e vender no WhatsApp.",
  },
  {
    id: "c2",
    title: "Masterclass Automações n8n, Webhooks & Hotmart",
    category: "Automação",
    rating: "98% Relevante",
    duration: "30 min",
    lessons: 2,
    badge: "⚡ NOVO EPISÓDIO",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
    youtubeId: "dQw4w9WgXcQ",
    synopsis: "Conecte webhooks da Hotmart ao Comenta API para matricular alunos e disparar mensagens automáticas de boas-vindas.",
  },
  {
    id: "c3",
    title: "Gestão Multicanal, CRM Kanban & Métricas NPS",
    category: "Gestão & CRM",
    rating: "96% Relevante",
    duration: "35 min",
    lessons: 2,
    badge: "✦ ORIGINAL COMENTA",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    youtubeId: "dQw4w9WgXcQ",
    synopsis: "Domine a caixa de entrada unificada do WhatsApp e Instagram, organize seu funil no Kanban e meça o NPS da equipe.",
  },
];

export default function StreamingSection() {
  const [selectedVideo, setSelectedVideo] = useState<CourseItem | null>(null);
  const [categoria, setCategoria] = useState("Todos");

  const categorias = ["Todos", "IA Generativa", "Automação", "Gestão & CRM"];

  const filtrados = categoria === "Todos" ? COURSES : COURSES.filter((c) => c.category === categoria);

  return (
    <section className="bg-[#141414] text-white py-16 px-4 md:px-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Header Estilo Netflix Streaming */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded tracking-widest uppercase">
                COMENTA STREAMING
              </span>
              <span className="text-slate-400 text-xs font-semibold">✦ ACADEMIA HD & 4K</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mt-2 tracking-tight">
              Aprenda no Estilo <span className="text-red-600">Netflix & YouTube</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-base mt-1">
              Treine sua equipe com séries e videoaulas de alta performance. Assista em qualquer dispositivo.
            </p>
          </div>

          {/* Filtros de Categoria */}
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  categoria === cat
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/40"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Billboard Banner Netflix */}
        <div className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-r from-black via-slate-900 to-red-950 border border-slate-800 shadow-2xl min-h-[380px] flex items-center p-8 md:p-12">
          <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${COURSES[0].image})` }} />
          <div className="relative z-10 max-w-2xl">
            <span className="bg-red-600/90 backdrop-blur text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">
              🔥 DESTAQUE DA SEMANA
            </span>
            <h3 className="text-3xl md:text-5xl font-black leading-tight text-white mb-4">
              {COURSES[0].title}
            </h3>
            <p className="text-slate-300 text-sm md:text-base mb-6 line-clamp-3">
              {COURSES[0].synopsis}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setSelectedVideo(COURSES[0])}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition shadow-xl shadow-red-600/30"
              >
                ▶ ASSISTIR AGORA
              </button>
              <a
                href="http://localhost:8080/cursos"
                className="bg-slate-800/80 hover:bg-slate-700 text-white px-6 py-3.5 rounded-xl font-bold text-sm backdrop-blur transition border border-slate-700"
              >
                ℹ️ MAIS INFORMAÇÕES
              </a>
            </div>
          </div>
        </div>

        {/* Fileira de Cursos (Netflix Horizontal Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((course) => (
            <div
              key={course.id}
              onClick={() => setSelectedVideo(course)}
              className="group relative bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 hover:border-red-600/50 transition-all duration-300 hover:scale-[1.03] cursor-pointer shadow-xl"
            >
              {/* Miniatura do Curso */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase shadow">
                  {course.badge}
                </span>
                <span className="absolute top-3 right-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">
                  HD 4K
                </span>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300 font-medium">
                  <span className="text-emerald-400 font-bold">{course.rating}</span>
                  <span>{course.duration} · {course.lessons} aulas</span>
                </div>
              </div>

              {/* Informações do Curso */}
              <div className="p-5">
                <h4 className="font-extrabold text-lg text-white group-hover:text-red-500 transition line-clamp-1">
                  {course.title}
                </h4>
                <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                  {course.synopsis}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                    {course.category}
                  </span>
                  <span className="text-xs font-bold text-red-500 group-hover:translate-x-1 transition flex items-center gap-1">
                    Assistir Episódio &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Video Player Estilo Netflix / YouTube */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                  PLAYING NOW
                </span>
                <span className="font-bold text-white text-sm truncate">{selectedVideo.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-white font-black text-xl px-3 py-1 rounded-full hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Video Container 16:9 */}
            <div className="relative aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-6 bg-slate-900">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-emerald-400 font-extrabold text-sm">{selectedVideo.rating}</span>
                <span className="text-slate-400 text-xs">{selectedVideo.duration}</span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  {selectedVideo.category}
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{selectedVideo.synopsis}</p>
              <div className="mt-4 flex gap-3">
                <a
                  href="http://localhost:8080/cursos"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition"
                >
                  🎓 Abrir no Painel de Alunos
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
