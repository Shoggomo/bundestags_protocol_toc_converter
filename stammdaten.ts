import jsdom from "jsdom";
import fs from "fs";
import {RednerData} from "./xml-templates.mjs";
import {parseStammdatenDate} from "./utils.js";
import {Moment} from "moment";

const STAMMDATEN_FILE = "./MDB_STAMMDATEN.XML";
const STAMMDATEN_WP_FILE = (wp: string) => `./stammdaten_by_wp/MDB_STAMMDATEN_WP${wp}.xml`;

export function loadStammdatenForWp(wp: string) {
    console.log("Parsing STAMMDATEN file for wp" + wp + "...");
    const xml = fs.readFileSync(STAMMDATEN_WP_FILE(wp), "utf-8");
    const dom = new jsdom.JSDOM(xml);
    const doc = dom.window.document;
    console.log("done.")

    return {
        /**
         * Search for a person by the name appearing in the text. It must contain the persons first name and surname.
         * @param fullname String containing the first name and surname. No specific order needed. Can contain other things.
         * @param wp
         * @param date
         */
        getPerson(fullname: string, wp: string, date: Moment): RednerData | null {
            // search for a person via a name that is partly contained in the given full name
            const queryMdb = `//NAME[contains("${fullname}", NACHNAME) and contains("${fullname}", VORNAME)]/../..`;

            const mdbResult = doc.evaluate(queryMdb, doc, null, dom.window.XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

            if (mdbResult.snapshotLength === 0) {
                console.error("No person name found in: " + fullname);
                return null;
            } else if (mdbResult.snapshotLength > 1) {
                console.error("Multiple possible results for: " + fullname);
                // TODO handle multiple results
            }

            const mdb = mdbResult.snapshotItem(0) as Element;


            // find NAME entry, which fits the given date.
            const nameNode = Array.from(mdb.querySelectorAll("NAME")).find(nameEntry => {
                const historieVon = nameEntry.querySelector("HISTORIE_VON")?.textContent?.trim();
                const historieBis = nameEntry.querySelector("HISTORIE_BIS")?.textContent?.trim();

                if (!historieVon) {
                    console.error("No HISTORIE_VON found in NAME for " + fullname);
                    return false;
                }

                // Return true:
                //  - If given date is between HISTORIE_VON and HISTORIE_BIS.
                //  - Or, if HISTORY_BIS does not exist, only check, if given date is after HISTORY_VON.
                if(historieBis){
                    return parseStammdatenDate(historieVon) < date && parseStammdatenDate(historieBis) > date;
                } else {
                    return parseStammdatenDate(historieVon) < date;
                }
            })

            if (!nameNode) {
                console.error(`No name found for date ${date} and name ${fullname}`);
                return null;
            }


            const institutionKindNode = Array.from(mdb.querySelectorAll("INSART_LANG"))
                .find(institutionKind => institutionKind.textContent?.trim() === 'Fraktion/Gruppe');

            const fraktion = institutionKindNode?.parentElement?.querySelector("INS_LANG")?.textContent || "";


            // const fraktion = doc.evaluate(queryFraktionForPerson, mdb, null, dom.window.XPathResult.STRING_TYPE, null).stringValue;
            console.log(fraktion)

            // The HTML parser messes up the structure for some reason (elements become children of other elements for no reason), this is a workaround
            const text = (root: Element, query: string): string => {
                const firstChild = root.querySelector(query)?.firstChild;
                return (firstChild?.nodeType === 3) ? firstChild.textContent || "" : "";
            };

            return {
                id: text(mdb, "ID").trim(),

                titel: text(nameNode, "AKAD_TITEL").trim(),
                vorname: text(nameNode, "VORNAME").trim(),
                namenszusatz: `${text(nameNode, "ADEL")} ${text(nameNode, "PRAEFIX")}`.trim(),
                nachname: text(nameNode, "NACHNAME").trim(),
                ortszusatz: text(nameNode, "ORTSZUSATZ").trim(),

                fraktion: fraktion.trim(),
                rolle: "",    //TODO rolle not always in Stammdaten (e.g. no Bundeskanzler)
                rolle_lang: "",
                rolle_kurz: "",
                bdland: "", //TODO bundesland not in Stammdaten (also never used in actual protocols)
            };
        },
    }
}

/**
 * Splits the MDB_STAMMDATEN file into smaller files for every WP.
 */
export function generateStammdatenByWp() {
    const MIN_WP = 5;
    const MAX_WP = 18;

    console.log("Parsing STAMMDATEN file...");
    const xml = fs.readFileSync(STAMMDATEN_FILE, "utf-8");
    const dom = new jsdom.JSDOM(xml);
    const doc = dom.window.document;
    console.log("done.")

    const generateStammdatenForWp = (wp: string) => {
        const query = `//WAHLPERIODE[WP="${wp}"]/../..`;
        let newXml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE DOCUMENT SYSTEM "MDB_STAMMDATEN.DTD">\n<DOCUMENT>';

        const result = doc.evaluate(query, doc, null, dom.window.XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < result.snapshotLength; i++) {
            // @ts-ignore
            const snapshotXML = result.snapshotItem(i).outerHTML;
            newXml += snapshotXML;
        }

        newXml += "\n</DOCUMENT>";

        return newXml;
    }

    for (let wp = MIN_WP; wp < MAX_WP+1; wp++) {
        const stammdatenWP = generateStammdatenForWp(String(wp));
        fs.writeFileSync(`./stammdaten_by_wp/MDB_STAMMDATEN_WP${wp}.xml`, stammdatenWP, "utf-8");

        console.log("wrote wp " + wp)
    }
}
