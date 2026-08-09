const MODEL =
  process.env.OPENROUTER_MODEL ||
  "nvidia/nemotron-3-ultra:free";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  const API_KEY =
    process.env.OPENROUTER_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error:
        "OPENROUTER_API_KEY belum dikonfigurasi."
    });
  }

  try {
    const { messages } = req.body || {};

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return res.status(400).json({
        error: "Messages tidak valid."
      });
    }

    const safeMessages = messages
      .slice(-30)
      .filter(
        (message) =>
          message &&
          ["user", "assistant", "system"].includes(
            message.role
          ) &&
          typeof message.content === "string"
      )
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 20000)
      }));

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Codex"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: safeMessages,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter gagal memproses request."
      });
    }

    const content =
      data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error:
          "Model tidak memberikan respons."
      });
    }

    return res.status(200).json({
      content,
      model: data?.model || MODEL
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error:
        "Terjadi kesalahan pada server."
    });
  }
}
