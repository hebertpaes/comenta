// Flat config única do monorepo (ESLint 10). Cada bloco restringe suas regras
// por `files`, então um só `npx eslint .` na raiz cobre API, painel, site,
// editor e o pacote compartilhado, cada um com o ambiente correto.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/public/ffmpeg/**",
      // Instalador bash de terceiros, fora dos workspaces.
      "projects/**",
    ],
  },

  js.configs.recommended,

  // -------------------------------------------------------------- TypeScript
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [tseslint.configs.recommended],
    rules: {
      // Descartar um valor com `_` é intencional; o resto continua erro.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // Aviso, não erro, enquanto o passivo é liquidado: sobraram 34 `any`,
      // metade em channels/whatsapp.ts (o Baileys tipa mal o que devolve) e o
      // resto em site/pages/preview.tsx, que a etapa 5 migra para o App Router.
      // Vira erro quando a conta zerar.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // ---------------------------------------------------- API e scripts (Node)
  {
    files: ["saas/api/**/*.ts", "content/**/*.mjs", "apps/editor/scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2023,
      sourceType: "module",
    },
  },

  // ------------------------------------------------------- React no browser
  {
    files: ["saas/web/**/*.{js,jsx,ts,tsx}", "apps/editor/src/**/*.{js,jsx}", "site/**/*.{ts,tsx}"],
    // `configs.flat.*` e não `configs["recommended-latest"]`: este último ainda
    // é eslintrc (declara `plugins` como array de strings), o que a flat config
    // do ESLint 10 rejeita.
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // `rules-of-hooks` pega bug de verdade (hook condicional, hook fora de
      // componente) e fica como erro.
      "react-hooks/rules-of-hooks": "error",
      // O resto do conjunto novo do plugin v7 são as regras do React Compiler:
      // exigem componentes puros de um jeito que este código, escrito antes
      // delas, ainda não segue. Ficam como aviso — são o mapa do que ajustar,
      // não motivo para reprovar o build hoje.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/refs": "warn",
    },
  },

  // ------------------------------------------------------------ Next.js
  {
    files: ["site/**/*.{ts,tsx,js,jsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // Fast refresh só faz sentido nos apps servidos pelo Vite.
  {
    files: ["saas/web/src/**/*.{jsx,tsx}", "apps/editor/src/**/*.jsx"],
    plugins: { "react-refresh": reactRefresh },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // O site é Next: mistura Server Components (Node) e Client Components.
  {
    files: ["site/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // Configs em CommonJS.
  {
    files: ["**/*.cjs", "site/next.config.js", "site/postcss.config.js", "site/tailwind.config.js"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },

  // Testes.
  {
    files: ["**/*.test.{ts,tsx,js,jsx}", "**/test/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Desliga tudo que conflita com o Prettier. Precisa ficar por último.
  prettier
);
