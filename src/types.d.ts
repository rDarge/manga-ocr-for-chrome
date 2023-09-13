interface TranslationRequest {
    type: 'TranslationRequest',
    payload: {
        messages: string[]
    }
}

interface TranslationResponse {
    type: 'TranslationResponse',
    payload: {
        messages: string[]
    }
}


interface OCRCompleteRequest {
    type: 'OCRComplete',
    payload: BackendResponse
    debug: any
}

interface ProcessBackendRequest {
    type: 'ProcessBackend',
    payload: CaptureRequest
}

interface OCRStartRequest {
    type: 'OCRStart',
    payload: CropArea
}

interface InitializeOCRRequest { 
    type: 'InitializeOCR',
    payload: OCRConfig
}

interface DisableOCRRequest {
    type: 'DisableOCR'
}

interface EnableOCRRequest {
    type: 'EnableOCR'
}

type Message = TranslationRequest | TranslationResponse | 
    OCRCompleteRequest | ProcessBackendRequest | 
    OCRStartRequest | InitializeOCRRequest |
    DisableOCRRequest | EnableOCRRequest

// For capturing an area on the screen
interface OCRCaptureParameters {
    x1: number,
    x2: number,
    y1: number,
    y2: number
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