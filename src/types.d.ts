
interface Message {
    type: 'InitializeOCR' | 'OCRStart' | 'ProcessBackend'| 'OCRComplete',
    payload: OCRConfig | CropArea | CaptureRequest | BackendResponse
    debug?: any
}

//Original message from content-script to service-worker
interface CropArea {
    x: number,
    y: number,
    h: number,
    w: number,
    viewport_h: number,
    viewport_w: number,
    pixel_ratio: number
}

//Second request from service-worker to offscreen script
interface CaptureRequest {
    tabId: number,
    image: string,
    points: CropArea
}

//Final request ferried back from backend to content-script
interface BackendResponse {
    tabId: number,
    points: CropArea
    text: string
}

interface OCRConfig {
    vocabURL: string,
    encoderModelURL: string,
    decoderModelURL: string,
    startupSampleURL: string,
    startupSampleExpectation: string
    skipStartupSample?: boolean;
}