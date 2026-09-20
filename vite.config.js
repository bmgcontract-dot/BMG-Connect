import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const emulator = mode === 'emulator';
  if (emulator && command !== 'serve') throw new Error('Emulator mode cannot be built or deployed');
  return {
    plugins: [react(), ...(emulator ? [{
      name: 'local-emulator-network-guard',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Fail closed for fetch/XHR/WebSocket; no Production Firebase or Apps Script traffic.
          res.setHeader('Content-Security-Policy', "connect-src 'self' http://127.0.0.1:8090 http://127.0.0.1:9099 ws://127.0.0.1:5175; form-action 'self'; base-uri 'self'");
          if (req.url?.split('?')[0] === '/api/schedule-roster') {
            process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8090';
            process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
            try {
              const { handleScheduleRoster, scheduleRosterServer } = await import('./src/schedule/rosterServer.js');
              await handleScheduleRoster(req, res, args => scheduleRosterServer({ emulator: true })(args));
            } catch {
              res.statusCode = 503; res.end(JSON.stringify({ error: 'Local roster unavailable' }));
            }
            return;
          }
          if (req.url?.startsWith('/api/')) {
            res.statusCode = 503;
            res.end(JSON.stringify({ error: 'API disabled in isolated browser tests' }));
            return;
          }
          next();
        });
      },
    }] : [])],
    define: { 'import.meta.env.BMG_LOCAL_EMULATOR': JSON.stringify(emulator) },
    ...(emulator ? { server: { host: '127.0.0.1', port: 5175, strictPort: true } } : {}),
  };
})
