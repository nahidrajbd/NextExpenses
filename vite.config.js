import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const resendApiPlugin = {
    name: 'resend-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-email' && req.method === 'POST') {
          try {
            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }
            const apiKey = env.VITE_RESEND_API_KEY || '';
            const sender = env.VITE_RESEND_FROM || 'nahid <onboarding@resend.dev>';

            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: sender,
                to: Array.isArray(to) ? to : [to],
                subject,
                html
              })
            });

            const data = await response.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = response.status;
            res.end(JSON.stringify(data));
          } catch (error) {
            console.error('Error in Resend proxy middleware:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }
        next();
      });
    }
  };

  return {
    plugins: [react(), resendApiPlugin]
  };
});
