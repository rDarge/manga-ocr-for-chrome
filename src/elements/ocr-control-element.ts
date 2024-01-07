import { movableElement } from "../util";
import { UploadOutlined } from "@ant-design/icons-svg";
import { DownloadOutlined } from "@ant-design/icons-svg";
import { renderIconDefinitionToSVGElement } from '@ant-design/icons-svg/es/helpers'
import { IconDefinition } from "@ant-design/icons-svg/lib/types";

interface Page {
    original: string[],
    translation: string[]
}

export class OCRControlElement { 
    private bridge: OCRBridge;
    private controlDiv: HTMLDivElement;
    private startOCRButton: HTMLButtonElement;
    private messageListDiv: HTMLDivElement;
    private messageList: HTMLUListElement;
    private translateButton: HTMLButtonElement;
    private nextPageButton: HTMLButtonElement;
    private lastPageButton: HTMLButtonElement;
    private importButton: HTMLButtonElement;
    private exportButton: HTMLButtonElement;
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

    private makeTopButtons(captureFunction) {
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add("button-row")

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
            this.updateOCRButton()
            captureFunction(e)
        }
        buttonContainer.append(this.startOCRButton);

        // Next Page Button
        this.nextPageButton = document.createElement('button'); 
        this.nextPageButton.innerText = '+';
        this.nextPageButton.onclick = () => this.navigateForward()
        this.nextPageButton.classList.add("hidden");
        buttonContainer.append(this.nextPageButton); 

        return buttonContainer;
    }

    private makeBottomButtons(translateFunction) {
        const bottomButtonContainer = document.createElement("div");
        bottomButtonContainer.classList.add("button-row")
        
        //Import Button - Not used, but kept as spacer
        this.importButton = document.createElement('button');
        this.importButton.classList.add("icon-button", "hidden");
        this.importButton.title = "Import";
        const importIcon = this.loadIcon(UploadOutlined) as SVGElement;
        this.importButton.appendChild(importIcon);
        bottomButtonContainer.append(this.importButton);

        // Request Translation Button
        this.translateButton = document.createElement('button');
        this.translateButton.classList.add("action-button")
        this.translateButton.innerText = "Translate"
        this.translateButton.onclick = () => {
            console.log("Requesting translation for: ", this.page.original.join("\n"));
            this.translateButton.disabled = true
            this.translateButton.classList.add("disabled")
            this.translateButton.innerText = "Processing..."
            translateFunction(this.page.original);
        }
        bottomButtonContainer.append(this.translateButton);
        
        //Export Button
        this.exportButton = document.createElement('button');
        this.exportButton.classList.add("icon-button");
        this.exportButton.title = "Export"
        const exportIcon = this.loadIcon(DownloadOutlined) as SVGElement;
        this.exportButton.appendChild(exportIcon);
        bottomButtonContainer.append(this.exportButton);

        return bottomButtonContainer;
    }

    private makeMessageList() {
        // Previous capture results
        this.messageListDiv = document.createElement('div');
        this.messageListDiv.classList.add("ocr-history", "gone");
        
        // OCR History
        this.messageList = document.createElement('ul');
        this.messageList.addEventListener("mouseup", ev => {
            const selectedText = window.getSelection().toString();
            if(selectedText.length > 0) {
                navigator.clipboard.writeText(selectedText);
            }
        })
        this.messageListDiv.append(this.messageList);
    }


    constructor(parent: HTMLElement, bridge: OCRBridge) {
        this.bridge = bridge
        this.controlDiv = document.createElement('div');
        this.controlDiv.classList.add("control-window");
        parent.append(this.controlDiv);
        
        //Top buttons (navigation + capture)
        const topButtons = this.makeTopButtons(bridge.newCapture);
        this.controlDiv.append(topButtons);        
        
        //Center (capture history)
        this.makeMessageList()
        this.controlDiv.append(this.messageListDiv);
        
        //Bottom (translation, export)
        const bottomButtons = this.makeBottomButtons(bridge.newTranslation)
        this.messageListDiv.append(bottomButtons);
        
        this.updateOCRButton();
        this.controlDiv.addEventListener('mousedown', movableElement(this.controlDiv, [this.messageList]));
    }

    private loadIcon(icon: IconDefinition) : Node {
        var template = document.createElement('template');
        const htmlString = renderIconDefinitionToSVGElement(icon, {
            extraSVGAttrs: { fill: 'white ' }
        })
        template.innerHTML = htmlString.trim()
        return template.content.firstChild
    }

    private updateMessageList() {
        const page = this.page;
        this.messageList.innerHTML = '';

        for(let x = 0; x < page.original.length; x++) {
            const message = this.createLi(x)

            if(x < page.translation.length) {
                const tip = page.translation[x];
                message.classList.add('translation-available');
                message.title = tip;
            }

            this.messageList.append(message);
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

    public updateOCRButton(message ?: string) {
        this.startOCRButton.toggleAttribute("disabled", false);
        if(this.lastKnownQueue > 0) {
            const queueString = ` (${this.lastKnownQueue}*)`
            this.startOCRButton.innerText = (message || 'New Capture') + queueString;
            this.startOCRButton.title = `There are ${this.lastKnownQueue} images still processing.`
        } else {
            this.startOCRButton.innerText = 'New Capture'
            this.startOCRButton.removeAttribute("title")
        }
    }

    public disableOCRButton(message: string) {
        this.startOCRButton.toggleAttribute("disabled", true);
        this.startOCRButton.innerText = message;
    }

    public noteCaptureStarted() {
        this.lastKnownQueue += 1;
        this.updateOCRButton();
    }

    public cancelCaptureResult() {
        this.show()
    }

    public createLi(index: number): HTMLLIElement {
        //Local state to manage element state until it's redrawn
        let text = this.page.original[index]
        let translation = this.page.translation.length >= index ? this.page.translation[index] : ""
        
        const resultElement = document.createElement("li")

        const textElement = document.createElement("p")
        textElement.textContent = text;
        resultElement.appendChild(textElement)

        resultElement.addEventListener("mouseup", ev => {
            if(window.getSelection().toString().length == 0) {
                navigator.clipboard.writeText(text);
            }
        })

        //Fancy right click actions
        resultElement.addEventListener("mousedown", ev => {
            if(ev.button != 2 || window.getSelection().toString().length > 0) {
                return; 
            }
            console.log("Right click initiated");
            const noRightClick = (e: Event) => e.preventDefault()
            this.controlDiv.addEventListener("contextmenu", noRightClick, {once: true})

            //Handle quick action
            const quickAction = (ev2: MouseEvent) => {
                
                if (resultElement.classList.contains("expanded")) {
                    //Hide additional details, if any
                    for(const child of resultElement.getElementsByTagName("div")) {
                        child.remove()
                    }
                    resultElement.classList.remove("expanded")
                } else {
                    //Expand message to allow user to look up details
                    const expandedDiv = document.createElement("div")
                    resultElement.appendChild(expandedDiv)

                    const translateButton = document.createElement("button")
                    translateButton.classList.add("small")
                    translateButton.innerText = "Translate"
                    translateButton.addEventListener("click", (ev) => {
                        const context = this.page.original.join("\n");
                        this.bridge.translateOne(text, context, index)
                        translateButton.innerText = "Working..."
                        translateButton.disabled = true
                        setTimeout(() => {
                            translateButton.innerText = "Again"
                            translateButton.disabled = false
                        }, 2000)
                    })
                    expandedDiv.appendChild(translateButton)

                    const editButton = document.createElement("button")
                    editButton.classList.add("small")
                    editButton.innerText = "Edit"
                    editButton.addEventListener("click", (ev) => {
                        const originalText = textElement.textContent
                        const originalTranslation = resultElement.title

                        //Hide expanded div
                        expandedDiv.style.display = "none"
                        textElement.innerText = ""

                        //Editable Text
                        const editableText = document.createElement("textarea")
                        editableText.textContent = originalText
                        editableText.addEventListener("change", (ev) => {
                            text = (ev.target as HTMLTextAreaElement).value
                        })
                        
                        //Editable Translation
                        const editableTranslation = document.createElement("textarea")
                        editableTranslation.textContent = originalTranslation
                        editableTranslation.addEventListener("change", (ev) => {
                            translation = (ev.target as HTMLTextAreaElement).value
                        })

                        //Apply button
                        const applyButton = document.createElement("button")
                        applyButton.textContent = "Apply"
                        applyButton.addEventListener("click", (ev) => {
                            editingDiv.remove()
                            expandedDiv.style.display = null
                            textElement.textContent = text
                            this.page.original[index] = text
                            if(translation) {
                                resultElement.title = translation
                                this.page.translation[index] = translation
                            }
                        })
                        
                        //Cancel button
                        const cancelButton = document.createElement("button")
                        cancelButton.textContent = "Cancel"
                        cancelButton.addEventListener("click", (ev) => {
                            editingDiv.remove()
                            expandedDiv.style.display = null
                            textElement.textContent = originalText
                            text = originalText
                            translation = originalTranslation
                        })

                        //ButtonDiv
                        const buttonDiv = document.createElement("div")
                        buttonDiv.appendChild(applyButton)
                        buttonDiv.appendChild(cancelButton)

                        //Create new "editing" div
                        const editingDiv = document.createElement("div")
                        editingDiv.appendChild(editableText)
                        editingDiv.appendChild(editableTranslation)
                        editingDiv.appendChild(buttonDiv)
                        resultElement.appendChild(editingDiv)
                    })
                    expandedDiv.appendChild(editButton)

                    const vocabButton = document.createElement("button")
                    vocabButton.classList.add("small")
                    vocabButton.innerText = "Vocab"
                    vocabButton.addEventListener("click", (ev) => {
                        this.bridge.getVocab(text, index)
                        vocabButton.innerText = "Thinking..."
                        vocabButton.disabled = true
                        setTimeout(() => {
                            vocabButton.innerText = "Vocab"
                            vocabButton.disabled = false
                        }, 2000)
                    })
                    expandedDiv.appendChild(vocabButton)
                    
                    const ankiButton = document.createElement("button")
                    ankiButton.classList.add("small")
                    ankiButton.innerText = "Anki"
                    ankiButton.addEventListener("click", (ev) => {
                        this.bridge.sendToAnki(text, resultElement.title)
                        ankiButton.innerText = "Sent!"
                        ankiButton.disabled = true
                        resultElement.classList.add("sent-to-anki")
                        setTimeout(() => {
                            //TODO Define "cooldown" button type to encapsulate behavior"
                            ankiButton.innerText = "Send again?"
                            ankiButton.disabled = false
                        }, 2000)
                    })
                    expandedDiv.appendChild(ankiButton)
                    
                    resultElement.classList.add("expanded")
                }
                
            }
            resultElement.addEventListener("mouseup", quickAction)
            setTimeout(() => {
                resultElement.removeEventListener("mouseup", quickAction)
            }, 500)

            //Handle dragging of elements
            if(this.messageList.childNodes.length >= 1) {
                const updatePosition = (mv: MouseEvent) => {
                    resultElement.style.fontStyle = 'italic'
                    resultElement.style.opacity = '50%'
                };
                document.addEventListener('mousemove', updatePosition);
    
    
                //Also allow for quick right click event
                const mouseUp = (ev2: MouseEvent) => {
                    console.log("Done with right click event")
                    var remove = false;
                    if(ev2.target instanceof HTMLElement) {
                        let target = ev2.target
                        if (target instanceof HTMLParagraphElement) {
                            target = target.parentElement
                        } else {
                            target = target as HTMLElement
                        }

                        if(this.messageList.contains(target) && !resultElement.contains(target)) {
                            //Dragged to another element: Merge OCR Result
                            const source = text;
                            const sourceIndex = this.page.original.indexOf(source);
                            const otherIndex = this.page.original.indexOf(target.childNodes[0].textContent);
                            this.page.original[otherIndex] += source;
                            this.page.original.splice(sourceIndex, 1)
                            remove = true;
                        } else if (!this.controlDiv.contains(target)) {
                            //Dragged off; remove
                            const source = text;
                            const sourceIndex = this.page.original.indexOf(source);
                            this.page.original.splice(sourceIndex, 1)
                            remove = true
                        }
                    }
                    if(remove) {
                        resultElement.remove();
                        this.page.translation = [];
                        this.updateMessageList();
                    } else {
                        resultElement.style.fontStyle = null;
                        resultElement.style.opacity = null;
                    }
                    document.removeEventListener('mousemove', updatePosition);
    
                }
                document.addEventListener("mouseup", mouseUp, {once: true})
            }
        })

        return resultElement;
    }

    public addCaptureResult(result: string) {
        const original = this.pages[this.pageIndex].original
        original.push(result);
        const resultElement = document.createElement("li");
        resultElement.textContent = result;        
        this.messageList.append(this.createLi(original.length-1));
        this.messageListDiv.classList.remove("gone");
        this.nextPageButton.classList.remove("hidden");

        this.lastKnownQueue -= 1
        this.updateOCRButton()
    }

    public addTranslationResult(messages: string[]) {
        this.page.translation = messages;
        this.updateMessageList()
        this.translateButton.disabled = false
        this.translateButton.innerText = "Translate"
        this.translateButton.classList.remove("disabled")
    }

    public addSingleTranslationResult(message: string, index: number) {
        this.page.translation[index] = message;
        const element = this.messageList.childNodes[index] as HTMLLIElement
        element.title = message
    }

    public addVocab(vocab: string, index: number) {
        const element = this.messageList.childNodes[index] as HTMLLIElement
        if(this.page.translation[index]) {
            this.page.translation[index] += '\n' + vocab
        } else {
            this.page.translation[index] = vocab
        }
        
        element.title = this.page.translation[index]
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