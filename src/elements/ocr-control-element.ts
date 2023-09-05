import { movableElement } from "../util";

export class OCRControlElement { 
    private controlDiv: HTMLDivElement;
    private startOCRButton: HTMLButtonElement;
    private messageListLabel: HTMLLabelElement;
    private messageList: HTMLUListElement;

    private ocrResults: string[] = [];

    constructor(parent: HTMLElement, captureFunction: (this: GlobalEventHandlers, ev: MouseEvent) => any) {
        this.controlDiv = document.createElement('div');
        this.controlDiv.classList.add("control-window");
        this.controlDiv.addEventListener('mousedown', movableElement(this.controlDiv));
        parent.append(this.controlDiv);
        
        // New Capture Button
        this.startOCRButton = document.createElement('button');
        this.startOCRButton.onclick = captureFunction
        this.controlDiv.append(this.startOCRButton);
        
        this.enableOCRButton();
        
        // Previous capture results
        this.messageListLabel = document.createElement("label");
        this.messageListLabel.innerText = "OCR History:"
        this.messageListLabel.classList.add("hidden");
        this.controlDiv.append(this.messageListLabel);

        this.messageList = document.createElement('ul');
        this.controlDiv.append(this.messageList);
        this.messageList.addEventListener("mousedown", (e: MouseEvent) => {e.stopPropagation()});
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
        this.messageListLabel.classList.remove("hidden");
    }

    public hide() {
        this.controlDiv.classList.add("hidden");
    }

    public show() {
        this.controlDiv.classList.remove("hidden");
    }
}