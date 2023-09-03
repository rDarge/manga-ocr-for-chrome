# Manga-OCR for Chrome Extension

TBD


## Exporting the manga-ocr model to ONNX

It'd be nice if the onnx model was properly added to the huggingface repository, but in the meantime you can do it yourself with a little more effort. 

See install/prerequisite/troubleshooting steps in the optimum documentation here: https://huggingface.co/docs/optimum/exporters/onnx/usage_guides/export_a_model

Note that the correct task for this model is `vision2seq-lm`, as specified below. I have not tried exporting the model using tf; if that ends up giving you trouble try using pt by additionally specifying the framework using the argument `--framework=pt`

`optimum-cli export onnx -m 'kha-white/manga-ocr-base' ./onnx --task=vision2seq-lm`

This should provide a pair of files, `encoder-model.onnx` and `decoder-model.onnx`, which you should then put in the `./res` folder.

## Considerations regarding onnx-runtime-web

Currently this model is running via wasm; by default (but possibly according to hardware settings) it will attempt to spawn several worker threads; the csp is different in these worker threads and as a result they fail to load the .wasm assemblies, so we've set the total number of threads to 1 in the `ocr.ts` class.

Thank you for your patience!