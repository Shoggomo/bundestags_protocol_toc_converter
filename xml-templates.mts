import moment from "moment";

export type RednerParams = { id: string, vorname: string, nachname: string };
export type IvzEintragParams = { content: string, pageNumber: string, pageSection: string, redner?: string }
export type IvzBlockParams = { blockTitel: string, ivzEintraegeParams: IvzEintragParams[] };
export type KopfdatenParams = { period: string, sessionNr: string, locationDate: string };
export type VorspannParams = { kopfdaten: string, ivzEintraegeBloecke: string[] };


export function redner({id, vorname, nachname}: RednerParams) {
    // TODO missing "rolle" here

    return `
                        <redner id="${id}">
                            <name>
                                <vorname>${vorname}</vorname>
                                <nachname>${nachname}</nachname>
                            </name>
                        </redner>`
}

export function ivzEintrag({content, pageNumber, pageSection, redner}: IvzEintragParams) {
    return `			<ivz-eintrag>
				<ivz-eintrag-inhalt>${redner || ""}${content}</ivz-eintrag-inhalt>
				<a href="${"S" + pageNumber}" typ="druckseitennummer">
					<seite>${pageNumber}</seite>
					<seitenbereich>${pageSection}</seitenbereich>
				</a>
			</ivz-eintrag>
	`;
}

export function ivzBlock({blockTitel, ivzEintraegeParams}: IvzBlockParams) {
    return `
            <ivz-block>
                <ivz-block-titel>${blockTitel}</ivz-block-titel>
		    ${ivzEintraegeParams.map(ivzEintrag).join("")}
		    </ivz-block>    
    `;
}


export function kopfdaten({period, sessionNr, locationDate}: KopfdatenParams) {
    const location = locationDate.split(",")[0];
    const dateDayText = locationDate.split(", ").slice(1).join(", ");

    const dateOnlyText = locationDate.split(" ").slice(-3).join(", ")
    const inputFormat = 'D. MMMM YYYY';
    const day = moment(dateOnlyText, inputFormat, "de");
    const parsedDate = day.format("D.MM.YYYY");

    return `		<kopfdaten>
			<plenarprotokoll-nummer>Plenarprotokoll <wahlperiode>${period}</wahlperiode>/<sitzungsnr>${sessionNr}</sitzungsnr>
			</plenarprotokoll-nummer>
			<herausgeber>Deutscher Bundestag</herausgeber>
			<berichtart>Stenografischer Bericht</berichtart>
			<sitzungstitel>
				<sitzungsnr>${sessionNr}</sitzungsnr>. Sitzung</sitzungstitel>
			<veranstaltungsdaten>
				<ort>${location}</ort>, <datum date="${parsedDate}">${dateDayText}</datum>
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
