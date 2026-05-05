import { useState, useRef } from "react";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  return (
    <div className="bg-black min-h-screen flex justify-center">
      <div className="w-full max-w-md bg-gradient-to-b from-[#050816] via-[#090d18] to-[#02040a] text-white min-h-screen p-5 pb-24">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-purple-400">VOZZY</h1>
            <p className="text-sm text-gray-400">
              Pronto para contar seu estoque?
            </p>
          </div>

          <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
            🔔
          </div>
        </div>

        {/* Botão principal */}
        <div className="mb-8 flex flex-col items-center">
          <button
            onClick={async () => {
              if (!isRecording) {
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                });

                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                  audioChunksRef.current.push(event.data);
                };

                mediaRecorder.start();
                setIsRecording(true);
              } else {
                mediaRecorderRef.current.stop();

                mediaRecorderRef.current.onstop = async () => {
                  const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                  });

                  console.log("Áudio gravado:", audioBlob);

                  const file = new File([audioBlob], "audio.webm", {
                    type: "audio/webm",
                  });

                  try {
                    const transcription =
                      await openai.audio.transcriptions.create({
                        file: file,
                        model: "gpt-4o-mini-transcribe",
                      });

                    console.log("Texto:", transcription.text);
                    setTranscript(transcription.text);
                  } catch (error) {
                    console.error("Erro na transcrição:", error);
                  }
                };

                setIsRecording(false);
              }
            }}
            className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl hover:scale-105 transition shadow-lg ${
              isRecording
                ? "bg-red-600 shadow-red-900/50"
                : "bg-purple-600 shadow-purple-900/50"
            }`}
          >
            {isRecording ? "⏹️" : "🎤"}
          </button>

          <p className="mt-4 text-lg font-semibold">
            {isRecording ? "Gravando..." : "Iniciar Contagem"}
          </p>
          <p className="text-sm text-gray-400 text-center">
            {isRecording
              ? "Toque novamente para parar a gravação"
              : "Toque para começar a contar por voz"}
          </p>

          <div className="mt-4 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm">
            {isRecording ? "🔴 Gravando áudio..." : "🟢 Pronto para gravar"}
          </div>
          {transcript && (
            <div className="mt-4 w-full bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Texto capturado</p>
              <p className="text-sm">{transcript}</p>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 p-5 rounded-2xl flex justify-between items-center shadow-md">
            <div>
              <h2 className="font-semibold">Inventários</h2>
              <p className="text-sm text-gray-400">Gerenciar contagens</p>
            </div>
            <span>📋</span>
          </div>

          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 p-5 rounded-2xl flex justify-between items-center shadow-md">
            <div>
              <h2 className="font-semibold">Catálogo</h2>
              <p className="text-sm text-gray-400">Produtos</p>
            </div>
            <span>📦</span>
          </div>

          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 p-5 rounded-2xl flex justify-between items-center shadow-md">
            <div>
              <h2 className="font-semibold">Integrações</h2>
              <p className="text-sm text-gray-400">ERP</p>
            </div>
            <span>⚙️</span>
          </div>
        </div>

        {/* Menu inferior */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex justify-around py-3">
          <button className="flex flex-col items-center text-purple-400 text-sm">
            🏠
            <span>Home</span>
          </button>

          <button className="flex flex-col items-center text-gray-400 text-sm">
            📋
            <span>Inventários</span>
          </button>

          <button className="flex flex-col items-center text-gray-400 text-sm">
            📦
            <span>Catálogo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
