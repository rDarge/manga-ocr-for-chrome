
interface Message {
    type: 'OCRStart' | 'ProcessBackend'| 'OCRComplete',
    payload: CropArea | CaptureRequest | BackendResponse
    debug?: any
}

//Original message from content-script to service-worker
interface CropArea {
    x: number,
    y: number,
    h: number,
    w: number,
    viewport_h: number,
    viewport_w: number
}

//Second request from service-worker to offscreen script
interface CaptureRequest {
    tabId: number,
    streamId: string,
    points: CropArea
}

//Final request ferried back from backend to content-script
interface BackendResponse {
    tabId: number,
    streamId: string,
    points: CropArea
    imageData: number[]
}