// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Evita que errores de ESLint paren el build en Vercel (útil para desplegar rápido).
  // Recomendado: solucionar los errores después de la demo.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Opcional: si quieres también omitir errores de TypeScript durante el build,
  // descomenta la siguiente línea (no recomendado a largo plazo).
  // typescript: { ignoreBuildErrors: true },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          // Si configuras NEXT_PUBLIC_API_PROXY en Vercel apunta a la URL de tu backend (ej: https://mi-backend.repl.co)
          process.env.NEXT_PUBLIC_API_PROXY ||
          'http://localhost:3002/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
