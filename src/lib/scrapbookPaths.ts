import { toMonthName } from "./dateformatter";

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

	let scrapbookDirectory = `Scrapbook/${year}/${month} ${monthName}/${day}`;

	return scrapbookDirectory;
}

/**
 * Get path to scrapbook dailies note
 */
export function getScrapbookDailyNotePath(prefix: string, date: Date): string {
	let directoryPath = getScrapbookDailyDirectoryPath(date);
	let notePath = `${directoryPath}/${prefix} - .md`;

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
	return `scrap-${fileType}-${index}.${extension}`;
}
