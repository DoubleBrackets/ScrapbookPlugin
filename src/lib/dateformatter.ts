const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const monthAbbreviations = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function toMonthName(month: number): string {
	return months[month];
}

export function monthAbbreviation(month: number): string {
	return monthAbbreviations[month];
}

/**
 * Convert a date to a string format compatible with Obsidian note properties
 * @param date
 * @returns
 */
export function toDateProperty(date: Date): string {
	let year = date.getFullYear().toString().padStart(4, "0");
	let month = (date.getMonth() + 1).toString().padStart(2, "0");
	let day = date.getDate().toString().padStart(2, "0");

	let text = `${year}-${month}-${day}`;

	return text;
}
