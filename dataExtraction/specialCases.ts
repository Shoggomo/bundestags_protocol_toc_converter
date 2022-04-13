import {matchPageNumberAndSectionOnly} from "./dataExtraction.js";

/**
 * Special fixes for single protocols. Applied before text processing.
 * @param text
 * @param filename
 */
export function preEntryProcessingFixes(text: string, filename: string): string {
    // Apply fixes for specific files
    switch (filename) {
        case "18001.pdf":
            // In 18001 page numbers are in a separate section after all entries. They need to be put after their entries.
            // Find all page numbers at the end.
            const pageNumbers = Array.from(text.matchAll(RegExp(matchPageNumberAndSectionOnly, 'g'))).map(match => match[0]);

            // Append the page numbers to the entries
            const matchSpacedDotsWithSectinEnd = /(?:\. )+\.µ/g;
            let pageNumberIndex = -1;
            text = text.replaceAll(matchSpacedDotsWithSectinEnd, match => {
                pageNumberIndex++;
                return `${match} µ${pageNumbers[pageNumberIndex]}µ`;
            })

            // Remove the page number section at the end
            const wholePageNumberSection = pageNumbers.join("µ");
            text = text.replace(wholePageNumberSection, "");
            break;
    }

    return text;
}


/**
 * Special fixes for single protocols. Applied after text processing.
 * @param text
 * @param filename
 */
export function postEntryProcessingFix(text: string, filename: string): string {
    // Apply fixes for specific files
    switch (filename) {
        case "18044.pdf":
            // In 18044 the page number is missing in the entry "Anlage 23". It was searched manually and is at "4027 A". It needs to be prepended to "Anlage 24".
            const matchMissingPageNumberIn18044 = /ƒ(Anlage 24µErklärung nach § 31)/;
            text = text.replace(matchMissingPageNumberIn18044, "ƒ4027 Aµ$1");
            break;

        case "18223.pdf":
            // In 18223 the header includes an extra section, that needs to be removed. It contains the text "µzugleich 955. Sitzung des Bundesratesµ";
            const matchExtraSection = /µzugleich 955. Sitzung des Bundesratesµ/;
            text = text.replace(matchExtraSection, "µ");
            break;
    }

    return text;

}
