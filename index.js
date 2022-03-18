// const pdfjs = require("pdfjs");
const pdfjs = require("pdfjs-dist/legacy/build/pdf");
var builder = require('xmlbuilder2');

const path = String.raw`../../../18001-tos.pdf`;

/**
 * XML Tags constants
 */

const INHALTSVERZEICHNIS = "inhaltsverzeichnis";
const IVZ_TITEL = "ivz-titel";
const IVZ_EINTRAG = "ivz-eintrag";
const IVZ_EINTRAG_INHALT = "ivz-eintrag-inhalt";
const A = "a";
const SEITE = "seite";
const SEITENBEREICH = "seitenbereich";
const IVZ_BLOCK = "ivz-block";
const IVZ_BLOCK_TITEL = "ivz-block-titel";
const REDNER = "redner";
const NAME = "name";
const VORNAME = "vorname";
const NACHNAME = "nachname";
const ROLLE = "rolle";
const ROLLE_LANG = "rolle_lang";
const ROLLE_KURZ = "rolle_kurz";
const XREF = "xref";
const HREF = "href";
const TYP = "typ";
const DIV = "div";
const PNR = "pnr";
const REF_TYPE = "ref-type";
const RID = "rid";
const ID = "id";


// a delimiter better than ","  is "µ" (it's less common and not reserved in RegEx)
// ƒ stands for many dots . . . .

pdfjs.getDocument(path).promise
	.catch(console.log)
	.then(async doc => {
		const metadata = {protocolNumber: undefined, sessionNumber: undefined, locationDate: undefined};

		// list of entries in the form of {title, page}
		const entries = [];

		for (let pageNumber = 1; pageNumber < doc.numPages; pageNumber++) {
			const page = await doc.getPage(pageNumber);

			// get text from document and clean it
			const contents = await page.getTextContent();
			let cleanText = cleanPageText(contents);

			let textNoHeader;
			// if page 1, extract metadata, else remove header
			if (page.pageNumber === 1) {
				// remove/save first five Segments (they are metadata)
				const metaSegments = cleanText.split("µ").slice(0, 5);
				metadata.protocolNumber = metaSegments[0];
				metadata.sessionNumber = metaSegments[3];
				metadata.locationDate = metaSegments[4];

				// remove metadata and invisible "Inhaltsverzeichnis" from text
				textNoHeader = cleanText.split("µ").slice(6).join("µ");
				const matchInhaltsverzeichnis = /µInhaltsverzeichnis/g;
				textNoHeader = cleanText.replaceAll(matchInhaltsverzeichnis, "");
			} else {
				// remove first five Segments (they are the header)
				textNoHeader = cleanText.split("µ").slice(3).join("µ");
			}

			const pageEntries = await extractTOSEntries(textNoHeader, page.pageNumber);

			entries.push(...pageEntries)
		}

		// create blocks from entries
		// check if entry starts with "Tagesordnungspunkt", or "Anlage" and merge all following entries in it
		// there can be non-block entries at the beginning


		console.log(metadata)
		console.log(entries)

		const xml = builder.create().ele({
			[INHALTSVERZEICHNIS]: {
				[IVZ_TITEL]: "Inhalt:",
				[IVZ_EINTRAG]: entries,
			}
		}).end({prettyPrint: true})

		console.log(xml)

		/*
		TODOs:
			- split entries into blocks, if applicable (check if there is "Tagesordnungspunkt", or "Anlage" at the beginning)
			- get redner ID from MBD_STAMMDATEN file by name (add error, if name is ambigous)
			- build Rede-ID see in XREF section (https://www.bundestag.de/resource/blob/577234/4c8091d8650fe417016bb48e604e3eaf/dbtplenarprotokoll_kommentiert-data.pdf)
		*/


	})

/**
 *
 * @param cleanedText Clean text without metadata or header. Segments are separated by µ and entries are separated by ƒ.
 * @param pageNumber
 * @returns {Promise<{"[A]": {"@": {"[TYP]": string, "[HREF]": string}, "[SEITENBEREICH]": *, "[SEITE]": *}, "[IVZ_EINTRAG_INHALT]": *}[]>}
 */
async function extractTOSEntries(cleanedText, pageNumber) {
	let text = cleanedText;

	// get page numbers and sections as [string, string] (name, section)
	const lastSegment = text.split("ƒ").reverse()[0];
	const pageNumbersSections = [...lastSegment.matchAll(/\d+ \w+/g)]
		.map(result => result[0])
		.map(pageNumberSection => [pageNumberSection.split(" ")[0], pageNumberSection.split(" ")[1]]);

	// remove page numbers and sections
	text = text.split("ƒ").slice(0, -1).join("ƒ");

	// add entries to list
	const entryNames = text.split("ƒ");

	// sanity check
	if (entryNames.length !== pageNumbersSections.length) {
		console.error("Found page numbers and entries don't match!")
		return;
	}

	return entryNames.map((name, i) => createEntry(name, pageNumbersSections[i][0], pageNumbersSections[i][1]));
}


/**
 * Cleans a pages text formatting for further processing or data extraction. No information is removed here.
 * @param textContents Raw contents from document.
 * @returns {string}
 */
function cleanPageText(textContents) {
	let text = textContents.items.map(item => item.str).join("µ")

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
		const newText = m[0].replaceAll(" µ", " ");
		text = text.replace(m, newText);
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

function createEntry(content, pageNumber, pageSection) {
	return {
		[IVZ_EINTRAG_INHALT]: content,
		[A]: {
			"@": {
				[HREF]: "S" + pageNumber,
				[TYP]: "druckseitennummer",
			},
			[SEITE]: pageNumber,
			[SEITENBEREICH]: pageSection
		}
	}
}