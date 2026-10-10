import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 2368;

function renderHojeMtNewsPortalHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HOJE MT NEWS — Portal de Notícias & Ghost CMS 2.0</title>
    <meta name="description" content="Portal de Notícias líder em Mato Grosso: Política, Agronegócio, Inteligência Artificial, Saúde Fit e Geomonitoramento em tempo real." />
    
    <!-- GOOGLE FONTS -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

    <style>
        :root {
            /* PALETA LIGHT MODE */
            --bg-body: #f4f7f5;
            --bg-surface: #ffffff;
            --bg-card: #ffffff;
            --bg-card-hover: #f9fbf9;
            --border: #e2e8f0;
            --border-glow: rgba(16, 185, 129, 0.3);
            
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            
            --primary: #059669;
            --primary-light: #10b981;
            --primary-dark: #047857;
            --primary-glow: rgba(16, 185, 129, 0.15);
            
            --accent-red: #ef4444;
            --accent-gold: #f59e0b;
            --accent-blue: #2563eb;
            --accent-purple: #8b5cf6;
            
            --nav-bg: rgba(255, 255, 255, 0.85);
            --header-border: rgba(226, 232, 240, 0.8);
            --ticker-bg: #064e3b;
            --ticker-text: #ecfdf5;
            --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.04);
            --shadow-md: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
            --shadow-lg: 0 20px 40px -10px rgba(15, 23, 42, 0.12);
            --font-display: 'Outfit', -apple-system, sans-serif;
            --font-body: 'Plus Jakarta Sans', -apple-system, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        [data-theme="dark"] {
            /* PALETA DARK OBSIDIAN EMERALD */
            --bg-body: #060d09;
            --bg-surface: #0a1610;
            --bg-card: #0e1e16;
            --bg-card-hover: #14281e;
            --border: #183324;
            --border-glow: rgba(16, 185, 129, 0.35);
            
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            
            --primary: #10b981;
            --primary-light: #34d399;
            --primary-dark: #059669;
            --primary-glow: rgba(16, 185, 129, 0.25);
            
            --nav-bg: rgba(10, 22, 16, 0.85);
            --header-border: rgba(24, 51, 36, 0.9);
            --ticker-bg: #042f21;
            --ticker-text: #6ee7b7;
            --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
            --shadow-md: 0 12px 30px rgba(0, 0, 0, 0.45);
            --shadow-lg: 0 24px 50px rgba(0, 0, 0, 0.6);
        }

        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            transition: background-color 0.25s ease, border-color 0.25s ease, color 0.15s ease;
        }

        body {
            font-family: var(--font-body);
            background-color: var(--bg-body);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        /* --- BREAKING TICKER --- */
        .ticker-bar {
            background: var(--ticker-bg);
            color: var(--ticker-text);
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            overflow: hidden;
            height: 42px;
            border-bottom: 1px solid var(--border);
        }

        .ticker-badge {
            background: var(--accent-red);
            color: #ffffff;
            font-family: var(--font-display);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            padding: 0 16px;
            height: 100%;
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            z-index: 2;
        }

        .ticker-badge::before {
            content: '';
            width: 7px;
            height: 7px;
            background: #ffffff;
            border-radius: 50%;
            animation: pulse-dot 1.2s infinite;
        }

        @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.7); }
        }

        .ticker-marquee {
            white-space: nowrap;
            overflow: hidden;
            display: flex;
            align-items: center;
            flex: 1;
        }

        .ticker-items {
            display: inline-flex;
            animation: marquee 38s linear infinite;
            gap: 32px;
            padding-left: 20px;
        }

        .ticker-marquee:hover .ticker-items {
            animation-play-state: paused;
        }

        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }

        .ticker-item {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }

        .ticker-item:hover {
            text-decoration: underline;
        }

        .ticker-tag {
            background: rgba(255, 255, 255, 0.15);
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
        }

        .ticker-market {
            background: rgba(0,0,0,0.3);
            padding: 0 16px;
            height: 100%;
            display: flex;
            align-items: center;
            gap: 14px;
            font-size: 11px;
            font-family: var(--font-mono);
            flex-shrink: 0;
            border-left: 1px solid rgba(255,255,255,0.1);
        }

        @media (max-width: 900px) {
            .ticker-market { display: none; }
        }

        /* --- HEADER & NAVIGATION --- */
        .site-header {
            position: sticky;
            top: 0;
            z-index: 50;
            background: var(--nav-bg);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--header-border);
        }

        .header-top {
            max-width: 1300px;
            margin: 0 auto;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }

        .brand-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-logo {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, #10b981 0%, #047857 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: var(--font-display);
            font-weight: 900;
            font-size: 22px;
            box-shadow: 0 8px 16px var(--primary-glow);
        }

        .brand-titles h1 {
            font-family: var(--font-display);
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.02em;
            line-height: 1.1;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .brand-titles h1 span {
            color: var(--primary);
        }

        .brand-sub {
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .header-stats {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 12px;
            color: var(--text-secondary);
        }

        @media (max-width: 768px) {
            .header-stats { display: none; }
        }

        .stat-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            padding: 6px 12px;
            border-radius: 9999px;
            font-weight: 600;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: var(--bg-surface);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
        }

        .btn-icon:hover {
            border-color: var(--primary);
            background: var(--primary-glow);
            transform: translateY(-2px);
        }

        .btn-cta-store {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            font-family: var(--font-display);
            font-size: 13px;
            font-weight: 700;
            padding: 9px 18px;
            border-radius: 9999px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 14px var(--primary-glow);
            transition: all 0.2s;
        }

        .btn-cta-store:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 22px var(--primary-glow);
        }

        /* --- CATEGORIES NAV --- */
        .category-nav {
            max-width: 1300px;
            margin: 0 auto;
            padding: 0 24px 12px 24px;
            display: flex;
            align-items: center;
            gap: 8px;
            overflow-x: auto;
            scrollbar-width: none;
        }

        .category-nav::-webkit-scrollbar { display: none; }

        .cat-pill {
            font-size: 13px;
            font-weight: 600;
            padding: 6px 14px;
            border-radius: 9999px;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s;
        }

        .cat-pill:hover, .cat-pill.active {
            background: var(--primary);
            color: #ffffff;
            border-color: var(--primary);
            box-shadow: 0 4px 12px var(--primary-glow);
        }

        /* --- HERO CONTAINER --- */
        .container {
            max-width: 1300px;
            margin: 0 auto;
            padding: 30px 24px;
        }

        .hero-layout {
            display: grid;
            grid-template-columns: 2fr 1.1fr;
            gap: 28px;
            margin-bottom: 40px;
        }

        @media (max-width: 1024px) {
            .hero-layout { grid-template-columns: 1fr; }
        }

        /* PRIMARY HERO CARD */
        .hero-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 24px;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            min-height: 480px;
            transition: transform 0.3s, border-color 0.3s;
        }

        .hero-card:hover {
            transform: translateY(-4px);
            border-color: var(--border-glow);
        }

        .hero-card-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
            transition: transform 0.6s ease;
        }

        .hero-card:hover .hero-card-img {
            transform: scale(1.04);
        }

        .hero-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(6, 13, 9, 0.1) 0%, rgba(6, 13, 9, 0.7) 40%, rgba(6, 13, 9, 0.98) 100%);
            z-index: 2;
        }

        .hero-content {
            position: relative;
            z-index: 3;
            padding: 36px;
            color: #ffffff;
        }

        .hero-meta-top {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
        }

        .badge-cat {
            background: var(--primary);
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 4px 10px;
            border-radius: 6px;
        }

        .hero-reading {
            font-size: 12px;
            color: #94a3b8;
            font-weight: 500;
        }

        .hero-title {
            font-family: var(--font-display);
            font-size: 32px;
            font-weight: 900;
            line-height: 1.2;
            margin-bottom: 14px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        @media (max-width: 640px) {
            .hero-title { font-size: 24px; }
        }

        .hero-excerpt {
            font-size: 15px;
            color: #cbd5e1;
            margin-bottom: 22px;
            max-width: 90%;
            line-height: 1.5;
        }

        .hero-actions-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding-top: 18px;
        }

        .hero-author {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .author-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 2px solid var(--primary);
            background: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }

        .author-info {
            font-size: 12px;
        }

        .author-name {
            font-weight: 700;
            color: #ffffff;
        }

        .author-role {
            color: #94a3b8;
        }

        .btn-audio-player {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            padding: 8px 14px;
            border-radius: 9999px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-audio-player:hover {
            background: var(--primary);
            border-color: var(--primary);
        }

        /* RADAR SIDEBAR */
        .radar-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 24px;
            box-shadow: var(--shadow-md);
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .radar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
            padding-bottom: 14px;
        }

        .radar-title {
            font-family: var(--font-display);
            font-size: 18px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .live-tag {
            background: rgba(239, 68, 68, 0.15);
            color: var(--accent-red);
            border: 1px solid rgba(239, 68, 68, 0.3);
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 9999px;
            letter-spacing: 0.05em;
        }

        .radar-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .radar-item {
            display: flex;
            gap: 14px;
            padding-bottom: 14px;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
        }

        .radar-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .radar-num {
            font-family: var(--font-display);
            font-size: 24px;
            font-weight: 900;
            color: var(--primary);
            line-height: 1;
            width: 28px;
            flex-shrink: 0;
        }

        .radar-body h4 {
            font-size: 14px;
            font-weight: 700;
            line-height: 1.35;
            margin-bottom: 6px;
        }

        .radar-body h4:hover {
            color: var(--primary);
        }

        .radar-meta {
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* --- SECTION GRID --- */
        .section-title-wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }

        .section-heading {
            font-family: var(--font-display);
            font-size: 22px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-heading::before {
            content: '';
            width: 4px;
            height: 20px;
            background: var(--primary);
            border-radius: 2px;
        }

        .articles-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-bottom: 48px;
        }

        @media (max-width: 900px) {
            .articles-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 600px) {
            .articles-grid { grid-template-columns: 1fr; }
        }

        .article-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
            transition: all 0.3s;
        }

        .article-card:hover {
            transform: translateY(-4px);
            border-color: var(--border-glow);
            box-shadow: var(--shadow-md);
        }

        .card-thumb-wrap {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #1e293b;
        }

        .card-thumb {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }

        .article-card:hover .card-thumb {
            transform: scale(1.06);
        }

        .card-badge-float {
            position: absolute;
            top: 12px;
            left: 12px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            padding: 4px 8px;
            border-radius: 6px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffffff;
            backdrop-filter: blur(4px);
        }

        .card-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            flex: 1;
            justify-content: space-between;
        }

        .card-title {
            font-family: var(--font-display);
            font-size: 18px;
            font-weight: 800;
            line-height: 1.3;
            margin-bottom: 10px;
        }

        .card-title:hover {
            color: var(--primary);
        }

        .card-excerpt {
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin-bottom: 16px;
        }

        .card-footer {
            border-top: 1px solid var(--border);
            padding-top: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-muted);
        }

        .card-author-snippet {
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 600;
        }

        .card-reactions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .reaction-btn {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            padding: 3px 8px;
            border-radius: 9999px;
            cursor: pointer;
            font-size: 11px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--text-secondary);
        }

        .reaction-btn:hover {
            border-color: var(--primary);
            color: var(--primary);
        }

        /* --- LUXURY GUMESMOMO BANNER --- */
        .gumesmomo-banner {
            background: linear-gradient(135deg, #064e3b 0%, #022c22 50%, #061f18 100%);
            border: 1px solid rgba(16, 185, 129, 0.4);
            border-radius: 28px;
            padding: 40px;
            margin-bottom: 48px;
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 32px;
            align-items: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(6, 78, 59, 0.35);
        }

        @media (max-width: 900px) {
            .gumesmomo-banner { grid-template-columns: 1fr; padding: 28px; }
        }

        .gumesmomo-info h3 {
            font-family: var(--font-display);
            font-size: 32px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.15;
            margin-bottom: 14px;
        }

        .gumesmomo-info h3 span {
            color: #34d399;
        }

        .gumesmomo-desc {
            font-size: 15px;
            color: #a7f3d0;
            margin-bottom: 22px;
            line-height: 1.6;
        }

        .pill-features {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 26px;
        }

        .feat-pill {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            padding: 6px 14px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .gumesmomo-img-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .gumesmomo-img {
            max-width: 320px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
            border: 2px solid rgba(52, 211, 153, 0.4);
            transform: rotate(-2deg);
            transition: transform 0.4s ease;
        }

        .gumesmomo-banner:hover .gumesmomo-img {
            transform: rotate(0deg) scale(1.03);
        }

        /* --- FLOATING GHOST STUDIO BAR --- */
        .ghost-dock {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99;
            background: rgba(10, 22, 16, 0.9);
            border: 1px solid var(--primary);
            backdrop-filter: blur(14px);
            padding: 10px 18px;
            border-radius: 9999px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px var(--primary-glow);
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .ghost-status-dot {
            width: 9px;
            height: 9px;
            background: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 10px #10b981;
            animation: pulse-dot 1.5s infinite;
        }

        .ghost-dock-title {
            font-family: var(--font-display);
            font-size: 13px;
            font-weight: 800;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .ghost-dock-links {
            display: flex;
            align-items: center;
            gap: 8px;
            border-left: 1px solid rgba(255,255,255,0.2);
            padding-left: 12px;
        }

        .ghost-dock-btn {
            background: rgba(255,255,255,0.12);
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 9999px;
            transition: all 0.2s;
        }

        .ghost-dock-btn:hover {
            background: var(--primary);
            color: #ffffff;
        }

        /* --- SEARCH MODAL SPOTLIGHT --- */
        .search-modal {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 100;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            align-items: flex-start;
            justify-content: center;
            padding-top: 100px;
        }

        .search-modal.active {
            display: flex;
        }

        .search-box {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            width: 90%;
            max-width: 620px;
            box-shadow: var(--shadow-lg);
            overflow: hidden;
        }

        .search-input-wrap {
            display: flex;
            align-items: center;
            padding: 18px 24px;
            border-bottom: 1px solid var(--border);
            gap: 12px;
        }

        .search-input {
            width: 100%;
            background: transparent;
            border: none;
            outline: none;
            font-size: 16px;
            color: var(--text-primary);
            font-family: var(--font-body);
        }

        .search-results {
            max-height: 380px;
            overflow-y: auto;
            padding: 12px;
        }

        .search-item {
            padding: 12px 16px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: background 0.15s;
        }

        .search-item:hover {
            background: var(--primary-glow);
        }

        /* --- FOOTER --- */
        .site-footer {
            background: var(--bg-surface);
            border-top: 1px solid var(--border);
            padding: 60px 24px 30px 24px;
            margin-top: 60px;
        }

        .footer-grid {
            max-width: 1300px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1.5fr;
            gap: 40px;
            margin-bottom: 40px;
        }

        @media (max-width: 900px) {
            .footer-grid { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 600px) {
            .footer-grid { grid-template-columns: 1fr; }
        }

        .footer-col h4 {
            font-family: var(--font-display);
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 18px;
            color: var(--text-primary);
        }

        .footer-links {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 13px;
            color: var(--text-secondary);
        }

        .footer-links a:hover {
            color: var(--primary);
        }

        .newsletter-box {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .newsletter-input {
            flex: 1;
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: var(--bg-body);
            color: var(--text-primary);
            font-size: 13px;
            outline: none;
        }

        .newsletter-btn {
            background: var(--primary);
            color: #ffffff;
            border: none;
            padding: 10px 16px;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
        }

        .footer-bottom {
            max-width: 1300px;
            margin: 0 auto;
            border-top: 1px solid var(--border);
            padding-top: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-muted);
            flex-wrap: wrap;
            gap: 12px;
        }
    </style>
</head>
<body>

    <!-- TOP BREAKING NEWS MARQUEE -->
    <div class="ticker-bar">
        <div class="ticker-badge">URGENTE</div>
        <div class="ticker-marquee">
            <div class="ticker-items">
                <div class="ticker-item"><span class="ticker-tag">AGRO</span> Safra de Soja em Mato Grosso supera previsões e atinge 45 milhões de toneladas</div>
                <div class="ticker-item"><span class="ticker-tag">FITNESS</span> Gumesmomo Fit lança gomas de creatina pura sem açúcar com frete grátis</div>
                <div class="ticker-item"><span class="ticker-tag">IA & SAAS</span> Comenta AI integra modelos de decisão ultrarrápidos TypeSafe Jev no WhatsApp</div>
                <div class="ticker-item"><span class="ticker-tag">CIDADES</span> Geomonitoramento de Várzea Grande e Cuiabá registra índice recorde de fluxo</div>
                <div class="ticker-item"><span class="ticker-tag">GHOST CMS</span> Portal Hoje MT atualizado com suporte completo a Content API v5.8</div>
            </div>
        </div>
        <div class="ticker-market">
            <span>SOJA MT: <strong>R$ 138,50</strong> 🟢</span>
            <span>DÓLAR: <strong>R$ 5,42</strong> 🔴</span>
            <span>BOI GORDO: <strong>R$ 245,00</strong> 🟢</span>
        </div>
    </div>

    <!-- SITE HEADER -->
    <header class="site-header">
        <div class="header-top">
            <div class="brand-wrap">
                <div class="brand-logo">H</div>
                <div class="brand-titles">
                    <h1>HOJE MT <span>NEWS</span></h1>
                    <div class="brand-sub">Redação Digital • Ghost CMS 2.0</div>
                </div>
            </div>

            <div class="header-stats">
                <div class="stat-pill">📍 Cuiabá / Várzea Grande • 33°C ☀️</div>
                <div class="stat-pill">⏱️ Atualizado há 2 min</div>
            </div>

            <div class="header-actions">
                <button class="btn-icon" id="btn-search" title="Buscar notícias (Cmd + K)">🔍</button>
                <button class="btn-icon" id="btn-theme" title="Alternar tema claro/escuro">🌓</button>
                <a href="/gumesmomo" class="btn-cta-store">🍬 Gumesmomo Fit</a>
                <a href="http://localhost:3000/" class="btn-icon" title="Voltar ao Comenta AI">💬</a>
            </div>
        </div>

        <!-- CATEGORY NAVIGATION PILLS -->
        <nav class="category-nav">
            <button class="cat-pill active" data-cat="all">Todas as Notícias</button>
            <button class="cat-pill" data-cat="agro">🌱 Agro & Negócios</button>
            <button class="cat-pill" data-cat="tech">🤖 IA & Tecnologia</button>
            <button class="cat-pill" data-cat="saude">🍬 Saúde & Fitness</button>
            <button class="cat-pill" data-cat="politica">🏛️ Política MT</button>
            <button class="cat-pill" data-cat="cidades">🗺️ Geomonitoramento</button>
            <button class="cat-pill" data-cat="ghost">👻 Ghost Studio</button>
        </nav>
    </header>

    <!-- MAIN EDITORIAL CONTENT -->
    <main class="container">
        
        <!-- HERO SHOWCASE ROW -->
        <section class="hero-layout">
            <!-- FEATURED EDITORIAL LEAD -->
            <article class="hero-card" id="main-feature">
                <img class="hero-card-img" src="/images/gumesmomo_jar.jpg" alt="Gumesmomo Fit Creatine Gummies" />
                <div class="hero-overlay"></div>
                
                <div class="hero-content">
                    <div class="hero-meta-top">
                        <span class="badge-cat">DESTAQUE EXCLUSIVO</span>
                        <span class="hero-reading">📖 4 min de leitura</span>
                    </div>

                    <h2 class="hero-title">
                        Gumesmomo Fit Revoluciona Suplementação no Brasil com Gomas de Creatina Monohidratada Sem Açúcar
                    </h2>

                    <p class="hero-excerpt">
                        Desenvolvida com padrão farmacêutico, a fórmula entrega 3g de creatina pura por porção sem necessidade de água ou coqueteleira. Produto ganha destaque em clínicas de nutrição e academias de Cuiabá e São Paulo.
                    </p>

                    <div class="hero-actions-bar">
                        <div class="hero-author">
                            <div class="author-avatar">👨‍⚕️</div>
                            <div class="author-info">
                                <div class="author-name">Dr. Gabriel Santos</div>
                                <div class="author-role">Nutrologia Esportiva • Redação Hoje MT</div>
                            </div>
                        </div>

                        <button class="btn-audio-player" onclick="playAudioBriefing()">
                            <span>▶</span> Ouvir Resumo em 1 min (Sofia IA)
                        </button>
                    </div>
                </div>
            </article>

            <!-- RADAR TRENDING SIDEBAR -->
            <aside class="radar-card">
                <div class="radar-header">
                    <div class="radar-title">🔥 Mais Lidas Agora</div>
                    <span class="live-tag">TEMPO REAL</span>
                </div>

                <div class="radar-list">
                    <div class="radar-item" onclick="window.location.href='/blog'">
                        <div class="radar-num">01</div>
                        <div class="radar-body">
                            <h4>Comenta AI Lança Agente Multicanal Sofia 2.0 com Gemini e TypeSafe Jev</h4>
                            <div class="radar-meta"><span>IA & Negócios</span> • <span>👁️ 18.4k</span></div>
                        </div>
                    </div>

                    <div class="radar-item" onclick="window.location.href='/gumesmomo'">
                        <div class="radar-num">02</div>
                        <div class="radar-body">
                            <h4>Kit Duplo de Creatina em Goma Oferece Frete Grátis e 10% no PIX</h4>
                            <div class="radar-meta"><span>Fitness</span> • <span>👁️ 14.1k</span></div>
                        </div>
                    </div>

                    <div class="radar-item" onclick="window.location.href='/mapa-varzea-grande.html'">
                        <div class="radar-num">03</div>
                        <div class="radar-body">
                            <h4>Painel de Geomonitoramento de Várzea Grande Mapeia 100% dos Bairros</h4>
                            <div class="radar-meta"><span>Cidades</span> • <span>👁️ 9.7k</span></div>
                        </div>
                    </div>

                    <div class="radar-item" onclick="window.location.href='/ghost/'">
                        <div class="radar-num">04</div>
                        <div class="radar-body">
                            <h4>Ghost CMS 2.0: Integração com Oracle Cloud e Nginx HTTP/2 em Produção</h4>
                            <div class="radar-meta"><span>DevOps</span> • <span>👁️ 7.2k</span></div>
                        </div>
                    </div>
                </div>
            </aside>
        </section>

        <!-- LUXURY GUMESMOMO BANNER -->
        <section class="gumesmomo-banner">
            <div class="gumesmomo-info">
                <span class="badge-cat" style="background:#047857;">NUTRIÇÃO ESPORTIVA DE ELITE</span>
                <h3 style="margin-top: 10px;">Experimente <span>Gumesmomo Fit</span> em Gomas</h3>
                <p class="gumesmomo-desc">
                    Chega de pó empelotado e coqueteleiras sujas. Leve 3g de Creatina Creapure pura com sabor irresistível de Frutas Vermelhas para qualquer lugar.
                </p>
                <div class="pill-features">
                    <div class="feat-pill">✓ 3g Creatina Pura</div>
                    <div class="feat-pill">✓ Zero Açúcar & Glúten</div>
                    <div class="feat-pill">✓ Absorção Imediata</div>
                    <div class="feat-pill">✓ Sabor Frutas Vermelhas</div>
                </div>
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    <a href="/gumesmomo" class="btn-cta-store" style="font-size:14px; padding:12px 24px;">🛒 Escolha seu Kit com Desconto</a>
                    <a href="https://wa.me/5511999999999?text=Quero%20comprar%20Gumesmomo%20Fit" target="_blank" class="btn-audio-player">📱 Comprar via WhatsApp</a>
                </div>
            </div>
            <div class="gumesmomo-img-wrap">
                <img class="gumesmomo-img" src="/images/gumesmomo_hand.jpg" alt="Gomas Gumesmomo na mão" />
            </div>
        </section>

        <!-- EDITORIAL CARD GRID -->
        <section>
            <div class="section-title-wrap">
                <h3 class="section-heading">Caderno Editorial & Análises</h3>
                <span style="font-size: 13px; color: var(--text-muted);">Mostrando todas as editorias</span>
            </div>

            <div class="articles-grid" id="articles-container">
                <!-- ARTIGO 1 -->
                <article class="article-card" data-category="tech">
                    <div class="card-thumb-wrap">
                        <img class="card-thumb" src="/images/gumesmomo_jar.jpg" alt="IA e Atendimento" />
                        <span class="card-badge-float">TECNOLOGIA & IA</span>
                    </div>
                    <div class="card-body">
                        <div>
                            <h4 class="card-title">Atendente Virtual Sofia 2.0 Reduz Tempo de Espera para 8 Segundos</h4>
                            <p class="card-excerpt">Adoção de modelos System One da TypeSafe AI no WhatsApp elimina gargalos de suporte e automatiza fechamentos de vendas.</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-author-snippet">✍️ Engenharia Comenta</span>
                            <div class="card-reactions">
                                <button class="reaction-btn" onclick="reactArticle(this)">❤️ <span>142</span></button>
                                <button class="reaction-btn" onclick="shareArticle('Sofia IA 2.0')">🔗 Compartilhar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- ARTIGO 2 -->
                <article class="article-card" data-category="agro">
                    <div class="card-thumb-wrap">
                        <img class="card-thumb" src="/images/gumesmomo_hand.jpg" alt="Agro MT" />
                        <span class="card-badge-float">AGRONEGÓCIO</span>
                    </div>
                    <div class="card-body">
                        <div>
                            <h4 class="card-title">Mato Grosso Consolida Liderança Global na Exportação Sustentável de Grãos</h4>
                            <p class="card-excerpt">Tecnologias de sensoriamento remoto e inteligência artificial no campo elevam produtividade em 18% sem abertura de novas áreas.</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-author-snippet">✍️ Redação Agro MT</span>
                            <div class="card-reactions">
                                <button class="reaction-btn" onclick="reactArticle(this)">🌾 <span>98</span></button>
                                <button class="reaction-btn" onclick="shareArticle('Agro MT Sustentável')">🔗 Compartilhar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- ARTIGO 3 -->
                <article class="article-card" data-category="saude">
                    <div class="card-thumb-wrap">
                        <img class="card-thumb" src="/images/gumesmomo_jar.jpg" alt="Gumesmomo Fit" />
                        <span class="card-badge-float">SAÚDE & FITNESS</span>
                    </div>
                    <div class="card-body">
                        <div>
                            <h4 class="card-title">Creatina em Goma Monohidratada: Estudo Revela Maior Adesão aos Treinos</h4>
                            <p class="card-excerpt">Praticidade das gomas saborizadas supera em 3 vezes a retenção diária comparada aos pós tradicionais em atletas de alto rendimento.</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-author-snippet">✍️ Nutrição Esportiva</span>
                            <div class="card-reactions">
                                <button class="reaction-btn" onclick="reactArticle(this)">💪 <span>215</span></button>
                                <button class="reaction-btn" onclick="shareArticle('Estudo Creatina Goma')">🔗 Compartilhar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- ARTIGO 4 -->
                <article class="article-card" data-category="cidades">
                    <div class="card-thumb-wrap">
                        <img class="card-thumb" src="/images/gumesmomo_hand.jpg" alt="Geomonitoramento" />
                        <span class="card-badge-float">CIDADES INTELIGENTES</span>
                    </div>
                    <div class="card-body">
                        <div>
                            <h4 class="card-title">Cidades de Mato Grosso Investem em Sensores IoT e Georreferenciamento</h4>
                            <p class="card-excerpt">Várzea Grande e Cuiabá implementam malhas de monitoramento urbano que aceleram atendimentos de saúde e serviços públicos.</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-author-snippet">✍️ Urbanismo Hoje MT</span>
                            <div class="card-reactions">
                                <button class="reaction-btn" onclick="reactArticle(this)">🗺️ <span>76</span></button>
                                <button class="reaction-btn" onclick="shareArticle('Cidades Inteligentes MT')">🔗 Compartilhar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- ARTIGO 5 -->
                <article class="article-card" data-category="ghost">
                    <div class="card-thumb-wrap">
                        <img class="card-thumb" src="/images/gumesmomo_jar.jpg" alt="Ghost CMS" />
                        <span class="card-badge-float">GHOST CMS STUDIO</span>
                    </div>
                    <div class="card-body">
                        <div>
                            <h4 class="card-title">Arquitetura Ghost Headless com Next.js: Alta Performance e Zero Cache Miss</h4>
                            <p class="card-excerpt">Combinação de Ghost v5 Content API e Turbopack no Next.js garante carregamentos abaixo de 100 milissegundos para milhões de acessos.</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-author-snippet">✍️ Tech Blog</span>
                            <div class="card-reactions">
                                <button class="reaction-btn" onclick="reactArticle(this)">⚡ <span>188</span></button>
                                <button class="reaction-btn" onclick="shareArticle('Ghost Headless Architecture')">🔗 Compartilhar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- ARTIGO 6 -->
                <article class="article-card" data-category="politica">
                    <div class="card-thumb-wrap">
                        <img class="card-thumb" src="/images/gumesmomo_hand.jpg" alt="Política MT" />
                        <span class="card-badge-float">POLÍTICA & ECONOMIA</span>
                    </div>
                    <div class="card-body">
                        <div>
                            <h4 class="card-title">Assembleia Legislativa Aprova Incentivos Tributários para Startups de Tecnologia</h4>
                            <p class="card-excerpt">Novo marco legal projeta atração de mais de R$ 500 milhões em investimentos para empresas de software e IA no estado.</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-author-snippet">✍️ Redação Política</span>
                            <div class="card-reactions">
                                <button class="reaction-btn" onclick="reactArticle(this)">🏛️ <span>64</span></button>
                                <button class="reaction-btn" onclick="shareArticle('Incentivo Startups MT')">🔗 Compartilhar</button>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    </main>

    <!-- FLOATING GHOST CMS STUDIO BAR -->
    <aside class="ghost-dock">
        <div class="ghost-status-dot"></div>
        <div class="ghost-dock-title">👻 Ghost CMS v5.8</div>
        <div class="ghost-dock-links">
            <a href="/ghost" class="ghost-dock-btn">Admin</a>
            <a href="/gumesmomo" class="ghost-dock-btn">Loja</a>
            <a href="http://localhost:3000/" class="ghost-dock-btn">Comenta AI</a>
        </div>
    </aside>

    <!-- SPOTLIGHT SEARCH MODAL -->
    <div class="search-modal" id="search-modal">
        <div class="search-box">
            <div class="search-input-wrap">
                <span>🔍</span>
                <input type="text" class="search-input" id="search-input" placeholder="Buscar artigos, temas ou notícias (pressione ESC para fechar)..." />
                <button onclick="toggleSearch(false)" style="background:none; border:none; cursor:pointer; font-size:16px;">✕</button>
            </div>
            <div class="search-results" id="search-results">
                <div class="search-item" onclick="window.location.href='/gumesmomo'">
                    <div>
                        <strong>Gumesmomo Fit</strong> — Gomas de Creatina sem açúcar
                        <div style="font-size:11px; color:var(--text-muted);">Saúde & Fitness</div>
                    </div>
                    <span>➔</span>
                </div>
                <div class="search-item" onclick="window.location.href='/blog'">
                    <div>
                        <strong>Comenta AI</strong> — Atendente virtual Sofia 2.0 multicanal
                        <div style="font-size:11px; color:var(--text-muted);">Tecnologia & IA</div>
                    </div>
                    <span>➔</span>
                </div>
                <div class="search-item" onclick="window.location.href='/ghost'">
                    <div>
                        <strong>Ghost Admin</strong> — Painel de Gestão Editorial
                        <div style="font-size:11px; color:var(--text-muted);">CMS & Sistema</div>
                    </div>
                    <span>➔</span>
                </div>
            </div>
        </div>
    </div>

    <!-- SITE FOOTER -->
    <footer class="site-footer">
        <div class="footer-grid">
            <div class="footer-col">
                <div class="brand-titles" style="margin-bottom: 12px;">
                    <h2 style="font-family: var(--font-display); font-size: 20px; font-weight: 900;">HOJE MT <span style="color:var(--primary)">NEWS</span></h2>
                </div>
                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                    Portal editorial oficial com tecnologia Ghost CMS 2.0 e integração ao ecossistema de software Comenta AI e Gumesmomo Fit.
                </p>
            </div>

            <div class="footer-col">
                <h4>Editorias</h4>
                <ul class="footer-links">
                    <li><a href="#" onclick="filterCategory('agro')">Agro & Negócios</a></li>
                    <li><a href="#" onclick="filterCategory('tech')">IA & Tecnologia</a></li>
                    <li><a href="#" onclick="filterCategory('saude')">Saúde & Fitness</a></li>
                    <li><a href="#" onclick="filterCategory('politica')">Política MT</a></li>
                </ul>
            </div>

            <div class="footer-col">
                <h4>Ecossistema</h4>
                <ul class="footer-links">
                    <li><a href="/gumesmomo">Gumesmomo Fit (Creatina)</a></li>
                    <li><a href="http://localhost:3000/">Comenta AI Multicanal</a></li>
                    <li><a href="http://localhost:5173/">Painel do Atendente</a></li>
                    <li><a href="/ghost">Ghost CMS Admin</a></li>
                </ul>
            </div>

            <div class="footer-col">
                <h4>Boletim Hoje MT</h4>
                <p style="font-size: 13px; color: var(--text-secondary);">Receba o resumo matinal com as principais notícias de MT direto no seu e-mail.</p>
                <form class="newsletter-box" onsubmit="subscribeNewsletter(event)">
                    <input type="email" class="newsletter-input" id="news-email" placeholder="seu@email.com" required />
                    <button type="submit" class="newsletter-btn">Inscrever</button>
                </form>
            </div>
        </div>

        <div class="footer-bottom">
            <span>© 2026 HOJE MT NEWS • Todos os direitos reservados.</span>
            <span>Ghost CMS v5.8 • Servidor Local Ativo na Porta 2368</span>
        </div>
    </footer>

    <!-- INTERACTIVE SCRIPTS -->
    <script>
        // THEME TOGGLE
        const themeBtn = document.getElementById('btn-theme');
        function initTheme() {
            const saved = localStorage.getItem('hojemt_theme') || 'dark';
            document.documentElement.setAttribute('data-theme', saved);
        }
        themeBtn.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('hojemt_theme', next);
        });
        initTheme();

        // SPOTLIGHT SEARCH
        const searchModal = document.getElementById('search-modal');
        const searchInput = document.getElementById('search-input');
        function toggleSearch(show) {
            searchModal.classList.toggle('active', show);
            if (show) searchInput.focus();
        }
        document.getElementById('btn-search').addEventListener('click', () => toggleSearch(true));
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearch(true);
            }
            if (e.key === 'Escape') toggleSearch(false);
        });

        // CATEGORY FILTER
        const catButtons = document.querySelectorAll('.cat-pill');
        const articleCards = document.querySelectorAll('.article-card');

        function filterCategory(cat) {
            catButtons.forEach(btn => {
                if (btn.dataset.cat === cat) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            articleCards.forEach(card => {
                if (cat === 'all' || card.dataset.category === cat) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterCategory(btn.dataset.cat);
            });
        });

        // REACTION COUNTER
        function reactArticle(btn) {
            const span = btn.querySelector('span');
            let count = parseInt(span.innerText);
            count += 1;
            span.innerText = count;
            btn.style.borderColor = 'var(--primary)';
            btn.style.color = 'var(--primary)';
        }

        // SHARE ARTICLE
        function shareArticle(title) {
            const shareUrl = window.location.href;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl);
                alert('Link da reportagem copiado para a área de transferência: ' + title);
            }
        }

        // AUDIO BRIEFING DEMO
        function playAudioBriefing() {
            alert('🎙️ Reproduzindo resumo de 1 minuto gerado por IA Sofia: "Olá leitor do Hoje MT, a novidade de hoje é o lançamento da creatina em gomas Gumesmomo Fit..."');
        }

        // NEWSLETTER SUBMIT
        function subscribeNewsletter(e) {
            e.preventDefault();
            const email = document.getElementById('news-email').value;
            alert('🎉 Obrigado! O e-mail ' + email + ' foi inscrito no Boletim Diário do Hoje MT.');
            document.getElementById('news-email').value = '';
        }
    </script>
</body>
</html>`;
}

function renderGumesmomoStoreHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GUMESMOMO FIT — Gomas de Creatina Pura Sem Açúcar</title>
    <meta name="description" content="A revolução da suplementação: 3g de Creatina pura em gomas deliciosas sabor Frutas Vermelhas. Zero Açúcar." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

    <style>
        :root {
            --bg: #05140d;
            --surface: #0a2417;
            --card: #0e3020;
            --primary: #10b981;
            --primary-glow: rgba(16, 185, 129, 0.4);
            --text: #f0fdf4;
            --muted: #a7f3d0;
            --border: #1a4d34;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: var(--bg); color: var(--text); line-height: 1.6; }
        header { background: rgba(10, 36, 23, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 18px 32px; display: flex; align-items: center; justify-content: space-between; sticky: top; }
        .brand { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px; }
        .brand span { color: var(--primary); }
        .hero { max-width: 1200px; margin: 40px auto; padding: 0 24px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; align-items: center; }
        @media (max-width: 900px) { .hero { grid-template-columns: 1fr; } }
        h1 { font-family: 'Outfit', sans-serif; font-size: 42px; font-weight: 900; line-height: 1.15; color: #fff; margin-bottom: 16px; }
        h1 span { color: var(--primary); }
        p.subtitle { font-size: 16px; color: var(--muted); margin-bottom: 24px; }
        .badge { display: inline-block; background: var(--primary); color: #05140d; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 12px; }
        .kits { max-width: 1200px; margin: 60px auto; padding: 0 24px; }
        .kits-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 900px) { .kits-grid { grid-template-columns: 1fr; } }
        .kit-card { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s; position: relative; }
        .kit-card:hover { transform: translateY(-6px); border-color: var(--primary); box-shadow: 0 16px 36px var(--primary-glow); }
        .kit-card.popular { border-color: var(--primary); background: linear-gradient(180deg, #0e3523 0%, #092015 100%); }
        .popular-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #f59e0b; color: #000; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 999px; }
        .price { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 900; color: #fff; margin: 16px 0; }
        .price span { font-size: 14px; color: var(--muted); font-weight: 500; }
        .btn-buy { background: var(--primary); color: #05140d; font-weight: 800; text-align: center; padding: 14px; border-radius: 14px; text-decoration: none; display: block; margin-top: 20px; transition: all 0.2s; }
        .btn-buy:hover { background: #34d399; transform: scale(1.02); }
        .img-box img { width: 100%; border-radius: 20px; border: 2px solid var(--border); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    </style>
</head>
<body>
    <header>
        <div class="brand">🍬 GUMESMOMO <span>FIT</span></div>
        <div style="display: flex; gap: 12px;">
            <a href="/" style="color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 999px; background: rgba(255,255,255,0.1);">← Voltar ao Portal</a>
            <a href="http://localhost:3000/" style="color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 999px; background: rgba(255,255,255,0.1);">💬 Comenta AI</a>
        </div>
    </header>

    <section class="hero">
        <div>
            <span class="badge">🔥 NOVIDADE DO MERCADO FIT</span>
            <h1>Creatina em Gomas: <span>3g Pura</span>, Zero Açúcar e Sabor Real.</h1>
            <p class="subtitle">Sem pó. Sem coqueteleira. Apenas abra, mastigue 2 gomas de Frutas Vermelhas e potencialize sua força, recuperação muscular e foco cognitivo.</p>
            <a href="#combos" class="btn-buy" style="max-width: 240px;">Ver Ofertas Especiais</a>
        </div>
        <div class="img-box">
            <img src="/images/gumesmomo_jar.jpg" alt="Pote Gumesmomo Creatina" />
        </div>
    </section>

    <section class="kits" id="combos">
        <h2 style="font-family: 'Outfit'; font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 36px;">Escolha seu Tratamento Gumesmomo</h2>
        <div class="kits-grid">
            <div class="kit-card">
                <div>
                    <h3 style="font-size:20px; font-weight:800;">1 Pote (60 Gomas)</h3>
                    <p style="color:var(--muted); font-size:13px;">30 dias de uso contínuo</p>
                    <div class="price">R$ 89,90 <span>/ pote</span></div>
                    <p style="font-size:13px; color:#cbd5e1;">✓ 3g de Creatina por porção<br>✓ Sabor Frutas Vermelhas<br>✓ Zero Açúcar</p>
                </div>
                <a href="https://wa.me/5511999999999?text=Quero%20comprar%201%20pote%20Gumesmomo" target="_blank" class="btn-buy">Comprar 1 Pote</a>
            </div>

            <div class="kit-card popular">
                <span class="popular-badge">Mais Vendido 🔥</span>
                <div>
                    <h3 style="font-size:20px; font-weight:800;">Kit Duplo (120 Gomas)</h3>
                    <p style="color:var(--muted); font-size:13px;">60 dias + Frete Grátis Brasil</p>
                    <div class="price">R$ 159,90 <span>/ 2 potes</span></div>
                    <p style="font-size:13px; color:#cbd5e1;">✓ 3g de Creatina por porção<br>✓ 🚚 FRETE GRÁTIS INCLUSO<br>✓ 10% OFF no PIX (R$ 143,91)</p>
                </div>
                <a href="https://wa.me/5511999999999?text=Quero%20o%20Kit%20Duplo%20Gumesmomo%20com%20Frete%20Gratis" target="_blank" class="btn-buy">Comprar Kit Duplo</a>
            </div>

            <div class="kit-card">
                <div>
                    <h3 style="font-size:20px; font-weight:800;">Combo VIP (180 Gomas)</h3>
                    <p style="color:var(--muted); font-size:13px;">90 dias de Máxima Economia</p>
                    <div class="price">R$ 219,90 <span>/ 3 potes</span></div>
                    <p style="font-size:13px; color:#cbd5e1;">✓ Maior economia por goma<br>✓ 🚚 FRETE GRÁTIS INCLUSO<br>✓ Suporte VIP via WhatsApp</p>
                </div>
                <a href="https://wa.me/5511999999999?text=Quero%20o%20Combo%20VIP%203%20Potes%20Gumesmomo" target="_blank" class="btn-buy">Comprar Combo VIP</a>
            </div>
        </div>
    </section>
</body>
</html>`;
}

function renderGhostAdminPortalHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ghost Admin — HOJE MT NEWS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@600;800;900&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #070e0a; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #0c1a12; padding: 20px 32px; border-bottom: 2px solid #10b981; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-family: 'Outfit'; font-size: 22px; font-weight: 900; color: #fff; }
    .brand span { color: #10b981; }
    .badge { background: #10b981; color: #042f21; font-size: 11px; font-weight: 900; padding: 4px 12px; border-radius: 999px; }
    main { flex: 1; max-width: 960px; width: 100%; margin: 40px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #0f2218; border: 1px solid #183e2a; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
    h2 { font-family: 'Outfit'; margin-bottom: 12px; font-size: 20px; font-weight: 800; color: #fff; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
    .field { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 700; color: #a7f3d0; text-transform: uppercase; margin-bottom: 6px; }
    input { width: 100%; background: #06120b; border: 1px solid #23543b; border-radius: 10px; padding: 12px 14px; color: #fff; font-size: 14px; }
    input:focus { border-color: #10b981; outline: none; }
    .btn { display: inline-block; width: 100%; background: #10b981; color: #042f21; font-weight: 800; text-align: center; text-transform: uppercase; padding: 14px; border-radius: 12px; border: 0; cursor: pointer; transition: all 0.2s; }
    .btn:hover { background: #34d399; }
  </style>
</head>
<body>
  <header>
    <div class="brand">👻 GHOST <span>ADMIN 2.0</span></div>
    <span class="badge">SISTEMA ONLINE</span>
  </header>
  <main>
    <div class="grid">
      <div class="card">
        <h2>Painel Editorial</h2>
        <p>Acesso rápido ao gerenciador de conteúdos do Hoje MT News e publicação automatizada via Content API.</p>
        <form onsubmit="alert('Login efetuado no Ghost Admin!'); return false;">
          <div class="field">
            <label>E-mail de Acesso</label>
            <input type="email" value="admin@hojemt.com.br" required />
          </div>
          <div class="field">
            <label>Senha</label>
            <input type="password" value="••••••••••••" required />
          </div>
          <button type="submit" class="btn">Entrar no Ghost Studio</button>
        </form>
      </div>

      <div class="card">
        <h2>Status do Ghost CMS</h2>
        <p>Configuração do tema e rotas ativas no servidor local.</p>
        <div class="field">
          <label>Tema Ativo</label>
          <input type="text" value="hojemt (Editorial Obsidian & Emerald)" readonly />
        </div>
        <div class="field">
          <label>Content API Endpoint</label>
          <input type="text" value="http://localhost:2368/ghost/api/v5/content/" readonly />
        </div>
        <a href="/" class="btn" style="background:#1e3e2d; color:#a7f3d0; text-decoration:none;">Visualizar Portal Hoje MT</a>
      </div>
    </div>
  </main>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const reqUrl = req.url || "/";

  // Servir imagens estáticas de site/public/images/
  if (reqUrl.startsWith("/images/")) {
    const imgPath = path.join(__dirname, "..", "site", "public", reqUrl);
    if (fs.existsSync(imgPath)) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      return fs.createReadStream(imgPath).pipe(res);
    }
  }

  // Rota de Loja de Gomas de Creatina (/gumesmomo, /loja)
  if (reqUrl === "/gumesmomo" || reqUrl === "/loja" || reqUrl.startsWith("/gumesmomo/")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderGumesmomoStoreHTML());
  }

  // Rota de Admin do Ghost (/ghost, /ghost/, /ghost/setup)
  if (reqUrl.startsWith("/ghost")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderGhostAdminPortalHTML());
  }

  // Rota de API Mock do Ghost Content API
  if (reqUrl.startsWith("/ghost/api/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      version: "v5.8",
      status: "online",
      posts_count: 6,
      theme: "hojemt (Editorial Obsidian & Emerald)"
    }));
  }

  // Renderiza o site no Portal HOJE MT NEWS
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderHojeMtNewsPortalHTML());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`👻 Ghost Server running on port ${PORT} with Admin active`);
});
