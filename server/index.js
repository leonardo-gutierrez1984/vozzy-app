import "dotenv/config";
import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origem não permitida pelo CORS"));
      }
    },
  }),
);

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `audio-${Date.now()}.webm`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum áudio recebido." });
    }

    const filePath = path.resolve(req.file.path);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
    });

    fs.unlinkSync(filePath);

    return res.json({ text: transcription.text });
  } catch (error) {
    console.error("Erro na transcrição:", error);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      error: error?.error?.message || error.message || "Erro na transcrição",
    });
  }
});

app.post("/interpret", async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ error: "Texto não enviado." });
    }

    const resposta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Você é um assistente de inventário.

Transforme a frase do usuário em uma LISTA de itens em JSON.

Regras obrigatórias:
- Responda SOMENTE com JSON válido.
- O JSON deve ser sempre um ARRAY.
- Cada item deve conter:
  - produto
  - quantidade
  - unidade
- "produto" deve estar em minúsculo, no singular.
- "quantidade" deve ser número.
- Se não encontrar unidade, use "unidades".
- Converta números por extenso para número.
- Separe corretamente múltiplos itens.
- Não inclua markdown.
- Não inclua explicações.

Exemplo de entrada:
"cinco coca cola, oito pães, dez sorvete de creme"

Exemplo de saída:
[
  { "produto": "coca cola", "quantidade": 5, "unidade": "unidades" },
  { "produto": "pao", "quantidade": 8, "unidade": "unidades" },
  { "produto": "sorvete de creme", "quantidade": 10, "unidade": "unidades" }
]
          `,
        },
        {
          role: "user",
          content: texto,
        },
      ],
    });

    const conteudo = resposta.choices[0].message.content;

    let itens;
    try {
      itens = JSON.parse(conteudo);
    } catch {
      console.error("IA retornou JSON inválido:", conteudo);
      return res.status(500).json({
        error: "A IA retornou uma resposta inesperada. Tente novamente.",
      });
    }

    if (!Array.isArray(itens)) {
      return res.status(500).json({
        error: "A IA não retornou uma lista válida.",
      });
    }

    return res.json({ itens });
  } catch (error) {
    console.error("Erro na interpretação:", error);

    return res.status(500).json({
      error: error?.error?.message || error.message || "Erro na interpretação",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
