import pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import * as templates from "./xml-templates.mjs";
import {ivzBlock, IvzBlockParams, ivzEintrag, IvzEintragParams, KopfdatenParams} from "./xml-templates.mjs";
import {StammdatenForWP} from "./stammdaten.js";
import fs from "fs";
import format from "xml-formatter";
import {entriesToEntryblocks, extractMetadata, extractTosEntries} from "./dataExtraction";

/**
 * Config
 */
const INPUT_FILE_NAME = String.raw`18001-tos.pdf`;
const OUTPUT_FILE_NAME = INPUT_FILE_NAME.replace(".pdf", ".xml");

const INPUT_FOLDER_PATH = String.raw`../../../`;
const OUTPUT_FOLDER_PATH = String.raw`./xml_output/`;

/**
 * End Config
 */

const INPUT_FILE_PATH = INPUT_FOLDER_PATH + INPUT_FILE_NAME;
const OUTPUT_FILE_PATH = OUTPUT_FOLDER_PATH + OUTPUT_FILE_NAME;

await main();


async function main() {
    // Split Stammdaten, if not already. Uncomment this lines and comment everything else out.
    // generateStammdatenByWp()
    // process.exit();

    // load ToS file and the stammdaten for the correct wp
    const doc = await pdfjs.getDocument(INPUT_FILE_PATH).promise;

    const stammdaten = StammdatenForWP.loadStammdatenForWp("18");

    const metadata = await extractMetadata(await doc.getPage(1));
    const entries = await extractTosEntries(stammdaten, doc, metadata);
    const blocks = entriesToEntryblocks(entries);

    const xml = generateXml(metadata, blocks);
    console.log(xml)

    // write Xml file
    fs.writeFileSync(OUTPUT_FILE_PATH, xml, "utf-8");
    console.log("Wrote file " + OUTPUT_FILE_PATH);
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
