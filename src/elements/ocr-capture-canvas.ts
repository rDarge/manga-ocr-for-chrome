
//Constants
//TODO parameterize these? 
const canvasColor = 'rgba(163, 163, 194, 0.4)';
const guidelineColor = 'rgba(124, 124, 163, 0.4)';
const excludedColor = 'rgba(194, 163, 163, 0.4)';


// Create a disposable cavas that the user can interact with 
// in order to specify an area on the screen between two points to perform OCR on
export function createCaptureCanvas(parent: HTMLElement, onCapture: (params: OCRCaptureParameters) => void) {

    //Insert Canvas overlay
    const canvas = document.createElement('canvas');
    // pluginDiv.append(canvas);
    parent.append(canvas);
    canvas.classList.add("selection-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    //Canvas cleanup
    const doneWithCanvas = () => {
        canvas.remove();
    }

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let x1: number = 0;
    let y1: number = 0;
    let x2: number = 0;
    let y2: number = 0;

    //Until they click, we'll draw guidelines at the mouse position
    canvas.onmousemove = (move: MouseEvent) => {
        const moveRect = canvas.getBoundingClientRect();
        const x = move.clientX - moveRect.left;
        const y = move.clientY - moveRect.top;

        //Draw guidelines
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = canvasColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = guidelineColor;
        ctx.fillRect(0, y, canvas.width, 1); //Horizontal Guideline
        ctx.fillRect(x, 0, 1, canvas.height); //Vertical Guideline 
    }

    //When the user clicks, we note the coordinates and prepare to capture a region
    canvas.onmousedown = ((firstClick: MouseEvent) => {
        if (firstClick.button !== 0) {
            return;
        }

        const firstRect = canvas.getBoundingClientRect();
        x1 = firstClick.clientX - firstRect.left;
        y1 = firstClick.clientY - firstRect.top;

        //Draw clear capture box around selected area
        canvas.onmousemove = (move: MouseEvent) => {
            const moveRect = canvas.getBoundingClientRect();
            x2 = move.clientX - moveRect.left;
            y2 = move.clientY - moveRect.top;

            //Update canvas overlay to show target selection
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = canvasColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const x = x1 < x2 ? x1 : x2;
            const y = y1 < y2 ? y1 : y2;
            const w = Math.abs(x2 - x1);
            const h = Math.abs(y2 - y1);
            const margin_w = w * .0625;
            const margin_h = h * .0625;
            ctx.fillStyle = excludedColor;
            ctx.fillRect(x - margin_w, y - margin_h, w + 2 * margin_w, h + 2 * margin_h);
            if (w > 10 && h > 10) {
                //Window probably too small for meaningful OCR otherwise
                //a margin of about 12% will be cut off from the sample
                ctx.clearRect(x, y, w, h);
            }
        }

        //Finalize selection when they mouseup
        canvas.onmouseup = (lastClick: MouseEvent) => {
            if (firstClick.button !== 0) {
                return;
            }

            const lastRect = canvas.getBoundingClientRect();
            console.debug("full canvas size is: ", lastRect);

            console.debug("Window screen parameters", {
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                screenTop: window.screenTop,
                screenLeft: window.screenLeft,
                screenX: window.screenX,
                screenY: window.screenY,
                lastRect,
                canvasClientTop: canvas.clientTop,
                canvasClientLeft: canvas.clientLeft,
                canvasClientHeight: canvas.clientHeight,
                canvasClientWidth: canvas.clientWidth
            });
            x2 = lastClick.clientX - lastRect.left;
            y2 = lastClick.clientY - lastRect.top;

            onCapture({ x1, x2, y1, y2 });
            doneWithCanvas();
        };

        //Or let them cancel with keydown
        canvas.onkeydown = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') {
                doneWithCanvas();
            }
        };
    });
}