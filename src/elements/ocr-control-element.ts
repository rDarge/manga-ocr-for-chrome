import { movableElement } from "../util";

interface Page {
    original: string[],
    translation: string[],
}

export class OCRControlElement { 
    private controlDiv: HTMLDivElement;
    private startOCRButton: HTMLButtonElement;
    private messageListDiv: HTMLDivElement;
    private messageList: HTMLUListElement;
    private translateButton: HTMLButtonElement;
    private nextPageButton: HTMLButtonElement;
    private lastPageButton: HTMLButtonElement;

    private lastKnownQueue: number = 0;

    private pages: Page[] = [{
        original: [],
        translation: []
    }];
    private pageIndex: number = 0;

    private _page: Page;
    get page() {
        return this.pages[this.pageIndex];
    }


    constructor(parent: HTMLElement, captureFunction, translateFunction) {
        this.controlDiv = document.createElement('div');
        this.controlDiv.classList.add("control-window");
        this.controlDiv.addEventListener('mousedown', movableElement(this.controlDiv));
        parent.append(this.controlDiv);
        
        //Top row buttons
        const buttonContainer = document.createElement('div');
        this.controlDiv.append(buttonContainer);

        // Last Page Button
        this.lastPageButton = document.createElement('button'); 
        this.lastPageButton.innerText = '<';
        this.lastPageButton.onclick = () => this.navigateBackward()
        this.lastPageButton.classList.add("hidden");
        buttonContainer.append(this.lastPageButton); 

        // New Capture Button
        this.startOCRButton = document.createElement('button');
        this.startOCRButton.classList.add("action-button")
        this.startOCRButton.onclick = (e) => {
            this.lastKnownQueue = this.lastKnownQueue + 1
            this.enableOCRButton()
            captureFunction(e)
        }
        buttonContainer.append(this.startOCRButton);
        
        // New Page Button
        this.nextPageButton = document.createElement('button'); 
        this.nextPageButton.innerText = '+';
        this.nextPageButton.onclick = () => this.navigateForward()
        this.nextPageButton.classList.add("hidden");
        buttonContainer.append(this.nextPageButton); 
        
        this.enableOCRButton();
        
        // Previous capture results
        this.messageListDiv = document.createElement('div');
        this.messageListDiv.classList.add("ocr-history", "gone");
        this.controlDiv.append(this.messageListDiv);
        
        // Label
        // const messageListLabel = document.createElement("label");
        // messageListLabel.innerText = "OCR History:"
        // this.messageListDiv.append(messageListLabel);

        
        // OCR History
        this.messageList = document.createElement('ul');
        this.messageListDiv.append(this.messageList);
        this.messageList.addEventListener("mousedown", (e: MouseEvent) => {e.stopPropagation()});

        // Request Translation Button
        this.translateButton = document.createElement('button');
        this.translateButton.classList.add("action-button")
        this.translateButton.innerText = "Translate"
        this.translateButton.onclick = () => {
            console.log("Requesting translation for: ", this.page.original.join("\n"));
            translateFunction(this.page.original);
        }
        this.messageListDiv.append(this.translateButton);  
    }

    private updateMessageList() {
        const page = this.page;
        this.messageList.innerHTML = '';

        for(let x = 0; x < page.original.length; x++) {
            const message = page.original[x];
            const resultElement = document.createElement("li");
            resultElement.textContent = message;        
            this.messageList.append(resultElement);

            if(x < page.translation.length) {
                const tip = page.translation[x];
                resultElement.classList.add('translation-available');
                resultElement.title = tip;
            }
        }

        //Back Page Button
        if(this.pageIndex === 0) {
            this.lastPageButton.classList.add("hidden");
        } else {
            this.lastPageButton.classList.remove("hidden");
        }

        //Next Page Button
        if(this.pageIndex === this.pages.length - 1) {
            this.nextPageButton.innerText = "+";
            if(this.page.original.length === 0) {
                this.nextPageButton.classList.add("hidden");
            } else {
                this.nextPageButton.classList.remove("hidden");
            }
        } else {
            this.nextPageButton.innerText = ">"
            this.nextPageButton.classList.remove("hidden");
        }

        if(page.original.length == 0) {
            this.messageListDiv.classList.add("gone")
        } else {
            this.messageListDiv.classList.remove("gone")
        }
    }

    public enableOCRButton(message ?: string) {
        this.startOCRButton.toggleAttribute("disabled", false);
        if(this.lastKnownQueue > 0) {
            const queueString = ` (${this.lastKnownQueue}*)`
            this.startOCRButton.innerText = (message || 'New Capture') + queueString;
            this.startOCRButton.title = `There are ${this.lastKnownQueue} images still processing.`
        } else {
            this.startOCRButton.innerText = 'New Capture'
            this.startOCRButton.title = null
        }
        
    }

    public disableOCRButton(message: string) {
        this.startOCRButton.toggleAttribute("disabled", true);
        this.startOCRButton.innerText = message;
    }

    public addCaptureResult(result: string) {
        this.pages[this.pageIndex].original.push(result);
        const resultElement = document.createElement("li");
        resultElement.textContent = result;        
        this.messageList.append(resultElement);
        this.messageListDiv.classList.remove("gone");
        this.nextPageButton.classList.remove("hidden");

        this.lastKnownQueue -= 1
        this.enableOCRButton()
    }

    public addTranslationResult(messages: string[]) {
        this.page.translation = messages;
        this.updateMessageList()
    }

    public addPage() {
        this.pages.push({
            original: [],
            translation: []
        })
        this.pageIndex = this.pages.length - 1;
    }

    public navigateForward() {
        if(this.pageIndex < this.pages.length) {
            this.pageIndex += 1;

            if(this.pageIndex === this.pages.length) {
                this.addPage();
            }

            this.updateMessageList();
        }
    }

    public navigateBackward() {
        if(this.pageIndex > 0) {
            this.pageIndex--;
            this.updateMessageList();
        }
    }

    public hide() {
        this.controlDiv.classList.add("hidden");
    }

    public show() {
        this.controlDiv.classList.remove("hidden");
    }
}