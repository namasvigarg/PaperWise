import React from "react";

interface Block {
  type: "h1" | "p" | "h2" | "h3" | "h4" | "ul" | "ol" | "table";
  content: any;
}

function parseMarkdown(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let currentTable: string[][] = [];
  let currentList: string[] = [];
  let currentListType: "ul" | "ol" | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "p", content: currentParagraph.join(" ") });
      currentParagraph = [];
    }
  };

  const flushTable = () => {
    if (currentTable.length > 0) {
      blocks.push({ type: "table", content: [...currentTable] });
      currentTable = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0 && currentListType) {
      blocks.push({ type: currentListType, content: [...currentList] });
      currentList = [];
      currentListType = null;
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushTable();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Check if it's a table row
    if (line.startsWith("|") && line.endsWith("|")) {
      flushParagraph();
      flushList();
      
      const cells = line.split("|").map(c => c.trim()).slice(1, -1);
      const isSeparator = cells.every(c => /^:?-+:?$/.test(c));
      
      if (!isSeparator) {
        currentTable.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // 2. Check if it's a header
    if (line.startsWith("# ")) {
      flushAll();
      blocks.push({ type: "h1", content: line.slice(2) });
      continue;
    }
    if (line.startsWith("## ")) {
      flushAll();
      blocks.push({ type: "h2", content: line.slice(3) });
      continue;
    }
    if (line.startsWith("### ")) {
      flushAll();
      blocks.push({ type: "h3", content: line.slice(4) });
      continue;
    }
    if (line.startsWith("#### ")) {
      flushAll();
      blocks.push({ type: "h4", content: line.slice(5) });
      continue;
    }

    // 3. Check if it's a list item
    if (line.startsWith("* ") || line.startsWith("- ")) {
      flushParagraph();
      flushTable();
      if (currentListType !== "ul") {
        flushList();
        currentListType = "ul";
      }
      currentList.push(line.slice(2));
      continue;
    }
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      flushParagraph();
      flushTable();
      if (currentListType !== "ol") {
        flushList();
        currentListType = "ol";
      }
      currentList.push(numberedMatch[2]);
      continue;
    }

    // 4. Blank line
    if (line === "") {
      flushAll();
      continue;
    }

    // 5. Default: paragraph text continuation
    flushTable();
    flushList();
    currentParagraph.push(line);
  }

  flushAll();
  return blocks;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    
    const codeParts = part.split(/(\`.*?\`)/g);
    return codeParts.map((subPart, subIndex) => {
      if (subPart.startsWith("`") && subPart.endsWith("`")) {
        return (
          <code
            key={`${index}-${subIndex}`}
            className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 font-mono text-[10px]"
          >
            {subPart.slice(1, -1)}
          </code>
        );
      }
      return subPart;
    });
  });
}

export default function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const blocks = parseMarkdown(content);

  return (
    <div className="w-full text-slate-300 text-sm leading-relaxed space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={index}
                className="text-xl font-extrabold text-white border-b border-slate-800 pb-3 mt-6 first:mt-1 mb-4 flex items-center gap-2"
              >
                {renderInlineMarkdown(block.content)}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={index}
                className="text-lg font-bold text-white border-b border-slate-800/60 pb-2 mt-8 first:mt-1 mb-4 flex items-center gap-2"
              >
                {renderInlineMarkdown(block.content)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} className="text-base font-semibold text-indigo-400 mt-6 first:mt-1 mb-2">
                {renderInlineMarkdown(block.content)}
              </h3>
            );
          case "h4":
            return (
              <h4 key={index} className="text-sm font-bold text-slate-200 mt-4 first:mt-1 mb-2">
                {renderInlineMarkdown(block.content)}
              </h4>
            );
          case "p":
            return (
              <p key={index} className="text-slate-300 mb-3 leading-relaxed">
                {renderInlineMarkdown(block.content)}
              </p>
            );
          case "ul":
            return (
              <ul key={index} className="list-disc pl-5 space-y-1.5 mb-4 text-slate-300">
                {(block.content as string[]).map((item, idx) => (
                  <li key={idx}>{renderInlineMarkdown(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="list-decimal pl-5 space-y-1.5 mb-4 text-slate-300">
                {(block.content as string[]).map((item, idx) => (
                  <li key={idx}>{renderInlineMarkdown(item)}</li>
                ))}
              </ol>
            );
          case "table": {
            const rows = block.content as string[][];
            if (rows.length === 0) return null;
            const headers = rows[0];
            const bodyRows = rows.slice(1);
            return (
              <div
                key={index}
                className="overflow-x-auto my-6 border border-slate-800/80 rounded-2xl bg-slate-950/40"
              >
                <table className="min-w-full divide-y divide-slate-800/80 text-left text-xs leading-relaxed">
                  <thead className="bg-slate-900/60 text-slate-200">
                    <tr>
                      {headers.map((cell, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 font-semibold border-b border-slate-800/80"
                        >
                          {renderInlineMarkdown(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/10 text-slate-300">
                    {bodyRows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-slate-800/5 transition-colors odd:bg-slate-950/20"
                      >
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 whitespace-normal align-top">
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
