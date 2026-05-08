const API_URL = import.meta.env.VITE_API_URL;

export async function transcreverAudio(file) {
  const formData = new FormData();
  formData.append("audio", file);

  const response = await fetch(`${API_URL}/transcribe`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao transcrever áudio.");
  }

  return data.text;
}

export async function interpretarTextoInventario(texto) {
  const response = await fetch(`${API_URL}/interpret`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texto }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao interpretar texto.");
  }

  return data.itens;
}
