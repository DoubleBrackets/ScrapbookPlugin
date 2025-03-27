import { App, ButtonComponent, Modal, Notice, Setting } from "obsidian";
import ScrapbookPlugin from "src/main";
import ScrapbookDailyCreationFlow from "./dailyCreationFlow";
import { onAuthEvent, onClearAuthEvent } from "src/photos-api/oauth";

/**
 * Modal that shows while waiting for user to pick photos 
 */
export class PhotoPickerModal extends Modal {
    submitCallback: () => void;
    closeCallback: () => void;

    constructor(app: App, submitCallback: () => void, closeCallback: () => void) {
        super(app);
        this.submitCallback = submitCallback;
        this.closeCallback = closeCallback;
    }

    onOpen() {
        let { contentEl } = this;
        contentEl.createEl("h1", { text: "Picking Photos..." });

        new Setting(contentEl).addButton((btn) =>
            btn
                .setButtonText("Submit Picked")
                .setCta()
                .onClick(() => {
                    this.onSubmit();
                })
        );

      
    }

    onClose() {
        this.closeCallback();
        let { contentEl } = this;
        contentEl.empty();
    }

    onSubmit() {
        this.submitCallback();
    }
}
