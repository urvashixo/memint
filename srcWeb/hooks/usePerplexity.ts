import { useState } from 'react'

const API_KEY = import.meta.env.VITE_PERPLEXITY_KEY;
const API_URL = 'https://api.perplexity.ai/chat/completions'

interface ChatContext {
  role: 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  output: string
  citations: string[]
}

export function usePerplexity() {
  const [isPerplexityLoading, setIsPerplexityLoading] = useState(false)

  const sendToPerplexity = async (
    message: string,
    context: ChatContext[] = [],
    toolData?: any
  ): Promise<PerplexityResponse> => {

    setIsPerplexityLoading(true)

    try {
      // Build user prompt
      let userPrompt = message

      if (toolData) {
        userPrompt += `\n\nTool Data: ${JSON.stringify(toolData, null, 2)}`
        userPrompt += '\n\nPlease analyze this data and provide biological insights.'
      }

      if (context.length > 0) {
        const ctx = context
          .slice(-10)
          .map(c => `${c.role}: ${c.content}`)
          .join('\n')

        userPrompt = `Previous conversation:\n${ctx}\n\nCurrent message: ${userPrompt}`
      }

      // SYSTEM INSTRUCTIONS — MUST ALWAYS BE SYSTEM ROLE
      const systemPrompt = `
You are Neo, an AI assistant for MedMint.

Respond ONLY in the following strict JSON format:

{
  "output": "<your answer>",
  "citations": ["<url1>", "<url2>"]
}

RULES:
- NEVER use markdown.
- NEVER wrap in \`\`\`json.
- NEVER add text before or after the JSON.
- "output" must be a concise biological explanation.
- "citations" must be direct URLs from PDB, PubMed, UniProt, EBI, etc.
- If asked about any PDB ID, first identify the protein name, then answer.
- PDB 2QWO is linked to pancreatic cancer because DNAJA1 acts as a co-chaperone for DnaK.
      `.trim()

      // API CALL
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 1200,
          temperature: 0.2,
          top_p: 0.9,
          return_citations: false, // We want citations ONLY inside JSON
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      const rawContent = data.choices?.[0]?.message?.content || ""

      // -------------------------------------------------
      // CLEAN JSON — extract from fenced code block if needed
      // -------------------------------------------------
      let cleaned = rawContent.trim()

      // Example Perplexity output:
      // ```json
      // { "output": "...", "citations": [] }
      // ```
      const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i)
      if (fencedMatch) {
        cleaned = fencedMatch[1].trim()
      }

      // Remove stray backticks if any
      cleaned = cleaned.replace(/^```|```$/g, "").trim()

      // -------------------------------------------------
      // Try parsing final cleaned JSON
      // -------------------------------------------------
      try {
        const parsed = JSON.parse(cleaned)
        return {
          output: parsed.output ?? cleaned,
          citations: parsed.citations ?? []
        }
      } catch (err) {
        console.warn("❌ Failed to parse JSON. Raw content:", cleaned)
        return {
          output: cleaned,
          citations: []
        }
      }

    } catch (error: any) {
      console.error("Perplexity API error:", error)

      if (error.message?.includes("401") || error.message?.includes("API key")) {
        return {
          output: "There is an issue with the API key.",
          citations: []
        }
      }

      return {
        output: "Sorry, I encountered an error. Please try again.",
        citations: []
      }

    } finally {
      setIsPerplexityLoading(false)
    }
  }

  return {
    sendToPerplexity,
    isPerplexityLoading
  }
}
