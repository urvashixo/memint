import React, { useEffect } from "react";

interface PerplexityMessageParserProps {
  content: string;
  citations?: string[];
}

export function PerplexityMessageParser({
  content,
  citations,
}: PerplexityMessageParserProps) {
  // -----------------------------------------------------
  // STEP 0: LOG RAW DATA
  // -----------------------------------------------------
  useEffect(() => {
    console.group("📥 Perplexity Parser Debug");
    console.log("RAW content:", content);
    console.log("TYPE:", typeof content);
    console.groupEnd();
  }, [content]);

  // -----------------------------------------------------
  // STEP 1: STRIP CODE FENCES IF ANY
  // -----------------------------------------------------
  let cleanedContent: string = content.trim();

  // Detect fenced block: ```json ... ```
  const fencedMatch = cleanedContent.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);

  if (fencedMatch) {
    console.log("📌 Detected fenced code block. Extracting JSON inside.");
    cleanedContent = fencedMatch[1].trim();
  }

  // -----------------------------------------------------
  // STEP 2: TRY PARSING JSON AFTER CLEANUP
  // -----------------------------------------------------
  try {
    const parsed = JSON.parse(cleanedContent);
    console.log("📌 Parsed JSON:", parsed);

    if (parsed?.output) {
      cleanedContent = parsed.output;
      console.log("📌 Extracted parsed.output:", cleanedContent);
    }
  } catch {
    console.log("⚠️ Not valid JSON even after stripping. Using raw.");
  }

  console.log("🧹 Final cleaned content →", cleanedContent);

  // -----------------------------------------------------
  // STEP 3: MARKDOWN PARSER
  // -----------------------------------------------------
  const parseContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).trim();
        const lines = code.split("\n");
        const language = lines[0] || "";
        const codeContent = lines.slice(1).join("\n") || code;

        return (
          <div key={index} className="my-4">
            <div className="bg-gray-900 border border-gray-600 rounded-lg overflow-hidden">
              {language && (
                <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-600">
                  {language}
                </div>
              )}
              <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                <code>{codeContent}</code>
              </pre>
            </div>
          </div>
        );
      }

      return (
        <div key={index} className="whitespace-pre-wrap">
          {formatInlineText(part)}
        </div>
      );
    });
  };

  // -----------------------------------------------------
  // STEP 4: INLINE FORMATTING
  // -----------------------------------------------------
  const formatInlineText = (text: string) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>'
    );
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // -----------------------------------------------------
  // STEP 5: CITATIONS
  // -----------------------------------------------------
  const handleCitationClick = (citation: string) => {
    let url = citation.trim().replace(/^<+|>+$/g, "");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // -----------------------------------------------------
  // FINAL RENDER
  // -----------------------------------------------------
  return (
    <div className="prose prose-invert max-w-none">
      {parseContent(cleanedContent)}

      {citations && citations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-2">Sources:</div>
          <div className="space-y-1">
            {citations.slice(0, 3).map((citation, index) => {
              const cleanUrl = citation.trim().replace(/^<+|>+$/g, "");
              const displayUrl =
                cleanUrl.length > 50
                  ? cleanUrl.substring(0, 50) + "..."
                  : cleanUrl;

              return (
                <div key={index} className="text-xs">
                  <button
                    onClick={() => handleCitationClick(citation)}
                    className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    [{index + 1}] {displayUrl}
                  </button>
                </div>
              );
            })}

            {citations.length > 3 && (
              <div className="text-xs text-gray-500">
                +{citations.length - 3} more sources
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
