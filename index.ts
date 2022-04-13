import pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import * as templates from "./xml-templates.js";
import {ivzBlock, IvzBlockParams, ivzEintrag, IvzEintragParams, KopfdatenParams} from "./xml-templates.js";
import {generateStammdatenByWp, StammdatenForWP} from "./stammdaten.js";
import fs from "fs";
import format from "xml-formatter";
import {entriesToEntryblocks, extractMetadata, extractTosEntries} from "./dataExtraction/dataExtraction.js";
import {PDFDocumentProxy} from "pdfjs-dist/legacy/build/pdf";
import {
    ENABLE_OUTPUT,
    GENERATE_STAMMDATEN,
    ONLY_FILES,
    OUTPUT_FOLDER_PATH,
    RUN_ASYNCHRONOUS,
    SKIP_FILES
} from "./Config.js";

await main();

async function main() {

    if (GENERATE_STAMMDATEN) {
        // Generate Stammdaten files and exit.
        console.log("Generating Stammdaten files and putting them in stammdaten_by_wp. This will take a while.")
        generateStammdatenByWp()
        console.log("Done. Exiting.")
        process.exit(0);
    }

    const [wp, inputFolder] = getCliArguments();

    // load ToS file and the stammdaten for the correct wp
    const stammdaten = StammdatenForWP.loadStammdatenForWp(wp);

    // read all PDF files from input folder and convert them
    console.log(`Converting all PDF files in ${inputFolder}`)
    const pdfFiles = fs.readdirSync(inputFolder)
        .filter(file => file.endsWith(".pdf"))
        .filter(file => ONLY_FILES.length === 0 || ONLY_FILES.includes(file))
        .filter(file => !SKIP_FILES.includes(file));


    if (RUN_ASYNCHRONOUS) {
        for (const file of pdfFiles) {
            processFile(inputFolder, stammdaten, file);
        }
    } else {
        for (const file of pdfFiles) {
            await processFile(inputFolder, stammdaten, file);
        }
    }
}

async function processFile(inputFolder: string, stammdaten: StammdatenForWP, file: string) {
    try {
        console.log(`Converting file ${file}...`)
        const doc = await pdfjs.getDocument(inputFolder + file).promise;

        const [metadata, xml] = await convertTosDocumentToXml(stammdaten, doc, file);

        if (ENABLE_OUTPUT) {
            // write Xml file
            const outputFilePath = `${OUTPUT_FOLDER_PATH}${metadata.period.padStart(2, "0")}${metadata.sessionNr.padStart(3, "0")}-vorspann.xml`;
            fs.writeFileSync(outputFilePath, xml, "utf-8");
            console.log(`Wrote file ${outputFilePath}\n`);
        } else {
            console.log(`Processed file ${file}\n`);
        }
    } catch (e) {
        console.error(`Conversion failed. Skipping file ${file}.\n${e}\n`)
    }
}


async function convertTosDocumentToXml(stammdaten: StammdatenForWP, doc: PDFDocumentProxy, filename: string): Promise<[KopfdatenParams, string]> {
    const metadata = await extractMetadata(await doc.getPage(1), filename);
    const entries = await extractTosEntries(stammdaten, doc, metadata, filename);
    const blocks = entriesToEntryblocks(entries);

    const xml = generateXml(metadata, blocks);
    return [metadata, xml];
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