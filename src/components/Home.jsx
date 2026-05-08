import { useRef, useState } from "react";
import {
  transcreverAudio,
  interpretarTextoInventario,
} from "../services/vozzyApi";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [itemInterpretado, setItemInterpretado] = useState(null);
  const [itensInventario, setItensInventario] = useState([]);
  const [itemAbertoId, setItemAbertoId] = useState(null);
  const [status, setStatus] = useState("🟢 Pronto para gravar");
  const [erro, setErro] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  function normalizarProduto(produto) {
    return String(produto || "")
      .toLowerCase()
      .trim()
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .replace(/s$/, "");
  }

  function adicionarItensAoInventario(novosItens, textoOriginal) {
    setItensInventario((listaAtual) => {
      const novaLista = [...listaAtual];

      novosItens.forEach((novoItem) => {
        const produtoNormalizado = normalizarProduto(novoItem.produto);
        const quantidade = Number(novoItem.quantidade) || 0;
        const unidade = novoItem.unidade || "unidades";

        const indexExistente = novaLista.findIndex(
          (item) => normalizarProduto(item.produto) === produtoNormalizado,
        );

        if (indexExistente >= 0) {
          const itemExistente = novaLista[indexExistente];

          novaLista[indexExistente] = {
            ...itemExistente,
            quantidade: Number(itemExistente.quantidade) + quantidade,
            textoOriginal,
            historico: [
              ...(itemExistente.historico || []),
              {
                quantidade,
                texto: textoOriginal,
                criadoEm: new Date().toISOString(),
              },
            ],
          };
        } else {
          novaLista.push({
            id: crypto.randomUUID(),
            produto: produtoNormalizado,
            quantidade,
            unidade,
            textoOriginal,
            historico: [
              {
                quantidade,
                texto: textoOriginal,
                criadoEm: new Date().toISOString(),
              },
            ],
          });
        }
      });

      return novaLista;
    });
  }

  async function iniciarGravacao() {
    try {
      setErro("");
      setTranscript("");
      setItemInterpretado(null);
      setStatus("🎙️ Pedindo acesso ao microfone...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setStatus("🔴 Gravando áudio...");
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        setStatus("⏳ Processando áudio...");

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          if (audioBlob.size === 0) {
            throw new Error("O áudio ficou vazio. Tente gravar novamente.");
          }

          const file = new File([audioBlob], "audio.webm", {
            type: "audio/webm",
          });

          setStatus("🧠 Transcrevendo com IA...");
          const textoTranscrito = await transcreverAudio(file);

          setTranscript(textoTranscrito);

          setStatus("📦 Interpretando itens...");
          const resultados = await interpretarTextoInventario(textoTranscrito);

          if (!Array.isArray(resultados)) {
            throw new Error("A interpretação não retornou uma lista válida.");
          }

          setItemInterpretado(resultados[0] || null);
          adicionarItensAoInventario(resultados, textoTranscrito);

          setStatus("✅ Item(ns) somado(s) ao inventário");
        } catch (error) {
          console.error("Erro na transcrição ou interpretação:", error);
          setErro(error.message || "Erro ao processar áudio.");
          setStatus("❌ Erro ao processar");
        } finally {
          setIsProcessing(false);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      setErro(error.message || "Não foi possível acessar o microfone.");
      setStatus("❌ Erro no microfone");
      setIsRecording(false);
    }
  }

  function pararGravacao() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      setStatus("⏹️ Parando gravação...");
      mediaRecorderRef.current.stop();
    }
  }

  async function handleBotaoPrincipal() {
    if (isProcessing) return;

    if (!isRecording) {
      await iniciarGravacao();
    } else {
      pararGravacao();
    }
  }

  function limparInventario() {
    setItensInventario([]);
    setTranscript("");
    setItemInterpretado(null);
    setItemAbertoId(null);
    setErro("");
    setStatus("🟢 Pronto para gravar");
  }

  return (
    <div className="bg-black min-h-screen flex justify-center">
      <div className="w-full max-w-md bg-gradient-to-b from-[#050816] via-[#090d18] to-[#02040a] text-white min-h-screen p-5 pb-24">
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

        <div className="mb-8 flex flex-col items-center">
          <button
            onClick={handleBotaoPrincipal}
            disabled={isProcessing}
            className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl hover:scale-105 transition shadow-lg disabled:opacity-60 ${
              isRecording
                ? "bg-red-600 shadow-red-900/50"
                : "bg-purple-600 shadow-purple-900/50"
            }`}
          >
            {isProcessing ? "⏳" : isRecording ? "⏹️" : "🎤"}
          </button>

          <p className="mt-4 text-lg font-semibold">
            {isProcessing
              ? "Processando..."
              : isRecording
                ? "Gravando..."
                : "Iniciar Contagem"}
          </p>

          <p className="text-sm text-gray-400 text-center">
            {isRecording
              ? "Toque novamente para parar a gravação"
              : "Toque para começar a contar por voz"}
          </p>

          <div className="mt-4 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-center">
            {status}
          </div>

          {erro && (
            <div className="mt-4 w-full bg-red-950/40 border border-red-700 rounded-2xl p-4">
              <p className="text-xs text-red-300 mb-1">Erro</p>
              <p className="text-sm">{erro}</p>
            </div>
          )}

          {transcript && (
            <div className="mt-4 w-full bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Texto capturado</p>
              <p className="text-sm">{transcript}</p>
            </div>
          )}

          {itemInterpretado && (
            <div className="mt-4 w-full bg-purple-950/40 border border-purple-700 rounded-2xl p-4">
              <p className="text-xs text-purple-300 mb-3">
                Primeiro item interpretado
              </p>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-400">Produto:</span>{" "}
                  <strong>{itemInterpretado.produto}</strong>
                </p>

                <p>
                  <span className="text-gray-400">Quantidade:</span>{" "}
                  <strong>{itemInterpretado.quantidade}</strong>
                </p>

                <p>
                  <span className="text-gray-400">Unidade:</span>{" "}
                  <strong>{itemInterpretado.unidade}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="font-semibold">Inventário atual</h2>
              <p className="text-xs text-gray-400">
                {itensInventario.length} produto(s) contado(s)
              </p>
            </div>

            {itensInventario.length > 0 && (
              <button
                onClick={limparInventario}
                className="text-xs bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1 text-gray-300"
              >
                Limpar
              </button>
            )}
          </div>

          {itensInventario.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum item contado ainda.</p>
          ) : (
            <div className="space-y-3">
              {itensInventario.map((item, index) => {
                const aberto = itemAbertoId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setItemAbertoId(aberto ? null : item.id)}
                    className="bg-black/30 border border-zinc-800 rounded-xl p-3 cursor-pointer"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {index + 1}. {item.produto}
                        </p>

                        <p className="text-xs text-purple-400">
                          (+{item.historico?.length || 0} lançamentos)
                        </p>

                        <p className="text-xs text-gray-500">
                          Último falado: {item.textoOriginal}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-300">
                          {item.quantidade}
                        </p>
                        <p className="text-xs text-gray-400">{item.unidade}</p>
                      </div>
                    </div>

                    {aberto && (
                      <div className="mt-3 border-t border-zinc-800 pt-3 space-y-2">
                        <p className="text-xs text-gray-400">
                          Histórico de lançamentos
                        </p>

                        {item.historico.map((h, i) => (
                          <div
                            key={`${item.id}-${i}`}
                            className="flex justify-between gap-3 text-xs bg-zinc-950/60 rounded-lg p-2"
                          >
                            <span className="text-purple-300 font-semibold">
                              +{h.quantidade}
                            </span>
                            <span className="text-gray-400 text-right">
                              {h.texto}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
