# Manga-OCR for Chrome Extension

TBD


## Exporting the manga-ocr model to ONNX

It'd be nice if the onnx model was properly added to the huggingface repository, but in the meantime you can do it yourself with a little more effort. 

See install/prerequisite/troubleshooting steps in the optimum documentation here: https://huggingface.co/docs/optimum/exporters/onnx/usage_guides/export_a_model

Note that the correct task for this model is `vision2seq-lm`, as specified below. I have not tried exporting the model using tf; if that ends up giving you trouble try using pt by additionally specifying the framework using the argument `--framework=pt`

`optimum-cli export onnx -m 'kha-white/manga-ocr-base' ./onnx --task=vision2seq-lm`

This should provide a pair of files, `encoder-model.onnx` and `decoder-model.onnx`, which you should then put in the `./res` folder.

## Modifications to onnx-runtime-web

Onnx-web resolves internal dependencies (in this case wasm files) from the current domain root. As this code is injected in the context of your tab, it fails to find some of the dependencies it needs to pull from the extension context. 

As a short-term fix, I'm updating the bundled content-script.js file to run chrome.runtime.getURL for each fetch the correct absolute path rather than letting the auto-resolution lead it astray. There might be a better way to do this otherwise though!

Within content-script.js:

Replace `fetch\(([a-zA-z])(,|\))`
With `fetch(chrome.runtime.getURL($1)$2`

I am doing this currently via the `.\update-onnx.ps1` script

Thank you for your patience!