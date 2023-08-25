# Manga-OCR for Chrome Extension

TBD

## Modifications to onnx-runtime-web

Onnx-web resolves internal dependencies (in this case wasm files) from the current domain root. As this code is injected in the context of your tab, it fails to find some of the dependencies it needs to pull from the extension context. 

As a short-term fix, I'm updating the bundled content-script.js file to run chrome.runtime.getURL for each fetch the correct absolute path rather than letting the auto-resolution lead it astray. There might be a better way to do this otherwise though!

Within content-script.js:

Replace `fetch\(([a-zA-z])(,|\))`
With `fetch(chrome.runtime.getURL($1)$2`

Thank you for your patience!