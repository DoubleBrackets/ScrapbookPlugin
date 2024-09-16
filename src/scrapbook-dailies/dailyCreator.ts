import {
	Notice,
	Plugin,
	TFile,
	Vault,
	WorkspaceLeaf,
	Modal,
	requestUrl,
	TAbstractFile,
} from "obsidian";
import ScrapbookPlugin from "src/main";
import { toDateProperty, toMonthName } from "src/lib/dateformatter";
import axios from "axios";
import {
	GooglePhotosDate,
	GooglePhotosDateFilter,
	GooglePhotosSearchParams,
	dateToGoogleDateFilter,
} from "src/photos-api/photosapi";
import { dir, log } from "console";
import {
	getMediaArtifactName,
	getScrapbookDailyDirectoryPath,
	getScrapbookDailyNotePath,
} from "src/lib/scrapbookPaths";
import { setNoteProperty } from "src/lib/noteUtils";

/**
 * Handles creation of scrapbook dailies
 */
export default class ScrapbookDailyCreator {
	private plugin: ScrapbookPlugin;

	constructor(plugin: ScrapbookPlugin) {
		this.plugin = plugin;
	}

	async createDailyScrapbook(
		date: Date,
		preface: string,
		pullImages: boolean = false,
		createNote: boolean = true,
		pullFocus: boolean = false
	) {
		let vault: Vault = this.plugin.app.vault;
		let scrapbookDirectory = getScrapbookDailyDirectoryPath(date);

		await this.createScrapbookDirectory(vault, scrapbookDirectory);


		let mdFilePath = getScrapbookDailyNotePath(
			this.plugin.options.dailyNoteNamePrefix,
			date
		);

		if (createNote) {
			await this.createDailyScrapNote(vault, date, preface, mdFilePath);
			if (pullFocus) {
				this.createLeafForDaily(date, vault, mdFilePath);
			}
		}

		if (pullImages) {
			await this.pullImagesFromPhotos(date, vault, scrapbookDirectory);
		}

		// If the directory is empty, delete it
		let directory = vault.getFolderByPath(scrapbookDirectory);
		if (directory && directory.children.length === 0) {
			console.log("Deleting empty directory: " + scrapbookDirectory);
			await vault.trash(directory as TAbstractFile, true);
		}
	}

	async createDailyScrapNote(vault: Vault, date: Date, preface: string, mdFilePath: string) {
		let templatePath = this.plugin.options.dailyNoteTemplate + ".md";
		let templateText = await this.getDailyJournalTemplateText(
			vault,
			templatePath
		);

		let processedTemplateText = this.processTemplateText(
			templateText,
			preface,
			date
		);

		this.createScrapbookMarkdownFile(
			vault,
			processedTemplateText,
			mdFilePath
		);
	}

	async createLeafForDaily(date: Date, vault: Vault, filepath: string) {
		// Pull up focus
		let leaf = this.plugin.app.workspace.getLeaf("tab");

		if (leaf !== null) {
			let file = vault.getAbstractFileByPath(filepath) as TFile;
			leaf.openFile(file);
		}
	}

	async pullImagesFromPhotos(date: Date, vault: Vault, directory: string) {
		let photosApi = this.plugin.photosApi;
		let dateFilter: GooglePhotosDateFilter = {
			dates: [dateToGoogleDateFilter(date)],
		};

		let searchParams: GooglePhotosSearchParams = {
			filters: { dateFilter },
			pageSize: 100,
		};

		let localSearchParams = Object.assign({}, searchParams);
		let photos = await photosApi.mediaItemsSearch(localSearchParams);

		if (!photos.mediaItems) {
			new Notice("No photos found for " + date.toDateString());
			return;
		}

		new Notice("Found " + photos.mediaItems.length + " photos for " + date.toDateString());

		// Reverse the order of the photos
		photos.mediaItems = photos.mediaItems.reverse();

		let index = 0;
		for (let mediaItem of photos.mediaItems) {
			let mediaUrl = mediaItem.baseUrl;

			let mediaFileName = getMediaArtifactName(
				mediaItem.filename,
				mediaItem.mimeType.split("/")[0],
				index.toString()
			);
			let mediaFilePath = `${directory}/${mediaFileName}`;

			if (vault.getAbstractFileByPath(mediaFilePath) !== null) {
				console.log("Skipping existing media: " + mediaFilePath);
				index++;
				continue;
			}

			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
			if (mediaItem.mimeType.startsWith("video")) {
				mediaUrl = mediaUrl + "=dv";
			}

			// Include metadata
			if (mediaItem.mimeType.startsWith("image")) {
				mediaUrl = mediaUrl + "=d";
			}

			console.log("Downloading media: " + mediaUrl);

			let mediaResponse = await requestUrl({ url: mediaUrl });

			let mediaBlob = mediaResponse.arrayBuffer;


			await vault.createBinary(mediaFilePath, mediaBlob);
			index++;
		}
	}

	async createScrapbookDirectory(vault: Vault, path: string) {
		if (vault.getFolderByPath(path) === null) {
			console.log("Creating directory: " + path);
			await vault.createFolder(path);
		}
	}

	async createScrapbookMarkdownFile(
		vault: Vault,
		content: string,
		filepath: string
	) {
		if (vault.getAbstractFileByPath(filepath) === null) {
			vault.create(filepath, content);
		}
	}

	async getDailyJournalTemplateText(
		vault: Vault,
		templateFilepath: string
	): Promise<string> {
		// read content from the journal template
		console.log("Template path: " + templateFilepath);
		let templateFile: TFile = vault.getAbstractFileByPath(
			templateFilepath
		) as TFile;

		return await vault.read(templateFile);
	}

	processTemplateText(
		templateText: string,
		preface: string,
		date: Date
	): string {
		let datePropertyName = this.plugin.options.dailyDatePropertyName;

		let dateCreatedPropertyName =
			this.plugin.options.dailyDateCreatedPropertyName;

		let prefacedPropertyName = this.plugin.options.prefacePropertyName;

		templateText = setNoteProperty(
			templateText,
			datePropertyName,
			toDateProperty(date)
		);

		templateText = setNoteProperty(
			templateText,
			dateCreatedPropertyName,
			toDateProperty(new Date())
		);

		templateText = setNoteProperty(
			templateText,
			prefacedPropertyName,
			preface
		);

		return templateText;
	}

	onunload(plugin: Plugin): void { }
}
