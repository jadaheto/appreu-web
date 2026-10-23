// Proxy del servidor de desarrollo (`ng serve`): `/api` → apreu-api.
// La URL de la API se elige con `APREU_API_URL` (por defecto el puerto 3000 de apreu-api).
export default {
  '/api': {
    target: process.env.APREU_API_URL ?? 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
  },
};
