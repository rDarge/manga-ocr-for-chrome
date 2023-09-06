import { movableElement } from "../util";

export class OCRControlElement { 
    private controlDiv: HTMLDivElement;
    private startOCRButton: HTMLButtonElement;
    private messageListDiv: HTMLDivElement;
    private messageList: HTMLUListElement;
    private translateButton: HTMLButtonElement;

    private ocrResults: string[] = [];
    private translateResults: string[] = [];

    constructor(parent: HTMLElement, captureFunction, translateFunction) {
        this.controlDiv = document.createElement('div');
        this.controlDiv.classList.add("control-window");
        this.controlDiv.addEventListener('mousedown', movableElement(this.controlDiv));
        parent.append(this.controlDiv);
        
        // New Capture Button
        const buttonContainer = document.createElement('div');
        this.controlDiv.append(buttonContainer);
        this.startOCRButton = document.createElement('button');
        this.startOCRButton.onclick = captureFunction
        buttonContainer.append(this.startOCRButton);
        
        this.enableOCRButton();
        
        // Previous capture results
        this.messageListDiv = document.createElement('div');
        this.messageListDiv.classList.add("ocr-history", "hidden");
        this.controlDiv.append(this.messageListDiv);
        
        // Label
        const messageListLabel = document.createElement("label");
        messageListLabel.innerText = "OCR History:"
        this.messageListDiv.append(messageListLabel);
        
        // OCR History
        this.messageList = document.createElement('ul');
        this.messageListDiv.append(this.messageList);
        this.messageList.addEventListener("mousedown", (e: MouseEvent) => {e.stopPropagation()});

        // Request Translation Button
        this.translateButton = document.createElement('button');
        this.translateButton.innerText = "Translate"
        this.translateButton.onclick = () => {
            console.log("Requesting translation for: ", this.ocrResults.join("\n"));
            translateFunction(this.ocrResults);
        }
        this.messageListDiv.append(this.translateButton);
        
    }

    public enableOCRButton(message ?: string) {
        this.startOCRButton.toggleAttribute("disabled", false);
        this.startOCRButton.innerText = message || 'New Capture'
    }

    public disableOCRButton(message: string) {
        this.startOCRButton.toggleAttribute("disabled", true);
        this.startOCRButton.innerText = message;
    }

    public addCaptureResult(result: string) {
        this.ocrResults.push(result);
        const resultElement = document.createElement("li");
        resultElement.textContent = result;        
        this.messageList.append(resultElement);
        this.messageListDiv.classList.remove("hidden");
    }

    public addTranslationResult(messages: string[]) {
        this.translateResults = messages;

        // Add it as a tooltip for each entry?
        // Clear and redraw
        this.messageList.innerHTML = '';
        for(let x = 0; x < this.ocrResults.length; x++) {
            const message = this.ocrResults[x];
            const resultElement = document.createElement("li");
            resultElement.textContent = message;        
            this.messageList.append(resultElement);

            if(x < this.translateResults.length) {
                const tip = this.translateResults[x];
                resultElement.classList.add('translation-available');
                resultElement.title = tip;
            }
        }
    }

    public hide() {
        this.controlDiv.classList.add("hidden");
    }

    public show() {
        this.controlDiv.classList.remove("hidden");
    }
}