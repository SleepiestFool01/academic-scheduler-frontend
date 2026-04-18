// Extract the full text of a PDF File on the client using pdfjs-dist.
// Keeps everything in the browser — no upload to the backend — so the
// document never leaves the user's machine.
//
// Vite-friendly worker setup: the worker source file is imported with
// `?url` so Vite hashes it and serves it from the dev server / build
// output. Doing this at call time (lazy) avoids a top-level side effect
// when the file is imported but not used.

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let workerConfigured = false;
function ensureWorker() {
    if (workerConfigured) return;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    workerConfigured = true;
}

// Returns the full text of the PDF as a single string. Pages are joined
// with double newlines so downstream parsers can treat each page as a
// semi-logical block while still searching across them.
export async function extractTextFromPdf(file) {
    if (!file) throw new Error("No file provided");
    ensureWorker();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // `item.str` is the raw string fragment; joining with spaces is
        // usually fine for academic calendars where tokens are separated
        // visually by whitespace anyway.
        pages.push(content.items.map((it) => it.str).join(" "));
    }
    return pages.join("\n\n");
}
