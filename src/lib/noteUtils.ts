// Utility functions for writing and modifying obsidian markdown notes

/**
 * Search for and replace a yml property in a markdown note
 * @param propertyName
 */
export function setNoteProperty(
	fileContent: string,
	propertyName: string,
	value: string
): string {
	// regex search for the date property and all the text up until a newline
	let propRegex = new RegExp(`${propertyName}:.*\n`, "g");

	return fileContent.replace(propRegex, `${propertyName}: ${value}\n`);
}
