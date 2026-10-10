import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 2368;

function renderMarketplaceHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Comenta Marketplace — Loja Oficial Gumesmomo & Cursos de IA</title>
    <meta name="description" content="Marketplace oficial: Gomas de Creatina Gumesmomo Fit, Cursos de IA no WhatsApp e Assinaturas da plataforma Comenta AI com Frete Grátis e Desconto no PIX." />
    
    <!-- GOOGLE FONTS -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />

    <style>
        :root {
            /* DARK MODE (DEFAULT MARKETPLACE OBSIDIAN) */
            --bg-page: #070b12;
            --bg-surface: #0d1522;
            --bg-card: #121c2c;
            --bg-card-hover: #172437;
            --border: #1e2e46;
            --border-highlight: rgba(16, 185, 129, 0.4);
            
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --text-muted: #64748b;
            
            --primary: #10b981;
            --primary-hover: #059669;
            --primary-glow: rgba(16, 185, 129, 0.3);
            
            --accent-orange: #f59e0b;
            --accent-rose: #f43f5e;
            --accent-cyan: #06b6d4;
            --accent-indigo: #6366f1;

            --nav-blur: rgba(13, 21, 34, 0.85);
            --shadow-card: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
            --shadow-hover: 0 20px 35px -5px rgba(0, 0, 0, 0.6);
            --font-head: 'Outfit', sans-serif;
            --font-body: 'Plus Jakarta Sans', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        [data-theme="light"] {
            /* LIGHT MODE (CLEAN MODERN STORE) */
            --bg-page: #f8fafc;
            --bg-surface: #ffffff;
            --bg-card: #ffffff;
            --bg-card-hover: #f1f5f9;
            --border: #e2e8f0;
            --border-highlight: rgba(16, 185, 129, 0.5);
            
            --text-main: #0f172a;
            --text-sub: #475569;
            --text-muted: #94a3b8;
            
            --primary: #059669;
            --primary-hover: #047857;
            --primary-glow: rgba(16, 185, 129, 0.2);
            
            --nav-blur: rgba(255, 255, 255, 0.88);
            --shadow-card: 0 8px 20px -4px rgba(15, 23, 42, 0.06);
            --shadow-hover: 0 16px 32px -4px rgba(15, 23, 42, 0.12);
        }

        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        body {
            font-family: var(--font-body);
            background-color: var(--bg-page);
            color: var(--text-main);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        a { color: inherit; text-decoration: none; }

        /* --- ANNOUNCEMENT TOP BAR --- */
        .top-promo {
            background: linear-gradient(90deg, #065f46 0%, #047857 50%, #0d9488 100%);
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            text-align: center;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            letter-spacing: 0.02em;
        }

        .promo-tag {
            background: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
        }

        /* --- STORE HEADER --- */
        .marketplace-header {
            position: sticky;
            top: 0;
            z-index: 50;
            background: var(--nav-blur);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--border);
        }

        .header-content {
            max-width: 1320px;
            margin: 0 auto;
            padding: 14px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }

        .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }

        .brand-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--primary) 0%, #047857 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            color: #fff;
            box-shadow: 0 4px 14px var(--primary-glow);
        }

        .brand-name {
            font-family: var(--font-head);
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.02em;
            line-height: 1.1;
        }

        .brand-name span {
            color: var(--primary);
        }

        .brand-badge {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 800;
            color: var(--text-muted);
            letter-spacing: 0.08em;
        }

        /* SEARCH BAR */
        .search-container {
            flex: 1;
            max-width: 520px;
            position: relative;
        }

        @media (max-width: 768px) {
            .search-container { display: none; }
        }

        .search-input-box {
            display: flex;
            align-items: center;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 999px;
            padding: 8px 16px;
            gap: 10px;
        }

        .search-input-box:focus-within {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
        }

        .search-input-box input {
            border: none;
            background: transparent;
            outline: none;
            color: var(--text-main);
            font-family: var(--font-body);
            font-size: 14px;
            width: 100%;
        }

        /* HEADER ACTIONS */
        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .btn-action {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
        }

        .btn-action:hover {
            border-color: var(--primary);
            background: var(--bg-card-hover);
        }

        .cart-btn {
            background: linear-gradient(135deg, var(--primary) 0%, #059669 100%);
            color: #ffffff;
            border: none;
            padding: 9px 18px;
            border-radius: 999px;
            font-family: var(--font-head);
            font-size: 14px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 4px 14px var(--primary-glow);
        }

        .cart-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px var(--primary-glow);
        }

        .cart-badge {
            background: #ffffff;
            color: #059669;
            border-radius: 999px;
            padding: 1px 7px;
            font-size: 12px;
            font-weight: 900;
        }

        /* --- CATEGORIES BAR --- */
        .category-stripe {
            border-bottom: 1px solid var(--border);
            background: var(--bg-surface);
        }

        .category-inner {
            max-width: 1320px;
            margin: 0 auto;
            padding: 10px 24px;
            display: flex;
            align-items: center;
            gap: 10px;
            overflow-x: auto;
            scrollbar-width: none;
        }

        .category-inner::-webkit-scrollbar { display: none; }

        .cat-chip {
            border: 1px solid var(--border);
            background: var(--bg-card);
            color: var(--text-sub);
            font-size: 13px;
            font-weight: 700;
            padding: 6px 16px;
            border-radius: 999px;
            white-space: nowrap;
            cursor: pointer;
        }

        .cat-chip:hover, .cat-chip.active {
            background: var(--primary);
            color: #ffffff;
            border-color: var(--primary);
            box-shadow: 0 2px 10px var(--primary-glow);
        }

        /* --- MAIN LAYOUT --- */
        .store-container {
            max-width: 1320px;
            margin: 0 auto;
            padding: 30px 24px;
        }

        /* SPOTLIGHT HERO DEAL */
        .spotlight-deal {
            background: linear-gradient(135deg, #091a13 0%, #0d271c 50%, #06150f 100%);
            border: 1px solid var(--border-highlight);
            border-radius: 28px;
            padding: 40px;
            margin-bottom: 48px;
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 40px;
            align-items: center;
            position: relative;
            overflow: hidden;
            box-shadow: var(--shadow-card);
        }

        @media (max-width: 960px) {
            .spotlight-deal { grid-template-columns: 1fr; padding: 24px; }
        }

        .spotlight-badge {
            background: var(--accent-orange);
            color: #000000;
            font-family: var(--font-head);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 4px 12px;
            border-radius: 999px;
            display: inline-block;
            margin-bottom: 12px;
        }

        .spotlight-title {
            font-family: var(--font-head);
            font-size: 38px;
            font-weight: 900;
            line-height: 1.15;
            color: #ffffff;
            margin-bottom: 14px;
        }

        .spotlight-title span {
            color: var(--primary);
        }

        .spotlight-desc {
            font-size: 15px;
            color: #a7f3d0;
            margin-bottom: 24px;
            line-height: 1.6;
        }

        .spotlight-pricing {
            display: flex;
            align-items: baseline;
            gap: 14px;
            margin-bottom: 24px;
        }

        .deal-price-current {
            font-family: var(--font-head);
            font-size: 42px;
            font-weight: 900;
            color: #ffffff;
        }

        .deal-price-old {
            font-size: 18px;
            color: #6ee7b7;
            text-decoration: line-through;
            opacity: 0.7;
        }

        .deal-pix-tag {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid #10b981;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 800;
        }

        .spotlight-buttons {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
        }

        .btn-buy-spotlight {
            background: var(--primary);
            color: #05140d;
            font-family: var(--font-head);
            font-size: 16px;
            font-weight: 900;
            padding: 14px 28px;
            border-radius: 14px;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .btn-buy-spotlight:hover {
            background: #34d399;
            transform: translateY(-2px);
            box-shadow: 0 10px 25px var(--primary-glow);
        }

        .spotlight-img-wrap {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .spotlight-img {
            max-width: 340px;
            width: 100%;
            border-radius: 24px;
            border: 2px solid rgba(16, 185, 129, 0.4);
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
            transform: rotate(-2deg);
        }

        .spotlight-img:hover {
            transform: rotate(0) scale(1.03);
        }

        /* --- TRUST BADGES BAR --- */
        .trust-strip {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 48px;
        }

        @media (max-width: 900px) {
            .trust-strip { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 500px) {
            .trust-strip { grid-template-columns: 1fr; }
        }

        .trust-item {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 18px;
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .trust-icon {
            font-size: 26px;
            background: var(--bg-surface);
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .trust-info h4 {
            font-family: var(--font-head);
            font-size: 14px;
            font-weight: 800;
        }

        .trust-info p {
            font-size: 12px;
            color: var(--text-muted);
        }

        /* --- SECTION HEADING --- */
        .catalog-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 28px;
            flex-wrap: wrap;
            gap: 14px;
        }

        .catalog-title {
            font-family: var(--font-head);
            font-size: 28px;
            font-weight: 900;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .catalog-title span {
            color: var(--primary);
        }

        .catalog-sort {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: var(--text-sub);
        }

        .catalog-sort select {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 8px 12px;
            border-radius: 8px;
            outline: none;
            font-weight: 600;
        }

        /* --- PRODUCTS GRID --- */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-bottom: 60px;
        }

        @media (max-width: 1024px) {
            .products-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
            .products-grid { grid-template-columns: 1fr; }
        }

        .product-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 22px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow-card);
            position: relative;
        }

        .product-card:hover {
            transform: translateY(-6px);
            border-color: var(--border-highlight);
            box-shadow: var(--shadow-hover);
        }

        .product-card.bestseller {
            border-color: rgba(245, 158, 11, 0.5);
        }

        .product-img-box {
            position: relative;
            width: 100%;
            height: 240px;
            background: #09121d;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .product-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
        }

        .product-card:hover .product-img {
            transform: scale(1.06);
        }

        .badge-discount {
            position: absolute;
            top: 14px;
            left: 14px;
            background: var(--accent-rose);
            color: #ffffff;
            font-family: var(--font-head);
            font-size: 11px;
            font-weight: 900;
            padding: 4px 10px;
            border-radius: 8px;
        }

        .badge-bestseller {
            position: absolute;
            top: 14px;
            right: 14px;
            background: var(--accent-orange);
            color: #000000;
            font-family: var(--font-head);
            font-size: 11px;
            font-weight: 900;
            padding: 4px 10px;
            border-radius: 8px;
        }

        .product-body {
            padding: 22px;
            display: flex;
            flex-direction: column;
            flex: 1;
            justify-content: space-between;
        }

        .product-cat-label {
            font-size: 11px;
            font-weight: 800;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
        }

        .product-name {
            font-family: var(--font-head);
            font-size: 18px;
            font-weight: 800;
            line-height: 1.3;
            margin-bottom: 8px;
            color: var(--text-main);
        }

        .product-rating {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--accent-orange);
            margin-bottom: 14px;
        }

        .product-rating span {
            color: var(--text-muted);
            font-size: 11px;
        }

        .product-bullets {
            list-style: none;
            font-size: 12px;
            color: var(--text-sub);
            margin-bottom: 18px;
            line-height: 1.7;
        }

        .product-bullets li::before {
            content: "✓ ";
            color: var(--primary);
            font-weight: 800;
        }

        .product-pricing-box {
            border-top: 1px solid var(--border);
            padding-top: 16px;
            margin-bottom: 18px;
        }

        .price-from {
            font-size: 12px;
            color: var(--text-muted);
            text-decoration: line-through;
        }

        .price-final {
            font-family: var(--font-head);
            font-size: 26px;
            font-weight: 900;
            color: var(--text-main);
        }

        .price-installments {
            font-size: 12px;
            color: var(--primary);
            font-weight: 700;
        }

        .product-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .btn-add-cart {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 11px;
            border-radius: 12px;
            font-family: var(--font-head);
            font-weight: 800;
            font-size: 13px;
            cursor: pointer;
            text-align: center;
        }

        .btn-add-cart:hover {
            border-color: var(--primary);
            background: var(--primary-glow);
            color: var(--primary);
        }

        .btn-buy-instant {
            background: var(--primary);
            border: 1px solid var(--primary);
            color: #05140d;
            padding: 11px;
            border-radius: 12px;
            font-family: var(--font-head);
            font-weight: 800;
            font-size: 13px;
            cursor: pointer;
            text-align: center;
        }

        .btn-buy-instant:hover {
            background: #34d399;
        }

        /* --- SLIDE OVER CART DRAWER --- */
        .cart-drawer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }

        .cart-drawer-overlay.open {
            opacity: 1;
            visibility: visible;
        }

        .cart-drawer {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            max-width: 440px;
            background: var(--bg-surface);
            border-left: 1px solid var(--border);
            z-index: 101;
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
            box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
        }

        .cart-drawer.open {
            transform: translateX(0);
        }

        .cart-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .cart-header h3 {
            font-family: var(--font-head);
            font-size: 20px;
            font-weight: 900;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cart-close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
        }

        .cart-body {
            padding: 20px 24px;
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .cart-item {
            display: flex;
            gap: 14px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 14px;
            align-items: center;
        }

        .cart-item-img {
            width: 64px;
            height: 64px;
            border-radius: 10px;
            object-fit: cover;
        }

        .cart-item-info {
            flex: 1;
        }

        .cart-item-title {
            font-family: var(--font-head);
            font-size: 14px;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 4px;
        }

        .cart-item-price {
            font-weight: 800;
            color: var(--primary);
            font-size: 14px;
        }

        .cart-item-qty {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 6px;
        }

        .qty-btn {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            border: 1px solid var(--border);
            background: var(--bg-surface);
            color: var(--text-main);
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .cart-footer {
            border-top: 1px solid var(--border);
            padding: 24px;
            background: var(--bg-card);
        }

        .cart-totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            margin-bottom: 8px;
            color: var(--text-sub);
        }

        .cart-total-final {
            display: flex;
            justify-content: space-between;
            font-family: var(--font-head);
            font-size: 22px;
            font-weight: 900;
            margin: 16px 0;
            color: var(--text-main);
        }

        .btn-checkout-wa {
            background: #25d366;
            color: #052e16;
            width: 100%;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-family: var(--font-head);
            font-size: 16px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);
        }

        .btn-checkout-wa:hover {
            background: #22c55e;
            transform: translateY(-2px);
        }

        /* --- REVIEWS CAROUSEL / GRID --- */
        .reviews-section {
            background: var(--bg-surface);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            padding: 60px 24px;
            margin-bottom: 40px;
        }

        .reviews-inner {
            max-width: 1320px;
            margin: 0 auto;
        }

        .reviews-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-top: 32px;
        }

        @media (max-width: 900px) {
            .reviews-grid { grid-template-columns: 1fr; }
        }

        .review-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 24px;
        }

        .review-stars {
            color: var(--accent-orange);
            font-size: 14px;
            margin-bottom: 12px;
        }

        .review-text {
            font-size: 14px;
            color: var(--text-sub);
            line-height: 1.6;
            margin-bottom: 16px;
        }

        .reviewer-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .reviewer-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
        }

        /* --- FOOTER --- */
        .marketplace-footer {
            background: var(--bg-surface);
            padding: 50px 24px 30px 24px;
            border-top: 1px solid var(--border);
        }

        .footer-grid {
            max-width: 1320px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }

        @media (max-width: 900px) {
            .footer-grid { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 500px) {
            .footer-grid { grid-template-columns: 1fr; }
        }

        .footer-grid h4 {
            font-family: var(--font-head);
            font-size: 15px;
            font-weight: 800;
            margin-bottom: 16px;
        }

        .footer-links {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 13px;
            color: var(--text-sub);
        }

        .footer-links a:hover {
            color: var(--primary);
        }

        .footer-bottom {
            max-width: 1320px;
            margin: 0 auto;
            border-top: 1px solid var(--border);
            padding-top: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: var(--text-muted);
            flex-wrap: wrap;
            gap: 10px;
        }
    </style>
</head>
<body>

    <!-- PROMOTIONAL TOP BAR -->
    <div class="top-promo">
        <span class="promo-tag">OFERTA ESPECIAL</span>
        <span>🚚 Frete Grátis para todo o Brasil + 10% OFF no PIX • Use o cupom <strong>PRIMEIRACOMPRA</strong></span>
    </div>

    <!-- MARKETPLACE HEADER -->
    <header class="marketplace-header">
        <div class="header-content">
            <!-- BRAND LOGO -->
            <div class="brand-box" onclick="window.scrollTo({top:0, behavior:'smooth'})">
                <div class="brand-icon">🛍️</div>
                <div>
                    <div class="brand-name">COMENTA <span>MARKET</span></div>
                    <div class="brand-badge">Loja Oficial & Suplementos</div>
                </div>
            </div>

            <!-- SEARCH BAR -->
            <div class="search-container">
                <div class="search-input-box">
                    <span>🔍</span>
                    <input type="text" id="store-search" placeholder="O que você está procurando? (Ex: Creatina, Curso IA, Plano Pro)..." oninput="handleSearch(this.value)" />
                </div>
            </div>

            <!-- ACTIONS -->
            <div class="header-actions">
                <button class="btn-action" id="btn-theme" title="Alternar tema">🌓</button>
                <a href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20os%20produtos" target="_blank" class="btn-action">💬 Suporte WhatsApp</a>
                <button class="cart-btn" onclick="toggleCartDrawer(true)">
                    🛒 Carrinho <span class="cart-badge" id="cart-counter">0</span>
                </button>
            </div>
        </div>

        <!-- CATEGORIES FILTER STRIPE -->
        <nav class="category-stripe">
            <div class="category-inner">
                <button class="cat-chip active" onclick="filterMarketCategory('all')">Todos os Produtos (6)</button>
                <button class="cat-chip" onclick="filterMarketCategory('gumesmomo')">🍬 Gumesmomo Fit (Creatina)</button>
                <button class="cat-chip" onclick="filterMarketCategory('cursos')">🎓 Cursos & Treinamentos de IA</button>
                <button class="cat-chip" onclick="filterMarketCategory('saas')">🤖 Softwares & Planos Comenta</button>
            </div>
        </nav>
    </header>

    <!-- MAIN MARKETPLACE CONTAINER -->
    <main class="store-container">

        <!-- SPOTLIGHT HERO DEAL -->
        <section class="spotlight-deal">
            <div class="spotlight-content">
                <span class="spotlight-badge">🔥 OFERTA RELÂMPAGO DO DIA</span>
                <h1 class="spotlight-title">Kit Duplo <span>Gumesmomo Fit</span> (120 Gomas de Creatina)</h1>
                <p class="spotlight-desc">
                    Tratamento para 60 dias de força, ganho muscular e alta energia. 3g de Creatina Monohidratada pura por porção, Zero Açúcar e sabor irresistível de Frutas Vermelhas.
                </p>

                <div class="spotlight-pricing">
                    <div>
                        <div class="deal-price-old">De R$ 239,80</div>
                        <div class="deal-price-current">R$ 159,90</div>
                    </div>
                    <div class="deal-pix-tag">R$ 143,91 no PIX (10% OFF)</div>
                </div>

                <div class="spotlight-buttons">
                    <button class="btn-buy-spotlight" onclick="addAndOpenCart('Kit Duplo Gumesmomo (120 Gomas)', 159.90, '/images/gumesmomo_hand.jpg')">
                        🛒 Comprar Agora
                    </button>
                    <a href="https://wa.me/5511999999999?text=Quero%20o%20Kit%20Duplo%20Gumesmomo%20por%20159,90%20no%20PIX" target="_blank" class="btn-action" style="padding:14px 20px; font-size:15px;">
                        📱 Pedir pelo WhatsApp
                    </a>
                </div>
            </div>

            <div class="spotlight-img-wrap">
                <img class="spotlight-img" src="/images/gumesmomo_jar.jpg" alt="Kit Duplo Gumesmomo Fit" />
            </div>
        </section>

        <!-- TRUST STRIP -->
        <section class="trust-strip">
            <div class="trust-item">
                <div class="trust-icon">🚚</div>
                <div class="trust-info">
                    <h4>Frete Grátis Brasil</h4>
                    <p>Em compras a partir de R$ 99</p>
                </div>
            </div>
            <div class="trust-item">
                <div class="trust-icon">⚡</div>
                <div class="trust-info">
                    <h4>Envio em 24h</h4>
                    <p>Despacho expresso diário</p>
                </div>
            </div>
            <div class="trust-item">
                <div class="trust-icon">🛡️</div>
                <div class="trust-info">
                    <h4>Garantia de 30 Dias</h4>
                    <p>Satisfação total garantida</p>
                </div>
            </div>
            <div class="trust-item">
                <div class="trust-icon">🔒</div>
                <div class="trust-info">
                    <h4>Pagamento Seguro</h4>
                    <p>PIX imediato ou até 12x no cartão</p>
                </div>
            </div>
        </section>

        <!-- PRODUCTS CATALOG -->
        <section>
            <div class="catalog-head">
                <h2 class="catalog-title">Vitrine de <span>Produtos & Ofertas</span></h2>
                <div class="catalog-sort">
                    <label>Ordenar por:</label>
                    <select onchange="sortProducts(this.value)">
                        <option value="featured">Mais Populares</option>
                        <option value="price-asc">Menor Preço</option>
                        <option value="price-desc">Maior Preço</option>
                    </select>
                </div>
            </div>

            <div class="products-grid" id="catalog-grid">
                
                <!-- PRODUTO 1: GUMESMOMO 1 POTE -->
                <article class="product-card" data-category="gumesmomo" data-price="89.90">
                    <div class="product-img-box">
                        <img class="product-img" src="/images/gumesmomo_jar.jpg" alt="1 Pote Gumesmomo Fit" />
                        <span class="badge-discount">-25% OFF</span>
                    </div>
                    <div class="product-body">
                        <div>
                            <div class="product-cat-label">Suplementação Esportiva</div>
                            <h3 class="product-name">1 Pote Gumesmomo Fit (60 Gomas de Creatina Pura)</h3>
                            <div class="product-rating">⭐⭐⭐⭐⭐ 4.9 <span>(184 avaliações)</span></div>
                            <ul class="product-bullets">
                                <li>3g de Creatina por porção</li>
                                <li>Tratamento para 30 dias</li>
                                <li>Zero Açúcar & Sem Glúten</li>
                                <li>Sabor Frutas Vermelhas</li>
                            </ul>
                        </div>
                        <div>
                            <div class="product-pricing-box">
                                <div class="price-from">R$ 119,90</div>
                                <div class="price-final">R$ 89,90</div>
                                <div class="price-installments">ou 3x de R$ 29,97 sem juros</div>
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('1 Pote Gumesmomo (60 Gomas)', 89.90, '/images/gumesmomo_jar.jpg')">+ Carrinho</button>
                                <button class="btn-buy-instant" onclick="addAndOpenCart('1 Pote Gumesmomo (60 Gomas)', 89.90, '/images/gumesmomo_jar.jpg')">Comprar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- PRODUTO 2: GUMESMOMO KIT DUPLO -->
                <article class="product-card bestseller" data-category="gumesmomo" data-price="159.90">
                    <div class="product-img-box">
                        <img class="product-img" src="/images/gumesmomo_hand.jpg" alt="Kit Duplo Gumesmomo Fit" />
                        <span class="badge-discount">-33% OFF</span>
                        <span class="badge-bestseller">Mais Vendido 🔥</span>
                    </div>
                    <div class="product-body">
                        <div>
                            <div class="product-cat-label">Nutrição & Performance</div>
                            <h3 class="product-name">Kit Duplo Gumesmomo Fit (120 Gomas + Frete Grátis)</h3>
                            <div class="product-rating">⭐⭐⭐⭐⭐ 5.0 <span>(412 avaliações)</span></div>
                            <ul class="product-bullets">
                                <li>Tratamento para 60 dias de treino</li>
                                <li>🚚 FRETE GRÁTIS BRASIL INCLUSO</li>
                                <li>10% de Desconto no PIX (R$ 143,91)</li>
                                <li>Maior retenção e força muscular</li>
                            </ul>
                        </div>
                        <div>
                            <div class="product-pricing-box">
                                <div class="price-from">R$ 239,80</div>
                                <div class="price-final">R$ 159,90</div>
                                <div class="price-installments">ou 6x de R$ 26,65 sem juros</div>
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('Kit Duplo Gumesmomo (120 Gomas)', 159.90, '/images/gumesmomo_hand.jpg')">+ Carrinho</button>
                                <button class="btn-buy-instant" onclick="addAndOpenCart('Kit Duplo Gumesmomo (120 Gomas)', 159.90, '/images/gumesmomo_hand.jpg')">Comprar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- PRODUTO 3: GUMESMOMO COMBO VIP -->
                <article class="product-card" data-category="gumesmomo" data-price="219.90">
                    <div class="product-img-box">
                        <img class="product-img" src="/images/gumesmomo_jar.jpg" alt="Combo VIP Gumesmomo Fit" />
                        <span class="badge-discount">-40% OFF</span>
                        <span class="badge-bestseller" style="background:#10b981; color:#000;">Melhor Preço</span>
                    </div>
                    <div class="product-body">
                        <div>
                            <div class="product-cat-label">Máxima Economia</div>
                            <h3 class="product-name">Combo VIP Gumesmomo Fit (3 Potes - 180 Gomas)</h3>
                            <div class="product-rating">⭐⭐⭐⭐⭐ 4.9 <span>(96 avaliações)</span></div>
                            <ul class="product-bullets">
                                <li>Tratamento completo para 90 dias</li>
                                <li>Sai por apenas R$ 73,30 por pote</li>
                                <li>🚚 Frete Expresso Grátis com rastreio</li>
                                <li>Atendimento prioritário VIP</li>
                            </ul>
                        </div>
                        <div>
                            <div class="product-pricing-box">
                                <div class="price-from">R$ 359,70</div>
                                <div class="price-final">R$ 219,90</div>
                                <div class="price-installments">ou 6x de R$ 36,65 sem juros</div>
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('Combo VIP 3 Potes Gumesmomo', 219.90, '/images/gumesmomo_jar.jpg')">+ Carrinho</button>
                                <button class="btn-buy-instant" onclick="addAndOpenCart('Combo VIP 3 Potes Gumesmomo', 219.90, '/images/gumesmomo_jar.jpg')">Comprar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- PRODUTO 4: CURSO ATENDIMENTO SOFIA IA -->
                <article class="product-card" data-category="cursos" data-price="97.00">
                    <div class="product-img-box">
                        <img class="product-img" src="/images/curso_ia_intro_1786732570731.jpg" alt="Curso Sofia IA" />
                        <span class="badge-discount">-50% OFF</span>
                    </div>
                    <div class="product-body">
                        <div>
                            <div class="product-cat-label">Cursos de IA • Vídeos 1 Min</div>
                            <h3 class="product-name">Curso Prático: Atendente Sofia IA 2.0 no WhatsApp</h3>
                            <div class="product-rating">⭐⭐⭐⭐⭐ 5.0 <span>(314 alunos)</span></div>
                            <ul class="product-bullets">
                                <li>Formato dinâmico em vídeos de 1 minuto</li>
                                <li>Configuração completa de prompts & regras</li>
                                <li>Integração oficial Baileys & Webhooks</li>
                                <li>Acesso vitalício + Scripts prontos</li>
                            </ul>
                        </div>
                        <div>
                            <div class="product-pricing-box">
                                <div class="price-from">R$ 197,00</div>
                                <div class="price-final">R$ 97,00</div>
                                <div class="price-installments">ou 3x de R$ 32,33 sem juros</div>
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('Curso Prático Sofia IA 2.0', 97.00, '/images/curso_ia_intro_1786732570731.jpg')">+ Carrinho</button>
                                <button class="btn-buy-instant" onclick="addAndOpenCart('Curso Prático Sofia IA 2.0', 97.00, '/images/curso_ia_intro_1786732570731.jpg')">Comprar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- PRODUTO 5: FORMAÇÃO AGENTES AUTÔNOMOS -->
                <article class="product-card" data-category="cursos" data-price="147.00">
                    <div class="product-img-box">
                        <img class="product-img" src="/images/curso_ia_demo_1786732588129.jpg" alt="Formação Agentes IA" />
                        <span class="badge-discount">-50% OFF</span>
                    </div>
                    <div class="product-body">
                        <div>
                            <div class="product-cat-label">Formação Avançada</div>
                            <h3 class="product-name">Formação: Agentes Autônomos com TypeSafe Jev & Gemini</h3>
                            <div class="product-rating">⭐⭐⭐⭐⭐ 4.9 <span>(248 alunos)</span></div>
                            <ul class="product-bullets">
                                <li>Modelos System One (Choice, Score, Noul)</li>
                                <li>Decisões tipadas de alta velocidade (70ms)</li>
                                <li>Automação de processos empresariais</li>
                                <li>Certificado de Conclusão Comenta AI</li>
                            </ul>
                        </div>
                        <div>
                            <div class="product-pricing-box">
                                <div class="price-from">R$ 297,00</div>
                                <div class="price-final">R$ 147,00</div>
                                <div class="price-installments">ou 4x de R$ 36,75 sem juros</div>
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('Formação Agentes TypeSafe Jev', 147.00, '/images/curso_ia_demo_1786732588129.jpg')">+ Carrinho</button>
                                <button class="btn-buy-instant" onclick="addAndOpenCart('Formação Agentes TypeSafe Jev', 147.00, '/images/curso_ia_demo_1786732588129.jpg')">Comprar</button>
                            </div>
                        </div>
                    </div>
                </article>

                <!-- PRODUTO 6: COMENTA AI PLANO PRO -->
                <article class="product-card" data-category="saas" data-price="99.00">
                    <div class="product-img-box">
                        <img class="product-img" src="/images/curso_ia_sucesso_1786732607976.jpg" alt="Plano Pro Comenta AI" />
                        <span class="badge-bestseller" style="background:#6366f1; color:#fff;">SaaS Pro</span>
                    </div>
                    <div class="product-body">
                        <div>
                            <div class="product-cat-label">Plataforma SaaS</div>
                            <h3 class="product-name">Comenta AI — Plano Pro Mensal (Multicanal + Atendente IA)</h3>
                            <div class="product-rating">⭐⭐⭐⭐⭐ 5.0 <span>(520 empresas)</span></div>
                            <ul class="product-bullets">
                                <li>Até 5 conexões simultâneas de WhatsApp</li>
                                <li>Atendente virtual Sofia 24/7 sem limites</li>
                                <li>Painel Kanban & Triagem Inteligente</li>
                                <li>Ativação imediata da conta</li>
                            </ul>
                        </div>
                        <div>
                            <div class="product-pricing-box">
                                <div class="price-from">R$ 149,00/mês</div>
                                <div class="price-final">R$ 99,00 <span style="font-size:14px; font-weight:600; color:var(--text-muted);">/mês</span></div>
                                <div class="price-installments">Sem fidelidade • Cancele quando quiser</div>
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('Plano Pro Comenta AI (Mensal)', 99.00, '/images/curso_ia_sucesso_1786732607976.jpg')">+ Carrinho</button>
                                <button class="btn-buy-instant" onclick="addAndOpenCart('Plano Pro Comenta AI (Mensal)', 99.00, '/images/curso_ia_sucesso_1786732607976.jpg')">Assinar</button>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <!-- REVIEWS PROVA SOCIAL -->
        <section class="reviews-section">
            <div class="reviews-inner">
                <h3 style="font-family:var(--font-head); font-size:26px; font-weight:900; text-align:center;">O que nossos clientes dizem</h3>
                <p style="text-align:center; font-size:14px; color:var(--text-sub); margin-top:6px;">Mais de 4.500 clientes satisfeitos em todo o Brasil</p>

                <div class="reviews-grid">
                    <div class="review-card">
                        <div class="review-stars">⭐⭐⭐⭐⭐</div>
                        <p class="review-text">"As gomas da Gumesmomo mudaram minha rotina. Não fico sem no meu treino. Sabor surreal de frutas vermelhas e zero estômago pesado!"</p>
                        <div class="reviewer-info">
                            <div class="reviewer-avatar">RF</div>
                            <div>
                                <div style="font-weight:700; font-size:13px;">Rodrigo Fernandes</div>
                                <div style="font-size:11px; color:var(--text-muted);">Atleta de Crossfit • Cuiabá MT</div>
                            </div>
                        </div>
                    </div>

                    <div class="review-card">
                        <div class="review-stars">⭐⭐⭐⭐⭐</div>
                        <p class="review-text">"O curso da Sofia IA no WhatsApp me permitiu automatizar as vendas da minha loja em 48 horas. Vale cada centavo!"</p>
                        <div class="reviewer-info">
                            <div class="reviewer-avatar">MS</div>
                            <div>
                                <div style="font-weight:700; font-size:13px;">Mariana Silveira</div>
                                <div style="font-size:11px; color:var(--text-muted);">E-commerce Manager • São Paulo SP</div>
                            </div>
                        </div>
                    </div>

                    <div class="review-card">
                        <div class="review-stars">⭐⭐⭐⭐⭐</div>
                        <p class="review-text">"Comprei o Kit Duplo no PIX e chegou em 3 dias com frete grátis. A textura e o sabor são nota 10, recomendo para todos!"</p>
                        <div class="reviewer-info">
                            <div class="reviewer-avatar">AL</div>
                            <div>
                                <div style="font-weight:700; font-size:13px;">André Lucas</div>
                                <div style="font-size:11px; color:var(--text-muted);">Nutricionista • Curitiba PR</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- SLIDE OVER CART DRAWER -->
    <div class="cart-drawer-overlay" id="cart-overlay" onclick="toggleCartDrawer(false)"></div>
    <aside class="cart-drawer" id="cart-drawer">
        <div class="cart-header">
            <h3>🛒 Seu Carrinho (<span id="cart-drawer-count">0</span>)</h3>
            <button class="cart-close-btn" onclick="toggleCartDrawer(false)">✕</button>
        </div>

        <div class="cart-body" id="cart-items-container">
            <div style="text-align:center; padding:40px 0; color:var(--text-muted);">
                <div style="font-size:48px; margin-bottom:12px;">🛍️</div>
                <p>Seu carrinho está vazio.</p>
                <p style="font-size:12px; margin-top:4px;">Escolha um produto da vitrine e adicione aqui!</p>
            </div>
        </div>

        <div class="cart-footer">
            <div class="cart-totals-row">
                <span>Subtotal:</span>
                <span id="cart-subtotal">R$ 0,00</span>
            </div>
            <div class="cart-totals-row">
                <span>Frete:</span>
                <span style="color:var(--primary); font-weight:700;">GRÁTIS 🚚</span>
            </div>
            <div class="cart-totals-row">
                <span>Desconto no PIX (10%):</span>
                <span id="cart-pix-discount" style="color:var(--primary); font-weight:700;">- R$ 0,00</span>
            </div>
            <div class="cart-total-final">
                <span>Total no PIX:</span>
                <span id="cart-total-pix">R$ 0,00</span>
            </div>
            <button class="btn-checkout-wa" onclick="checkoutWhatsApp()">
                <span>💬 Finalizar Pedido via WhatsApp</span>
            </button>
        </div>
    </aside>

    <!-- MARKETPLACE FOOTER -->
    <footer class="marketplace-footer">
        <div class="footer-grid">
            <div>
                <div class="brand-box" style="margin-bottom:14px;">
                    <div class="brand-icon">🛍️</div>
                    <div class="brand-name">COMENTA <span>MARKET</span></div>
                </div>
                <p style="font-size:13px; color:var(--text-sub); line-height:1.6;">
                    Marketplace oficial do ecossistema Comenta AI, Gumesmomo Fit e IntSoft Tecnologia. Produtos originais com garantia de fábrica e entrega para todo o Brasil.
                </p>
            </div>

            <div>
                <h4>Categorias</h4>
                <ul class="footer-links">
                    <li><a href="#" onclick="filterMarketCategory('gumesmomo')">Gumesmomo Fit (Creatina)</a></li>
                    <li><a href="#" onclick="filterMarketCategory('cursos')">Cursos de IA no WhatsApp</a></li>
                    <li><a href="#" onclick="filterMarketCategory('saas')">Planos Comenta AI SaaS</a></li>
                </ul>
            </div>

            <div>
                <h4>Atendimento</h4>
                <ul class="footer-links">
                    <li><a href="https://wa.me/5511999999999" target="_blank">WhatsApp Comercial</a></li>
                    <li><a href="mailto:comercial@comenta.com.br">E-mail de Suporte</a></li>
                    <li><a href="http://localhost:3000/">Site Institucional</a></li>
                    <li><a href="http://localhost:5173/">Painel do Atendente</a></li>
                </ul>
            </div>

            <div>
                <h4>Formas de Pagamento</h4>
                <p style="font-size:12px; color:var(--text-sub); margin-bottom:10px;">Aceitamos PIX com 10% de desconto imediato e todos os cartões de crédito em até 12x.</p>
                <div style="font-size:20px; display:flex; gap:8px;">
                    <span>⚡ PIX</span>
                    <span>💳 Visa</span>
                    <span>💳 Master</span>
                    <span>💳 Elo</span>
                </div>
            </div>
        </div>

        <div class="footer-bottom">
            <span>© 2026 Comenta Marketplace • Gumesmomo Nutrição Esportiva Ltda. CNPJ 00.000.000/0001-00</span>
            <span>Ambiente Seguro SSL 256 bits • Servidor na Porta 2368</span>
        </div>
    </footer>

    <!-- INTERACTIVE STORE LOGIC -->
    <script>
        // THEME MANAGEMENT
        const themeBtn = document.getElementById('btn-theme');
        function initTheme() {
            const saved = localStorage.getItem('market_theme') || 'dark';
            document.documentElement.setAttribute('data-theme', saved);
        }
        themeBtn.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('market_theme', next);
        });
        initTheme();

        // CART STATE
        let cart = [];

        function addToCart(title, price, image) {
            const found = cart.find(item => item.title === title);
            if (found) {
                found.qty += 1;
            } else {
                cart.push({ title, price, image, qty: 1 });
            }
            updateCartUI();
        }

        function addAndOpenCart(title, price, image) {
            addToCart(title, price, image);
            toggleCartDrawer(true);
        }

        function updateQty(title, delta) {
            const item = cart.find(i => i.title === title);
            if (!item) return;
            item.qty += delta;
            if (item.qty <= 0) {
                cart = cart.filter(i => i.title !== title);
            }
            updateCartUI();
        }

        function updateCartUI() {
            const counter = document.getElementById('cart-counter');
            const drawerCount = document.getElementById('cart-drawer-count');
            const container = document.getElementById('cart-items-container');
            const subtotalEl = document.getElementById('cart-subtotal');
            const pixDiscountEl = document.getElementById('cart-pix-discount');
            const totalPixEl = document.getElementById('cart-total-pix');

            const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
            counter.innerText = totalItems;
            drawerCount.innerText = totalItems;

            if (cart.length === 0) {
                container.innerHTML = \`
                    <div style="text-align:center; padding:40px 0; color:var(--text-muted);">
                        <div style="font-size:48px; margin-bottom:12px;">🛍️</div>
                        <p>Seu carrinho está vazio.</p>
                        <p style="font-size:12px; margin-top:4px;">Escolha um produto da vitrine e adicione aqui!</p>
                    </div>
                \`;
                subtotalEl.innerText = 'R$ 0,00';
                pixDiscountEl.innerText = '- R$ 0,00';
                totalPixEl.innerText = 'R$ 0,00';
                return;
            }

            let subtotal = 0;
            container.innerHTML = cart.map(item => {
                const itemTotal = item.price * item.qty;
                subtotal += itemTotal;
                return \`
                    <div class="cart-item">
                        <img src="\${item.image}" alt="\${item.title}" class="cart-item-img" />
                        <div class="cart-item-info">
                            <div class="cart-item-title">\${item.title}</div>
                            <div class="cart-item-price">R$ \${item.price.toFixed(2).replace('.', ',')}</div>
                            <div class="cart-item-qty">
                                <button class="qty-btn" onclick="updateQty('\${item.title}', -1)">-</button>
                                <span style="font-weight:800; font-size:13px;">\${item.qty}</span>
                                <button class="qty-btn" onclick="updateQty('\${item.title}', 1)">+</button>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');

            const pixDiscount = subtotal * 0.10;
            const totalPix = subtotal - pixDiscount;

            subtotalEl.innerText = 'R$ ' + subtotal.toFixed(2).replace('.', ',');
            pixDiscountEl.innerText = '- R$ ' + pixDiscount.toFixed(2).replace('.', ',');
            totalPixEl.innerText = 'R$ ' + totalPix.toFixed(2).replace('.', ',');
        }

        function toggleCartDrawer(open) {
            const drawer = document.getElementById('cart-drawer');
            const overlay = document.getElementById('cart-overlay');
            if (open) {
                drawer.classList.add('open');
                overlay.classList.add('open');
            } else {
                drawer.classList.remove('open');
                overlay.classList.remove('open');
            }
        }

        // WHATSAPP CHECKOUT
        function checkoutWhatsApp() {
            if (cart.length === 0) {
                alert('Seu carrinho está vazio! Adicione algum produto para continuar.');
                return;
            }

            let msg = "Olá! Gostaria de finalizar meu pedido no Comenta Marketplace:\\n\\n";
            let subtotal = 0;
            cart.forEach(item => {
                const totalItem = item.price * item.qty;
                subtotal += totalItem;
                msg += \`• \${item.qty}x \${item.title} - R$ \${totalItem.toFixed(2).replace('.', ',')}\\n\`;
            });

            const totalPix = subtotal * 0.90;
            msg += \`\\nTotal no PIX com 10% OFF: R$ \${totalPix.toFixed(2).replace('.', ',')}\\n\`;
            msg += "Frete Grátis incluso. Poderiam gerar meu código PIX para pagamento?";

            const waUrl = "https://wa.me/5511999999999?text=" + encodeURIComponent(msg);
            window.open(waUrl, '_blank');
        }

        // CATEGORY FILTER
        function filterMarketCategory(cat) {
            const chips = document.querySelectorAll('.cat-chip');
            chips.forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');

            const cards = document.querySelectorAll('.product-card');
            cards.forEach(card => {
                if (cat === 'all' || card.dataset.category === cat) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // SEARCH FILTER
        function handleSearch(term) {
            const lower = term.toLowerCase();
            const cards = document.querySelectorAll('.product-card');
            cards.forEach(card => {
                const title = card.querySelector('.product-name').innerText.toLowerCase();
                if (title.includes(lower)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // SORT PRODUCTS
        function sortProducts(criteria) {
            const grid = document.getElementById('catalog-grid');
            const cards = Array.from(grid.querySelectorAll('.product-card'));

            if (criteria === 'price-asc') {
                cards.sort((a, b) => parseFloat(a.dataset.price) - parseFloat(b.dataset.price));
            } else if (criteria === 'price-desc') {
                cards.sort((a, b) => parseFloat(b.dataset.price) - parseFloat(a.dataset.price));
            }

            cards.forEach(c => grid.appendChild(c));
        }
    </script>
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

  // Rota de Loja / Marketplace Virtual (Todas as rotas públicas viram Marketplace E-commerce)
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderMarketplaceHTML());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🛒 Marketplace Virtual Store running on port ${PORT}`);
});
