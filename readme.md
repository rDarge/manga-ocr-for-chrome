# Chouyaku for Google Chrome

Chouyaku enables you to easily look up the meaning of words and sentences in Japanese manga you can read online in your browser. This extension aims to complement extensions like [Yomichan](https://github.com/FooSoft/yomichan) and [Rikaikun](https://github.com/melink14/rikaikun), by allowing you to perform OCR in your browser (using [manga-ocr](https://github.com/kha-white/manga-ocr)'s excellent model). 

It also allows you to fetch machine translations from online services (currently only openai's chatgpt-3.5). 

This is a hobby project, and your feedback/contributions are welcome! 

## Exporting the manga-ocr model to ONNX

It'd be nice if the onnx model was added to the huggingface repository, but in the meantime you can do it yourself with a little more effort. 

See install/prerequisite/troubleshooting steps in the optimum documentation here: https://huggingface.co/docs/optimum/exporters/onnx/usage_guides/export_a_model

Note that the correct task for this model is `vision2seq-lm`, as specified below. 

`optimum-cli export onnx -m 'kha-white/manga-ocr-base' ./OUTPUT_FOLDER --task=vision2seq-lm`

This should provide a pair of files, `encoder-model.onnx` and `decoder-model.onnx`, which you should then put in the `./res` folder.

## Considerations regarding onnx-runtime-web

Currently this model is running as a web assembly module. By default (but possibly according to hardware settings) it will attempt to spawn several worker threads; the content-security-policy set by chrome is different in these worker threads and as a result they fail to load the .wasm assemblies, so we've set the total number of threads to 1 in the `ocr.ts` class. This will allow at least one thread to load and process OCR requests. 

```
//Set ORT threads to 1, since the csp permissions are borked in workers currently: 
ort.env.wasm.numThreads = 1;
```

Thank you for your patience!

## Check out these other cool projects:

- [manga-ocr](https://github.com/kha-white/manga-ocr) - an OCR model for japanese text focused on manga. - [huggingface](https://huggingface.co/kha-white/manga-ocr-base)
- [yomitan](https://github.com/themoeway/yomitan) - A community-maintained fork of the now-sunset Yomichan project (chrome extension)
- [rikaikun](https://github.com/melink14/rikaikun) - A chrome extension that shows definitions of japanese words when you hover over them
- [Sugoi Translation Toolkit](https://www.patreon.com/mingshiba/about) - A suite of tools you can use to translate japanese manga, games, and other media. 

## TODO

- [x] Basic support for OCR using manga-ocr
- [x] Keeps a history of previous OCR requests (within one session)
- [x] Batch translation request to openai 
- [ ] Automatically fetch onnx model from huggingface
- [ ] Explore managing secrets using secure oauth2 environment
- [ ] Explore using textbox-detect models to more quickly find textboxes
- [ ] Support additional web-compiled OCR models
- [ ] Allow live edits of OCR results for incorrect captures
- [ ] Additional tools to help build vocabulary based on captured text
- [ ] Support web-compiled translation models for fully-offline translation (ex. [sugoi](https://www.patreon.com/mingshiba/about))
