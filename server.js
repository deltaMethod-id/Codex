const MODEL =
  process.env.OPENROUTER_MODEL ||
  "nvidia/nemotron-3-ultra:free";

module.exports = async (req, res) => {
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
        "OPENROUTER_API_KEY belum dikonfigurasi di Vercel."
    });
  }

  try {
    const body = req.body || {};
    const messages = body.messages;

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

    if (safeMessages.length === 0) {
      return res.status(400).json({
        error: "Tidak ada message yang valid."
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${API_KEY}`,

          "Content-Type":
            "application/json",

          "X-Title":
            "Codex"
        },

        body: JSON.stringify({
          model: MODEL,
          messages: safeMessages,
          temperature: 0.7
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "OpenRouter error:",
        data
      );

      return res.status(
        response.status
      ).json({
        error:
          data?.error?.message ||
          "OpenRouter gagal memproses request."
      });
    }

    const content =
      data?.choices?.[0]?.message?.content;

    if (
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(502).json({
        error:
          "Model tidak memberikan respons."
      });
    }

    return res.status(200).json({
      content,
      model:
        data?.model || MODEL
    });

  } catch (error) {
    console.error(
      "Codex server error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Internal Server Error"
    });
  }
};
