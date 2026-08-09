const MODEL =
  process.env.OPENROUTER_MODEL ||
  "nvidia/nemotron-3-ultra:free";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed"
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  try {
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
      return new Response(
        JSON.stringify({
          error: "OPENROUTER_API_KEY belum dikonfigurasi."
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const body = await req.json();
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Messages tidak valid."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const safeMessages = messages
      .slice(-30)
      .filter(
        (m) =>
          m &&
          ["user", "assistant", "system"].includes(m.role) &&
          typeof m.content === "string"
      )
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 20000)
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

      return new Response(
        JSON.stringify({
          error:
            data?.error?.message ||
            "OpenRouter gagal memproses request."
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const content =
      data?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({
          error: "Model tidak memberikan respons."
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        content,
        model: data?.model || MODEL
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Terjadi kesalahan pada server."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
