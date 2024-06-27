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
	let year = date.getFullYear();
	let month = date.getMonth() + 1;
	let day = date.getDate();

	return `${year}-${month}-${day}`;
}
