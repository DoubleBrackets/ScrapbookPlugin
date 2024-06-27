import {
    getScrapbookDailyDirectoryPath,
    getScrapbookDailyNotePath,
} from "./lib/scrapbookPaths";
import ScrapbookPlugin from "./main";

export async function convertOldJournal(plugin: ScrapbookPlugin) {
    let vault = plugin.app.vault;
    let mdFiles = vault.getMarkdownFiles();

    let mediaFiles = vault.getFiles();

    // only include image and video files
    mediaFiles = mediaFiles.filter((file) => {
        return (
            file.extension === "png" ||
            file.extension === "jpg" ||
            file.extension === "jpeg" ||
            file.extension === "gif" ||
            file.extension === "mp4"
        );
    });

    for (let file of mdFiles) {
        // Is it a journal entry?
        // get YYYY-MM-DD
        let yearRegex = /^(\d{4})/;
        let monthRegex = /-(\d{1,2})-/;
        let dayRegex = /\d{4}-\d{1,2}-(\d{1,2})/

        let match = file.basename.match(yearRegex);
        if (!match) {
            continue;
        }
        let year = match[1];

        match = file.basename.match(monthRegex);

        if (!match) {
            continue;
        }

        let month = match[1];

        match = file.basename.match(dayRegex);

        if (!match) {
            continue;
        }

        let day = match[1];

        let dateLength = year.length + month.length + day.length + 2;

        let noteTitleContent = file.basename.substring(dateLength + 1);

        let date = new Date(`${year}-${month}-${day}`);
        date.setDate(date.getDate() + 1);

        let directory = getScrapbookDailyDirectoryPath(date);
        let notePath = getScrapbookDailyNotePath(
            plugin.options.dailyNoteNamePrefix,
            date,
            " " + noteTitleContent
        );

        // create the directory
        if (vault.getFolderByPath(directory) === null) {
            vault.createFolder(directory);
        }

        // Copy the file
        let content = await vault.cachedRead(file);
        vault.create(notePath, content);

        // Grab all images and videos created on that day
        let mediaFilesOnDay = mediaFiles.filter((mediaFile) => {
            let mediaDate = new Date(mediaFile.stat.ctime);
            return (
                mediaDate.getFullYear() === date.getFullYear() &&
                mediaDate.getMonth() === date.getMonth() &&
                mediaDate.getDate() === date.getDate()
            );
        });

        // Copy all media into directory
        for (let mediaFile of mediaFilesOnDay) {
            let mediaContent = await vault.readBinary(mediaFile);
            let mediaPath = `${directory}/${mediaFile.name}`;
            vault.createBinary(mediaPath, mediaContent);
        }
    };
}
