import { getDayOfWeekAbbrev, toDateProperty, toMonthName } from "./dateformatter";

/**
 * Opinionated scrapbook daily directory path
 * Each scrapbook day is represented by a folder which includes the notes and media for that day
 * @param date
 */
export function getScrapbookDailyDirectoryPath(date: Date): string {
	// Date time parsing
	let year = date.getFullYear();
	let month = date.getMonth() + 1;
	let day = date.getDate();
	let monthName = toMonthName(month - 1);
	let datePrefix = toDateProperty(date);

	let scrapbookDirectory = `Scrapbook/${year}/${month} ${monthName}/${datePrefix} (${getDayOfWeekAbbrev(date)}) Scrap Day`;

	return scrapbookDirectory;
}

/**
 * Get path to scrapbook dailies note
 */
export function getScrapbookDailyNotePath(prefix: string, date: Date, name: string = ""): string {
	let directoryPath = getScrapbookDailyDirectoryPath(date);
	let notePath = `${directoryPath}/${prefix} -${name}.md`;

	return notePath;
}

/**
 * Name of media artifact
 */
export function getMediaArtifactName(
	defaultName: string,
	fileType: string,
	index: string
): string {
	let extension = defaultName.split(".").last();
	return `${index}-scrap-${fileType}.${extension}`;
}
