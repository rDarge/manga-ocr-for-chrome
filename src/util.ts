/**
 * Allows elements to be dragged around the screen
 */
export function movableElement(element: HTMLElement) {
    return (ev: MouseEvent) => {
        if(ev.button !== 0) {
            return;
        }
    
        const firstRect = element.getBoundingClientRect();
        const x_inset = ev.clientX - firstRect.left; 
        const y_inset = ev.clientY - firstRect.top;
    
        const updatePosition = (mv: MouseEvent) => {
            const x = mv.clientX - x_inset; 
            const y = mv.clientY - y_inset;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        };
    
        document.addEventListener('mousemove', updatePosition);
        document.addEventListener('mouseup', (up: MouseEvent) => {
            document.removeEventListener('mousemove', updatePosition);
        }, {once: true});
    }
}