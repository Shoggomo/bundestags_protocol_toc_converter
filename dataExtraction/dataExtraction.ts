import {TextContent, TextItem} from "pdfjs-dist/types/src/display/api";
import {StammdatenForWP} from "../stammdaten.js";
import {PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist/legacy/build/pdf";
import {IvzBlockParams, IvzEintragParams, KopfdatenParams, RednerData} from "../xml-templates.js";
import {Moment} from "moment";
import {parseLocationDate} from "../timeParsing.js";
import {SKIP_PAGES} from "../Config.js";
import {postEntryProcessingFix, preEntryProcessingFixes} from "./specialCases.js";


/*
 * Note:
 * The "µ" character is used to separate text sections
 * The "ƒ" character is used to separate tos entries
 */


/**
 * Regex rule, that marks a new block. Every list entry is a possible beginning of a block.
 */
export const matchBlockmarkers = `^(${[
    "Tagesordnungspunkt \\d+: ",
    "Zusatztagesordnungspunkt \\d+: ",
    "Anlage \\d+",
    "Zur Geschäftsordnung",
].join("|")})`;

/**
 * Matches a page number with potential sections following.
 * Groups:
 *  1. Page numbers (e.g. 123)
 *  2. Page sections (e.g. A or B/D)
 * Example matches:
 *  123
 *  123 A
 *  123 B/D
 */
export const matchPageNumberAndSectionOnly = String.raw`(\d+) ?([ABCD](?:\/[ABCD])?)`;

/**
 * Matches text, that begins with a page number and sections (optional) and the following text (optional).
 * Groups:
 *  1. Page numbers (e.g. 123)
 *  2. Page sections (e.g. A or B/D)
 *  3. Text following
 * Example matches:
 *  213 AµVersammlung blah.
 *  123 B/C
 *  3123µBesprechung über blah
 */
const matchPageNumbersWithFollowingTextAtBeginning = `^${matchPageNumberAndSectionOnly}µ?((?:.+)?)`;


/**
 * Extracts metadata from the first protocol page.
 * @param firstPage
 * @param filename
 */
export async function extractMetadata(firstPage: PDFPageProxy, filename: string): Promise<KopfdatenParams> {
    // get text from document and clean it
    const contents = await firstPage.getTextContent();
    let entries = extractEntries(contents, filename);
    let header = entries[0];

    // Sometimes the session number and ". Sitzung" text are separated in two sections (e.g. "201µ. Sitzung").
    // Normally they are in one section (e.g. "199. Sitzung").
    // Here we remove a section end after the session number.
    const matchSectionEndAfterSessionNr = /µ(\d{1,3})µ\./;
    header = header.replace(matchSectionEndAfterSessionNr, "µ$1.")

    const metaSegments = header.split("µ").slice(0, 5);

    const locationDateData = parseLocationDate(metaSegments[4]);

    const [, period, sessionNr] = metaSegments[0].split(/[ /]/);

    // sanity checks
    const matchPeriod = /\d\d?/;
    if (!matchPeriod.test(period)) {
        throw new Error("No fitting period found in metadata. Found: " + period);
    }

    const matchSessionNr = /\d{1,3}/;
    if (!matchSessionNr.test(sessionNr)) {
        throw new Error("No fitting session number found in metadata. Found: " + sessionNr);
    }

    return {
        period,
        sessionNr,
        ...locationDateData
    }
}

/**
 * Extracts TOS entries from the protocols TOS pages.
 * @param stammdaten
 * @param doc
 * @param metadata
 */
export async function extractTosEntries(stammdaten: StammdatenForWP, doc: PDFDocumentProxy, metadata: KopfdatenParams, filename: string) {
    const entries: IvzEintragParams[] = [];
    let lastCutOfEntryContent = "";

    for (let pageNumber = 1 + SKIP_PAGES; pageNumber < doc.numPages + 1; pageNumber++) {
        const page = await doc.getPage(pageNumber);

        // get text from document and clean it
        const contents = await page.getTextContent();
        let pageEntries = extractEntries(contents, filename);

        // remove header
        if (page.pageNumber === 1) {
            // remove metadata sections (everything up to "Inhalt:µ" or "I n h a l t :µ")
            const matchInhalt = /^.+(?:(?:Inhalt)|(?:I n h a l t )):µ/;
            pageEntries[0] = pageEntries[0].replace(matchInhalt, "");

            // remove invisible "Inhaltsverzeichnis" text. It's at the end of the first page.
            const lastIndex = pageEntries.length-1;
            const matchInhaltsverzeichnis = /µInhaltsverzeichnis/g;
            pageEntries[lastIndex] = pageEntries[lastIndex].replace(matchInhaltsverzeichnis, "");
        } else {
            // remove first couple Segments (they are the header)
            pageEntries[0] = pageEntries[0].split("µ").slice(2).join("µ");
        }

        const [entriesData, lc] = extractTOSEntriesFromPage(stammdaten, pageEntries, metadata.period, metadata.date, lastCutOfEntryContent);
        lastCutOfEntryContent = lc;

        entries.push(...entriesData)
    }
    return entries;
}

/**
 * Collapses multiple TOS entries into multiple entry blocks, if there are block separators (e.g. Tagesordnungspunkt, Anlage, ...)
 * @param entries
 */
export function entriesToEntryblocks(entries: IvzEintragParams[]) {
    const blocks = entries.reduce((arr, e) => {
        const matchNewBlock = new RegExp(`${matchBlockmarkers}?(.+)`); // matches a title and puts new block starters like Anlage into group 1, the rest is in group 2 (group 1 may be empty)
        const match = e.content.match(matchNewBlock);

        if (match && match[1]) {
            console.log("New entry block found: " + match[1])

            // add new block
            arr.push({
                blockTitel: match[1],
                ivzEintraegeParams: [],
            });
            e.content = match[2];
        }

        // add entry to last block
        const lastEntry = arr[arr.length - 1];
        if (lastEntry && "blockTitel" in lastEntry) {
            // last entry exists and is a block
            lastEntry.ivzEintraegeParams.push(e)
        } else {
            // last entry is not a block or does not exist (can happen, if first couple entries are not blocks)
            arr.push(e)
        }

        return arr;
    }, [] as Array<IvzEintragParams | IvzBlockParams>)
    return blocks;
}

/**
 *  Extracts TOS entries from one protocol page.
 * @param stammdaten
 * @param entries Single entries.
 * @param wp
 * @param sessionDate
 * @param lastCutOffEntryContent Can contain content, that was cut of the last page and needs to be prepended to the first entry.
 * @returns The entries and possibly a cut off last entry, without page number.
 */
function extractTOSEntriesFromPage(stammdaten: StammdatenForWP, entries: string[], wp: string, sessionDate: Moment, lastCutOffEntryContent: string): [IvzEintragParams[], string] {
    let newCutOffEntryContent = "";

    // Check, if every entry has a page number
    if (!entries.slice(1).every(entry => entry.match(matchPageNumbersWithFollowingTextAtBeginning))) {
        console.log(JSON.stringify(entries));
        throw new Error(`Found page numbers and entries don't match!`);
    }

    // Check, if the current page is a white page. If so, return no entries.
    if(entries.length === 0 || entries.every(entry => entry.trim() === "")){
        console.log("White page found. Skipping.")
        return [[], ""];
    }

    // Extract page numbers. At the beginning of every entry is the number of the last entry, so we skip the first entry.
    // The entry extraction could be improved, that this is not necessary.
    const pageNumbersSections: Array<[string, string]> = entries.slice(1).map((entry, index, array) => {
        const [, pageNumber, pageSection, content] = entry.match(matchPageNumbersWithFollowingTextAtBeginning) || ["", "", ""];

        if (!pageNumber) throw new Error("Could not find page number at the beginning of " + entry);

        // Save the content of the last entry. Normally there is none. If there is it is cut off and belongs to the next page.
        if (index === array.length - 1) {
            newCutOffEntryContent = content;
        }
        return [pageNumber, pageSection];
    });

    // Remove page numbers from entries, skipping first entry, remove and save potentially cut of content at last entry
    entries = [entries[0], ...entries.slice(1, -1).map(entry => {
        // match page numbers and page sections at the beginning and following text
        const match = entry.match(`^${matchPageNumberAndSectionOnly}µ?(.+)`);
        if (!match?.[3]) throw new Error("Could not fine name of entry in " + entry);
        return match[3];
    })]

    // Add the (potentially existing) last cut off entry content from the last page to the first entry fro this page
    if (entries[0]) {
        entries[0] = `${lastCutOffEntryContent} ${entries[0]}`.trim();
    }

    // replace µs with whitespace
    entries = entries.map(entry => entry.replaceAll("µ", " "))

    return [
        entries.map((content, i) => {
            console.log("\n" + content)

            const rednerData: RednerData | null = new RegExp(matchBlockmarkers).test(content) ?
                null :
                stammdaten.getPerson(content, wp, sessionDate);

            return {
                content: content,
                pageNumber: pageNumbersSections[i][0],
                pageSection: pageNumbersSections[i][1],
                redner: rednerData,
            };
        }),
        newCutOffEntryContent
    ];
}

/**
 * Extracts single entries from a page.
 * @param textContents Raw contents from document.
 * @param filename
 * @returns string[] List with page entries. Segments are separated by µ.
 */
function extractEntries(textContents: TextContent, filename: string) {
    let text = textContents.items.map(item => (item as TextItem).str).join("µ")

    // Fix single errors before further processing.
    text = preEntryProcessingFixes(text, filename);

    // clean text content
    // remove hyphens
    // there might be empty space before the actual hyphen
    // there are two types of hyphen. This type is only used to split a word
    const matchHyphensBeforeDelimiter = /[ µ]*-µ/g;
    text = text.replaceAll(matchHyphensBeforeDelimiter, "");

    // replace spaced dots, that are followed by a page number with ƒ ("Stefan Müller . . . . . . .µ µ123" => Stefan Müllerƒ123)
    const matchManyDotsWithSpacesFollowedByPageNumber = RegExp(` ?(?:\\. )*\\.?µ µ${matchPageNumberAndSectionOnly}(?:µ|$)`, "g");
    text = text.replaceAll(matchManyDotsWithSpacesFollowedByPageNumber, "ƒ$1 $2");

    // remove other spaced dots (these are normally wrong formatting)
    const matchManyDotsWithSpaces = /(?:\. )+\.µ/g;
    text = text.replaceAll(matchManyDotsWithSpaces, "");

    // reduce multiple delimiters to one
    const matchMultipleDelimiters = /µµ+/g;
    text = text.replaceAll(matchMultipleDelimiters, "µ");

    // detect and fix justified alignment (Blocksatz)
    // join single word segments
    const matchWordsWithSpaceFollowing = /µ([\wäöüß]+)µ /g; // single word with space following => remove delimiter at end: "µ$1 "
    const matchMultipleWordsWithDelimitersAtBeginning = /µ[\wäöüß]+ (?:µ[\wäöüß]+ )*µ[\wäöüß]+/g; // multiple words with delimiters only at their beginning

    text = text.replaceAll(matchWordsWithSpaceFollowing, "µ$1 ");
    [...text.matchAll(matchMultipleWordsWithDelimitersAtBeginning)].forEach(m => {
        // remove the delimiter for every single word
        const newText = m[0].replaceAll(" µ", " ");
        text = text.replace(m[0], newText);
    })

    // merge bullet points with next line
    const matchBulletPoint = /–µ µ/g;
    text = text.replaceAll(matchBulletPoint, "– ");

    // remove randomly repeating µs
    const matchRepeatingMu = /µ µ/g;
    text = text.replaceAll(matchRepeatingMu, "µ");

    // repair false whitespaces after slashes (e.g. in party names) ((BÜNDNIS 90/µDIE GRÜNEN) => (BÜNDNIS 90/DIE GRÜNEN))
    const matchSlashWhitespace = /\/µ/g;
    text = text.replaceAll(matchSlashWhitespace, "/");

    // remove spaces around µ
    const matchMuWithWhitespace = /( +µ)|(µ +)|( +µ +)/g;
    text = text.replaceAll(matchMuWithWhitespace, "µ");

    // remove spaces around ƒ
    const matchF = /( +ƒ)|(ƒ +)|( +ƒ +)/g;
    text = text.replaceAll(matchF, "ƒ");

    // remove µs around ƒ
    const matchFSurroundedByMu = /µ?ƒµ?/g;
    text = text.replaceAll(matchFSurroundedByMu, "ƒ");

    // regular strange behaviour: some special letters get separated before and after (e.g. ğ in the name Dağdelen) they need to be merged in the surrounding sections
    // cases like these can be found by searching all resulting files with this rule, which matches surrounded single letters (non-ascii letters included): " \p{Ll} "
    const matchSpacedSpecialLetters = /µ([ğ])µ/g;
    text = text.replaceAll(matchSpacedSpecialLetters, "$1");

    // Fix single errors.
    text = postEntryProcessingFix(text, filename);

    // split into entries
    let entries = text.split("ƒ");

    return entries;
}
