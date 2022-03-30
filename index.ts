import pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import * as templates from "./xml-templates.mjs";
import {TextContent, TextItem} from "pdfjs-dist/types/src/display/api";
import {ivzBlock, IvzBlockParams, ivzEintrag, IvzEintragParams, KopfdatenParams} from "./xml-templates.mjs";

// load ToS file
const path = String.raw`../../../18001-tos.pdf`;

const doc = await pdfjs.getDocument(path).promise;


// a delimiter better than ","  is "µ" (it's less common and not reserved in RegEx)
// ƒ stands for many dots . . . .

// iterate all pages and collect metadata and tos entries
let metadata: KopfdatenParams | null = null;
const entries: IvzEintragParams[] = [];

for (let pageNumber = 1; pageNumber < doc.numPages + 1; pageNumber++) {
    const page = await doc.getPage(pageNumber);

    // get text from document and clean it
    const contents = await page.getTextContent();
    let cleanText = cleanPageText(contents);

    let textNoHeader = cleanText;
    // if page 1, extract metadata, else remove header
    if (page.pageNumber === 1) {
        // remove/save first five Segments (they are metadata)
        const metaSegments = textNoHeader.split("µ").slice(0, 5);
        metadata = {
            period: metaSegments[0].split(/[ /]/)[1],
            sessionNr: metaSegments[0].split(/[ /]/)[2],
            locationDate: metaSegments[4],
        }

        // remove metadata and invisible "Inhaltsverzeichnis" from text
        textNoHeader = textNoHeader.split("µ").slice(6).join("µ");
        const matchInhaltsverzeichnis = /µInhaltsverzeichnis/g;
        textNoHeader = textNoHeader.replaceAll(matchInhaltsverzeichnis, "");
    } else {
        // remove first couple Segments (they are the header)
        textNoHeader = textNoHeader.split("µ").slice(2).join("µ");
    }

    const pageEntries = await extractTOSEntries(textNoHeader);

    entries.push(...pageEntries)
}

// split entries into blocks (and single entries)

const blocks = entries.reduce((arr, e) => {
    const matchNewBlock = /^(Tagesordnungspunkt \d+: |Anlage \d+ )?(.+)/; // matches a title and puts new block starters like Anlage into group 1, the rest is in group 2 (group 1 may be empty)
    const match = e.content.match(matchNewBlock);
    if(match && match[1]) {
        // add new block
        arr.push({
            blockTitel: match[1],
            ivzEintraegeParams: [],
        });
        e.content = match[2];
    }

    if(arr.length > 0) {
        // add entry to last block
        const lastEntry = arr[arr.length - 1];
        if("blockTitel" in lastEntry){
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


// sanity checks
if (!metadata) {
    throw new Error("No metadata found!")
}

// generate xml

const kopfdaten = templates.kopfdaten(metadata)

console.log(blocks)


const ivzEintraegeBloecke = blocks.map(e => {
    if("blockTitel" in e){
        // e is a block
        return ivzBlock(e);
    } else {
        // e is an entry
        return ivzEintrag(e);
    }
});

const vorspann = templates.vorspann({kopfdaten, ivzEintraegeBloecke});
console.log(vorspann)


/*
TODOs:
	- split entries into blocks, if applicable (check if there is "Tagesordnungspunkt", or "Anlage" at the beginning)
		there can be non-block entries at the beginning
	- get redner ID from MBD_STAMMDATEN file by name (add error, if name is ambigous)
	- build Rede-ID see in XREF section (https://www.bundestag.de/resource/blob/577234/4c8091d8650fe417016bb48e604e3eaf/dbtplenarprotokoll_kommentiert-data.pdf)
*/


/**
 *
 * @param cleanedText Clean text without metadata or header. Segments are separated by µ and entries are separated by ƒ.
 * @returns {Promise<{"[A]": {"@": {"[TYP]": string, "[HREF]": string}, "[SEITENBEREICH]": *, "[SEITE]": *}, "[IVZ_EINTRAG_INHALT]": *}[]>}
 */
function extractTOSEntries(cleanedText: string): IvzEintragParams[] {
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

    return entryNames.map((name, i) => ({
        content: name,
        pageNumber: pageNumbersSections[i][0],
        pageSection: pageNumbersSections[i][1],
        redner: undefined // TODO
    }));
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
