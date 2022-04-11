import pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import * as templates from "./xml-templates.mjs";
import {ivzBlock, IvzBlockParams, ivzEintrag, IvzEintragParams, KopfdatenParams} from "./xml-templates.mjs";
import {StammdatenForWP} from "./stammdaten.js";
import fs from "fs";
import format from "xml-formatter";
import {entriesToEntryblocks, extractMetadata, extractTosEntries} from "./dataExtraction.js";
import {PDFDocumentProxy} from "pdfjs-dist/legacy/build/pdf";

/**
 * Config
 */
// TODO put these in start parameters
// const WP = "18";
// const INPUT_FILE_NAME = String.raw`18007-tos.pdf`;

// const INPUT_FOLDER_PATH = "C:\\Users\\VanClausewicz\\Uni - Master\\1. Semester\\Forschungsseminar Digital Humanities\\Bundestagsprotokolle WP1-18\\WP18\\tos\\";

// files to be skipped, maybe they don't work with this script.
const SKIP_FILES: string[] = [
    "18001.pdf",
    "18002.pdf",
    "18003.pdf",
    "18004.pdf",
    "18005.pdf",
    "18006.pdf",
    "18007.pdf",
    "18008.pdf",
    "18009.pdf",
    "18010.pdf",
    "18011.pdf",
    "18012.pdf",
    "18013.pdf",
    "18014.pdf",
    "18015.pdf",
    "18016.pdf",
    "18017.pdf",
    "18018.pdf",
    "18019.pdf",
    "18020.pdf",
    "18021.pdf",
    "18022.pdf",
    "18023.pdf",
    "18024.pdf",
    "18025.pdf",
    "18026.pdf",
    "18027.pdf",
    "18028.pdf",
    "18029.pdf",
    "18030.pdf",
    "18031.pdf",
    "18032.pdf",
    "18033.pdf",
    "18034.pdf",
    "18035.pdf",
    "18036.pdf",
    "18037.pdf",
    "18038.pdf",
    "18039.pdf",
    "18040.pdf",
];

const OUTPUT_FOLDER_PATH = String.raw`./xml_output/`;

/**
 * End Config
 */

// const INPUT_FILE_PATH = INPUT_FOLDER_PATH + INPUT_FILE_NAME;

await main();

async function main() {
    // Split Stammdaten, if not already. Uncomment this lines and comment everything else out.
    // generateStammdatenByWp()
    // process.exit();

    const [wp, inputFolder] = getCliArguments();

    // load ToS file and the stammdaten for the correct wp
    const stammdaten = StammdatenForWP.loadStammdatenForWp(wp);

    // read all PDF files from input folder and convert them
    console.log(`Converting all PDF files in ${inputFolder}`)
    const pdfFiles = fs.readdirSync(inputFolder)
        .filter(file => file.endsWith(".pdf"))
        .filter(file => !SKIP_FILES.includes(file))
        .map(file => inputFolder + file)

    for (const file of pdfFiles) {
        console.log(`Converting file ${file}...`)
        const doc = await pdfjs.getDocument(file).promise;

        const [metadata, xml] = await convertTosDocumentToXml(stammdaten, doc);

        // write Xml file
        const outputFilePath = `${OUTPUT_FOLDER_PATH}${metadata.period.padStart(2, "0")}${metadata.sessionNr.padStart(3, "0")}-vorspann.xml`;
        fs.writeFileSync(outputFilePath, xml, "utf-8");
        console.log("Wrote file " + outputFilePath);
    }
}


async function convertTosDocumentToXml(stammdaten: StammdatenForWP, doc: PDFDocumentProxy): Promise<[KopfdatenParams, string]> {
    const metadata = await extractMetadata(await doc.getPage(1));
    const entries = await extractTosEntries(stammdaten, doc, metadata);
    const blocks = entriesToEntryblocks(entries);

    const xml = generateXml(metadata, blocks);
    return [metadata, xml];
    // console.log(xml)

}

/**
 * Generates an XML string.
 * @param metadata
 * @param blocks
 */
function generateXml(metadata: KopfdatenParams, blocks: Array<IvzBlockParams | IvzEintragParams>) {
    const kopfdaten = templates.kopfdaten(metadata)

    const ivzEintraegeBloecke = blocks.map(e => {
        if ("blockTitel" in e) {
            // e is a block
            return ivzBlock(e);
        } else {
            // e is an entry
            return ivzEintrag(e);
        }
    });

    const vorspann = templates.vorspann({kopfdaten, ivzEintraegeBloecke});

    const formattedXml = format(vorspann, {
        indentation: '  ',
        collapseContent: true,
    });

    return formattedXml;
}


function getCliArguments() {
    const [, , wp, folderPath] = process.argv
    if (!wp || isNaN(Number(wp))) {
        console.error("No Wahlperiode was provided, please pass it as the first argument. Example: npm run start 18 <folder_to_protocol_TOSes>")
        process.exit(1)
    }
    if (!folderPath) {
        console.error("No folder path was provided, please pass it as the second argument. Example: npm run start <wahlperiode> \"/home/user/blah/protocols/tos/\"")
        process.exit(1)
    }

    return [wp, folderPath + "\\"];
}