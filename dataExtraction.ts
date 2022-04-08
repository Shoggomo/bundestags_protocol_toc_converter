import {TextContent, TextItem} from "pdfjs-dist/types/src/display/api";
import {StammdatenForWP} from "./stammdaten";
import {PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist/legacy/build/pdf";
import {IvzBlockParams, IvzEintragParams, KopfdatenParams, RednerData} from "./xml-templates.mjs";
import {Moment} from "moment";
import {parseLocationDate} from "./utils";


/*
 * The "µ" character is used to separate text sections
 * The "ƒ" character is used to separate tos entries
 */

/**
 * Extracts metadata from the first protocol page.
 * @param firstPage
 */
export async function extractMetadata(firstPage: PDFPageProxy): Promise<KopfdatenParams> {
    // get text from document and clean it
    const contents = await firstPage.getTextContent();
    let cleanText = cleanPageText(contents);
    const metaSegments = cleanText.split("µ").slice(0, 5);

    const locationDateData = parseLocationDate(metaSegments[4]);

    return {
        period: metaSegments[0].split(/[ /]/)[1],
        sessionNr: metaSegments[0].split(/[ /]/)[2],
        ...locationDateData
    }
}

/**
 * Extracts TOS entries from the protocols TOS pages.
 * @param stammdaten
 * @param doc
 * @param metadata
 */
export async function extractTosEntries(stammdaten: StammdatenForWP, doc: PDFDocumentProxy, metadata: KopfdatenParams) {
    const entries: IvzEintragParams[] = [];

    for (let pageNumber = 1; pageNumber < doc.numPages + 1; pageNumber++) {
        const page = await doc.getPage(pageNumber);

        // get text from document and clean it
        const contents = await page.getTextContent();
        let cleanText = cleanPageText(contents);

        let textNoHeader;
        // if page 1, extract metadata, else remove header
        if (page.pageNumber === 1) {
            // remove metadata sections and invisible "Inhaltsverzeichnis" from text
            textNoHeader = cleanText.split("µ").slice(6).join("µ");
            const matchInhaltsverzeichnis = /µInhaltsverzeichnis/g;
            textNoHeader = textNoHeader.replaceAll(matchInhaltsverzeichnis, "");
        } else {
            // remove first couple Segments (they are the header)
            textNoHeader = cleanText.split("µ").slice(2).join("µ");
        }

        const pageEntries = extractTOSEntriesFromPage(stammdaten, textNoHeader, metadata.period, metadata.date);

        entries.push(...pageEntries)
    }
    return entries;
}

/**
 * Collapses multiple TOS entries into multiple entry blocks, if there are block separators (e.g. Tagesordnungspunkt, Anlage, ...)
 * @param entries
 */
export function entriesToEntryblocks(entries: IvzEintragParams[]) {
    const blocks = entries.reduce((arr, e) => {
        const matchNewBlock = /^(Tagesordnungspunkt \d+: |Anlage \d+ )?(.+)/; // matches a title and puts new block starters like Anlage into group 1, the rest is in group 2 (group 1 may be empty)
        const match = e.content.match(matchNewBlock);
        if (match && match[1]) {
            // add new block
            arr.push({
                blockTitel: match[1],
                ivzEintraegeParams: [],
            });
            e.content = match[2];
        }

        if (arr.length > 0) {
            // add entry to last block
            const lastEntry = arr[arr.length - 1];
            if ("blockTitel" in lastEntry) {
                // last entry is a block
                lastEntry.ivzEintraegeParams.push(e)
            } else {
                // last entry is not a block (not sure, how this would happen)
                throw new Error("Non-block item found.")
            }
        } else {
            // first entry without block; add entry without block
            arr.push(e)
        }

        return arr;
    }, [] as Array<IvzEintragParams | IvzBlockParams>)
    return blocks;
}

/**
 *  Extracts TOS entries from one protocol page.
 * @param stammdaten
 * @param cleanedText Clean text without metadata or header. Segments are separated by µ and entries are separated by ƒ.
 * @param wp
 * @param sessionDate
 */
function extractTOSEntriesFromPage(stammdaten: StammdatenForWP, cleanedText: string, wp: string, sessionDate: Moment): IvzEintragParams[] {
    let text = cleanedText;

    // get page numbers and sections as [string, string] (name, section)
    const lastSegment = text.split("ƒ").reverse()[0];
    const pageNumbersSections = [...lastSegment.matchAll(/\d+ \w+/g)]
        .map(result => result[0])
        .map(pageNumberSection => [pageNumberSection.split(" ")[0], pageNumberSection.split(" ")[1]]);

    // remove page numbers and sections
    text = text.split("ƒ").slice(0, -1).join("ƒ");

    // replace µs with whitespace
    text = text.replaceAll("µ", " ");

    // add entries to list
    const entryNames = text.split("ƒ");

    // sanity check
    if (entryNames.length !== pageNumbersSections.length) {
        throw new Error("Found page numbers and entries don't match!");
    }


    return entryNames.map((content, i) => {

        console.log("\n" + content)

        // Tagesordnungspunkt, Anlage cannot contain Redner
        const matchStartsWithTopAnlage = /^(Tagesordnungspunkt|Anlage)/;

        const rednerData: RednerData | null = matchStartsWithTopAnlage.test(content) ?
            null :
            stammdaten.getPerson(content, wp, sessionDate);

        return {
            content: content,
            pageNumber: pageNumbersSections[i][0],
            pageSection: pageNumbersSections[i][1],
            redner: rednerData,
        }
    });
}

/**
 * Cleans a pages text formatting for further processing or data extraction. No information is removed here.
 * @param textContents Raw contents from document.
 * @returns {string} Clean text without metadata or header. Segments are separated by µ and entries are separated by ƒ.
 */
function cleanPageText(textContents: TextContent) {
    let text = textContents.items.map(item => (item as TextItem).str).join("µ")

    // clean text content
    // remove hyphens
    // there might be empty space before the actual hyphen
    // there are two types of hyphen. This type is only used to split a word
    const matchHyphensBeforeDelimiter = /[ µ]*-µ/g;
    text = text.replaceAll(matchHyphensBeforeDelimiter, "");

    // replace dots with ƒ
    const matchManyDotsWithSpaces = /(?:\. ?){2,}/g;
    text = text.replaceAll(matchManyDotsWithSpaces, "ƒ");

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

    return text;
}