import { serve } from "https://deno.land/std/http/server.ts"

serve(async (req) => {
  try {
    const body = await req.json()

    const tavusRes = await fetch("https://tavusapi.com/v2/conversations", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("0cd13bf3b43a4a419b0eaf056a984d49")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await tavusRes.json()

    return new Response(JSON.stringify(data), {
      status: tavusRes.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})