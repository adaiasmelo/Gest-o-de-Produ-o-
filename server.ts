import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as admin from 'firebase-admin';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Firebase Admin if configuration exists
  // For push notifications, we need a service account. 
  // In this environment, we might rely on the default credentials or instructions for the user to provide them.
  // Note: We'll attempt to initialize but handle failure gracefully.
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let saString = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      
      // Remove escaping if it was double-escaped by the environment
      if (saString.includes('\\"')) {
        // If it looks like a escaped JSON string inside a string
        try {
          const unescaped = JSON.parse(`"${saString}"`);
          if (unescaped.startsWith('{')) saString = unescaped;
        } catch (e) {
          // ignore
        }
      }

      // Robust cleaning of surrounding quotes
      while ((saString.startsWith('"') && saString.endsWith('"')) || 
             (saString.startsWith("'") && saString.endsWith("'"))) {
        saString = saString.slice(1, -1).trim();
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(saString);
      } catch (parseError) {
        // Fallback: Try to clean up raw newlines that might break JSON.parse
        // (This happens if \n was converted to a real newline in the env var)
        try {
          // Attempt to fix common "raw newline in string" issues
          const cleanedSa = saString.replace(/\n/g, '\\n').replace(/\r/g, '');
          // But wait, the above might break the actual JSON structure. 
          // Complex regex to find newlines inside quotes is needed, but let's try a simpler approach.
          
          // Try extracting the JSON block again with a more careful parse
          const start = saString.indexOf('{');
          const end = saString.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            const possibleJson = saString.slice(start, end + 1);
            // If there are real newlines inside the JSON string values, they MUST be escaped for JSON.parse
            // This is a common issue with private_key
            const fixedJson = possibleJson.replace(/([^\\])\n/g, '$1\\n');
            serviceAccount = JSON.parse(fixedJson);
          } else {
            throw parseError;
          }
        } catch (secondError) {
          console.error("FIREBASE_SERVICE_ACCOUNT: Falha crítica ao processar JSON.");
          console.error("Comprimento da string:", saString.length);
          console.error("Início:", saString.substring(0, 50));
          console.error("Fim:", saString.substring(saString.length - 50));
          throw secondError;
        }
      }

      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully");
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found.");
    }
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT Error: O valor fornecido não é um JSON válido.");
    console.error("DICA: Certifique-se de colar o conteúdo completo (incluindo as chaves { }) do arquivo .json da conta de serviço.");
    console.error("Detalhes do erro:", error instanceof Error ? error.message : String(error));
  }

  // API Routes
  app.post("/api/send-notification", async (req, res) => {
    const { token, title, body } = req.body;

    if (!token) {
       return res.status(400).json({ error: "Token is required" });
    }

    try {
      if (admin.apps.length > 0) {
        await admin.messaging().send({
          token,
          notification: {
            title,
            body,
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              title,
              body,
              icon: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
              badge: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
              vibrate: [200, 100, 200, 100, 200],
              requireInteraction: true,
              silent: false,
              actions: [
                {
                  action: 'open',
                  title: 'Ver Produção'
                }
              ]
            },
            fcmOptions: {
              link: '/'
            }
          }
        });
        res.json({ success: true });
      } else {
        // Fallback for when admin is not fully configured - log for debugging
        console.log("Push notification simulation:", { title, body });
        res.json({ success: true, simulated: true });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
