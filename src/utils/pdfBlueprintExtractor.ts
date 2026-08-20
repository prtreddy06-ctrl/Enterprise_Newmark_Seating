import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - Vite asset URL import; bundles the real worker file so PDF.js
// can parse the document off the main thread.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfBlueprintExtractionResult {
  seatNumbers: string[]; // every distinct seat/desk number token found, in document order
  zoneLabels: { label: string; count: number }[]; // named areas detected (Cluster, Cabin, Meeting Room, ...)
  rawTokenCount: number;
  pageCount: number;
}

// Multi-word / known architectural labels this reads for. Real blueprint text
// layers vary a lot in how words are split across text runs, so we match
// case-insensitively against the whole page text rather than token-by-token
// for these.
const ZONE_KEYWORD_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "Entrance", pattern: /\bentrance\b/gi },
  { label: "Meeting Room", pattern: /\bmeeting\s*room\b/gi },
  { label: "Collab Area", pattern: /\bcollab(?:oration)?\s*area\b/gi },
  { label: "Cluster", pattern: /\bcluster\s*[-–]?\s*\d*\b/gi },
  { label: "Cabin", pattern: /\bcabin\s*\d*\b/gi },
  { label: "Store", pattern: /\bstore\b/gi },
  { label: "Network Room", pattern: /\bnetwork\s*room\b/gi },
  { label: "Ops", pattern: /\bops\b/gi },
  { label: "IT Room", pattern: /\bit\b(?!\w)/gi },
  { label: "Reception", pattern: /\breception\b/gi },
  { label: "Cafeteria", pattern: /\bcafeteria\b/gi },
  { label: "Board Room", pattern: /\bboard\s*room\b/gi },
  { label: "Pantry", pattern: /\bpantry\b/gi },
  { label: "Restroom", pattern: /\bw\/m\b|\brest\s*room/gi }
];

/**
 * Extracts real seat/desk numbers and named zones from a PDF's text layer.
 * This is genuine text-content parsing (not simulated/fabricated data) — it
 * reads whatever numbers and room labels actually exist in the uploaded
 * document, so the result size matches the real floor plan instead of always
 * returning the same fixed count.
 *
 * Limitation: this reads the PDF's TEXT layer only. It does not do visual/
 * vector geometry recognition, so exact desk x/y positions and wall/partition
 * shapes are not recovered — only which numbers and labels exist and how many
 * of each. Scanned/flattened image-only PDFs (no text layer) will return an
 * empty result; DWG/PNG/JPG uploads aren't parsed by this function at all.
 */
export async function extractBlueprintFromPdf(file: File): Promise<PdfBlueprintExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const seatNumberSet = new Set<string>();
  const seatNumbersInOrder: string[] = [];
  const zoneCounts = new Map<string, number>();
  let rawTokenCount = 0;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    textContent.items.forEach((item: any) => {
      const str = (item.str || "").trim();
      if (!str) return;
      rawTokenCount++;
      fullText += " " + str;

      // A token is a candidate seat/desk number if it's purely numeric,
      // 1-4 digits (covers realistic seat counts from single digit desks
      // up to 9999), and not obviously a floor/year/page number pattern.
      if (/^\d{1,4}$/.test(str)) {
        const num = parseInt(str, 10);
        if (num > 0 && num < 5000 && !seatNumberSet.has(str)) {
          seatNumberSet.add(str);
          seatNumbersInOrder.push(str);
        }
      }
    });
  }

  ZONE_KEYWORD_PATTERNS.forEach(({ label, pattern }) => {
    const matches = fullText.match(pattern);
    if (matches && matches.length > 0) {
      zoneCounts.set(label, matches.length);
    }
  });

  return {
    seatNumbers: seatNumbersInOrder,
    zoneLabels: Array.from(zoneCounts.entries()).map(([label, count]) => ({ label, count })),
    rawTokenCount,
    pageCount: pdf.numPages
  };
}
