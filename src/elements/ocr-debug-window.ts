import { movableElement } from "../util";

export class OCRDebugElement {
    private debugDiv: HTMLDivElement;
    private hideButton: HTMLButtonElement;
    private lastImage: HTMLImageElement;

    constructor(parent: HTMLElement) {
        this.debugDiv = document.createElement('div');
        this.debugDiv.classList.add("debug-window", "hidden");
        this.debugDiv.addEventListener('mousedown', movableElement(this.debugDiv));
        parent.append(this.debugDiv);

        this.hideButton = document.createElement('button');
        this.hideButton.classList.add("close-button");
        this.hideButton.innerText = "X"
        this.debugDiv.append(this.hideButton);

        const debugTitle = document.createElement('p');
        debugTitle.innerText = "Debug Window";
        this.debugDiv.append(debugTitle);
    }

    public present(imageSrc: string) {
        this.show();

        //Add image to debug window
        if(this.lastImage) {
            this.lastImage.remove();
        }
        
        const debugImage = document.createElement('img');
        debugImage.src = imageSrc;
        this.debugDiv.append(debugImage);
        
        this.hideButton.onclick = (() => {
            debugImage.remove();
            this.hide();
        });
        this.lastImage = debugImage;
    }

    public show() {
        this.debugDiv.classList.remove('hidden');
    }

    public hide() {
        this.debugDiv.classList.add('hidden');
    }
}