// Tailwind 4 traz o próprio plugin de PostCSS e já resolve prefixos de
// fornecedor sozinho — o autoprefixer saiu junto com o plugin `tailwindcss`.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
