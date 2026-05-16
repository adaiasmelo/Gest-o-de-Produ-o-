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
      
      // Robust cleaning of surrounding quotes and potential whitespace
      while ((saString.startsWith('"') && saString.endsWith('"')) || 
             (saString.startsWith("'") && saString.endsWith("'"))) {
        saString = saString.slice(1, -1).trim();
      }

      // Sometimes env vars handle newlines differently or escape them
      saString = saString.replace(/\\n/g, '\n');

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(saString);
      } catch (parseError) {
        // Fallback: Tenta extrair apenas o conteúdo entre as chaves { } 
        // caso o sistema tenha concatenado algo estranho no início ou fim
        const start = saString.indexOf('{');
        const end = saString.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const possibleJson = saString.slice(start, end + 1);
          serviceAccount = JSON.parse(possibleJson);
        } else {
          throw parseError;
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found.");
    }
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT Error: O valor fornecido não é um JSON válido.");
    console.error("DICA: Garanta que você colou o conteúdo COMPLETO do arquivo .json, incluindo as chaves { e }.");
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
          webpush: {
            notification: {
              icon: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
              badge: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png'
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
