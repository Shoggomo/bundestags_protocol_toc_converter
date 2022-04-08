import {Moment} from "moment";

export type RednerData = {
    id: string,
    titel?: string,
    vorname: string,
    namenszusatz?: string,
    nachname: string,
    ortszusatz?: string,
    fraktion: string,
    rolle?: string,
    rolle_lang?: string,
    rolle_kurz?: string,
    bdland?: string,
};

export type IvzEintragParams = { content: string, pageNumber: string, pageSection: string, redner: RednerData | null }
export type IvzBlockParams = { blockTitel: string, ivzEintraegeParams: IvzEintragParams[] };
export type KopfdatenParams = { period: string, sessionNr: string, location: string, dateDayText: string, date: Moment };
export type VorspannParams = { kopfdaten: string, ivzEintraegeBloecke: string[] };


export function redner(data: RednerData) {
    const {
        id,
        titel,
        vorname,
        namenszusatz,
        nachname,
        ortszusatz,
        fraktion,
        rolle,
        rolle_lang,
        rolle_kurz,
        bdland,
    } = data;

    return `<redner id="${id}">
                            <name>
                                ${titel ? `<titel>${titel}</titel>` : ""}
                                ${vorname ? `<vorname>${vorname}</vorname>` : ""}
                                ${namenszusatz ? `<namenszusatz>${namenszusatz}</namenszusatz>` : ""}
                                ${nachname ? `<nachname>${nachname}</nachname>` : ""}
                                ${ortszusatz ? `<ortszusatz>${ortszusatz}</ortszusatz>` : ""}
                                ${fraktion ? `<fraktion>${fraktion}</fraktion>` : ""}
                                ${rolle ? `<rolle>${rolle}</rolle>` : ""}
                                ${rolle_lang ? `<rolle_lang>${rolle_lang}</rolle_lang>` : ""}
                                ${rolle_kurz ? `<rolle_kurz>${rolle_kurz}</rolle_kurz>` : ""}
                                ${bdland ? `<bdland>${bdland}</bdland>` : ""}
                            </name>
                        </redner>`
}

export function ivzEintrag(data: IvzEintragParams) {

    return `<ivz-eintrag>
				<ivz-eintrag-inhalt>${data.redner ? redner(data.redner) : ""}${data.content}</ivz-eintrag-inhalt>
				<a href="${"S" + data.pageNumber}" typ="druckseitennummer">
					<seite>${data.pageNumber}</seite>
					<seitenbereich>${data.pageSection}</seitenbereich>
				</a>
			</ivz-eintrag>
	`;
}

export function ivzBlock({blockTitel, ivzEintraegeParams}: IvzBlockParams) {
    return `<ivz-block>
                <ivz-block-titel>${blockTitel}</ivz-block-titel>
		    ${ivzEintraegeParams.map(ivzEintrag).join("")}
		    </ivz-block>    
    `;
}

export function kopfdaten({period, sessionNr, location, dateDayText, date}: KopfdatenParams) {
    return `<kopfdaten>
			<plenarprotokoll-nummer>Plenarprotokoll <wahlperiode>${period}</wahlperiode>/<sitzungsnr>${sessionNr}</sitzungsnr>
			</plenarprotokoll-nummer>
			<herausgeber>Deutscher Bundestag</herausgeber>
			<berichtart>Stenografischer Bericht</berichtart>
			<sitzungstitel>
				<sitzungsnr>${sessionNr}</sitzungsnr>. Sitzung</sitzungstitel>
			<veranstaltungsdaten>
				<ort>${location}</ort>, <datum date="${date.format("D.MM.YYYY")}">${dateDayText}</datum>
			</veranstaltungsdaten>
		</kopfdaten>
	`;
}


export function vorspann({kopfdaten, ivzEintraegeBloecke}: VorspannParams) {
    return `	<vorspann>
		${kopfdaten}
		<inhaltsverzeichnis>
            <ivz-titel>Inhalt:</ivz-titel>
		    ${ivzEintraegeBloecke.join("")}		
        </inhaltsverzeichnis>
	</vorspann>
	`;
}
