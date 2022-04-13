import moment, {Moment} from "moment";


/**
 * Parse location and dates from the data found in a protocols header.
 * @param locationDate The header section containing location and date.
 */
export function parseLocationDate(locationDate: string) {
    const location = locationDate.split(",")[0];
    const dateDayText = locationDate.split(", ").slice(1).join(", ");
    const dateOnlyText = locationDate.split(" ").slice(-3).join(", ")
    const date = parseHeaderDate(dateOnlyText);

    // sanity checks
    if(!date.isValid()){
        throw new Error("Error parsing date. Tried to parse: " + locationDate);
    }

    return {location, dateDayText, date}
}

/**
 * Parse a german local date string with the monthj written out (e.g. 12. September 2002) into a date object.
 * @param dateString
 */
function parseHeaderDate(dateString: string): Moment {
    const inputFormat = 'D. MMMM YYYY'; // Header date format (e.g. 12. September 2002)
    return moment(dateString, inputFormat, "de");
}


/**
 * Parse a german local date string (e.g. 12.05.2002) into a date object.
 * @param dateString
 */
export function parseStammdatenDate(dateString: string): Moment {
    const inputFormat = 'DD.MM.YYYY'; // Stammdaten date format (e.g. 01.09.1951)
    return moment(dateString, inputFormat, "de");
}