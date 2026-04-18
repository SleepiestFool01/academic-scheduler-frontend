// Heuristic semester + date extractor for academic-calendar PDFs.
// Output is always a list of { name, startDate, endDate } objects that
// the UI will let the user review and edit before saving — we never
// auto-commit without the user's confirmation, so imperfect parsing is
// survivable.
//
// Strategy:
//   1. Find every "Fall 2026" / "Spring 2027" / "Summer 2026" header in
//      the text (with surrounding character offsets).
//   2. For each header, scan the text window that follows (up to the
//      next header, or ~800 chars) for calendar dates. The earliest
//      date in that window becomes startDate, the latest becomes
//      endDate. If fewer than two dates are found, the semester is
//      still listed but with blank dates for the user to fill in.
//   3. Dedup semesters by name; if the same name appears more than once,
//      merge by taking the earliest start + latest end.

const SEMESTER_WORDS = ["Fall", "Spring", "Summer", "Winter"];
const MONTH_MAP = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
};
const MONTH_PATTERN = Object.keys(MONTH_MAP).join("|");

// Matches "August 17, 2026", "Aug 17 2026", "August 17", and numeric
// forms like "8/17/2026" and "2026-08-17". The caller chooses a default
// year when the match omits one.
const DATE_REGEXES = [
    // Month name + day + optional year
    new RegExp(`\\b(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:(?:st|nd|rd|th))?(?:\\s*,?\\s*(\\d{4}))?\\b`, "gi"),
    // Numeric M/D/YYYY or MM/DD/YYYY
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    // ISO YYYY-MM-DD
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

// Convert a match (from the patterns above) into { year, month, day }.
// `defaultYear` is used when the matched date lacks a year.
function parseDateMatch(regex, match, defaultYear) {
    // Month-name pattern: groups are [name, day, year?]
    if (regex === DATE_REGEXES[0]) {
        const month = MONTH_MAP[match[1].toLowerCase().replace(/\.$/, "")];
        const day = parseInt(match[2], 10);
        const year = match[3] ? parseInt(match[3], 10) : defaultYear;
        if (!month || !day || !year) return null;
        return { year, month, day };
    }
    // M/D/YYYY
    if (regex === DATE_REGEXES[1]) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return { year, month, day };
    }
    // YYYY-MM-DD
    if (regex === DATE_REGEXES[2]) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return { year, month, day };
    }
    return null;
}

function toIso({ year, month, day }) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Find every semester header (e.g. "Fall 2026") with its position in the
// text. Returns [{ name, start: charIdx }] sorted by position.
function findSemesterHeaders(text) {
    const re = new RegExp(`\\b(${SEMESTER_WORDS.join("|")})\\s+(\\d{4})\\b`, "gi");
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        const word = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
        out.push({
            name: `${word} ${m[2]}`,
            year: parseInt(m[2], 10),
            start: m.index,
            end: m.index + m[0].length,
        });
    }
    return out;
}

// Return all dates found in a text window, sorted chronologically.
function findDatesInWindow(window, defaultYear) {
    const found = [];
    for (const re of DATE_REGEXES) {
        re.lastIndex = 0; // regexes with /g are stateful — reset
        let m;
        while ((m = re.exec(window)) !== null) {
            const parsed = parseDateMatch(re, m, defaultYear);
            if (parsed) found.push(parsed);
        }
    }
    // Sort by y/m/d.
    found.sort((a, b) => {
        if (a.year  !== b.year)  return a.year  - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
    });
    return found;
}

// Main entry point. Given raw extracted text, return a list of detected
// semesters with best-guess start/end dates. The caller renders this in
// an editable preview before committing.
export function parseSemestersFromText(text) {
    if (!text || typeof text !== "string") return [];
    const headers = findSemesterHeaders(text);
    if (!headers.length) return [];

    const byName = new Map();
    for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        const windowStart = h.end;
        const windowEnd = headers[i + 1]?.start ?? Math.min(text.length, h.end + 800);
        const window = text.slice(windowStart, windowEnd);
        const dates = findDatesInWindow(window, h.year);

        let startIso = "";
        let endIso   = "";
        if (dates.length >= 2) {
            startIso = toIso(dates[0]);
            endIso   = toIso(dates[dates.length - 1]);
        } else if (dates.length === 1) {
            // One date isn't enough — leave blank and let the user fill.
            startIso = toIso(dates[0]);
        }

        // Merge duplicates by taking widest observed range.
        const existing = byName.get(h.name);
        if (!existing) {
            byName.set(h.name, { name: h.name, startDate: startIso, endDate: endIso });
        } else {
            if (startIso && (!existing.startDate || startIso < existing.startDate)) existing.startDate = startIso;
            if (endIso   && (!existing.endDate   || endIso   > existing.endDate))   existing.endDate   = endIso;
        }
    }
    return Array.from(byName.values());
}
