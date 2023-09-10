# Manga-OCR for Google Chrome

This extension enables you to easily look up the meaning of words and sentences in Japanese manga you can read online in your browser. This extension aims to complement extensions like [Yomichan](https://github.com/FooSoft/yomichan) and [Rikaikun](https://github.com/melink14/rikaikun), by allowing you to perform OCR in your browser (using [manga-ocr](https://github.com/kha-white/manga-ocr)'s excellent model). 

It also allows you to fetch machine translations from online services (currently only openai's chatgpt-3.5). 

This is a hobby project, and your feedback/contributions are welcome! 

## Exporting the manga-ocr model to ONNX

Hopefully the prerequisite files will be available in the huggingface repository soon, but in the meantime you can do it yourself with a little more effort. 

See install/prerequisite/troubleshooting steps in the optimum documentation here: https://huggingface.co/docs/optimum/exporters/onnx/usage_guides/export_a_model

Note that the correct task for this model is `vision2seq-lm`, as specified below. 

`optimum-cli export onnx -m 'kha-white/manga-ocr-base' ./OUTPUT_FOLDER --task=vision2seq-lm`

This should provide a pair of files, `encoder-model.onnx` and `decoder-model.onnx`, which you should then put in the `./res` folder.

## Performance considerations in onnx-runtime-web

Currently this model is running as a web assembly module. By default (but possibly according to hardware settings) it will attempt to spawn several worker threads; the content-security-policy set by chrome is different in these worker threads and as a result they fail to load the .wasm assemblies, so we've set the total number of threads to 1 in the `ocr.ts` class. This will allow at least one thread to load and process OCR requests. 

```
//Set ORT threads to 1, since the csp permissions are borked in workers currently: 
ort.env.wasm.numThreads = 1;
```

Thank you for your patience!

## Check out these other cool projects:

- [manga-ocr](https://github.com/kha-white/manga-ocr) - an OCR model for japanese text focused on manga. - [huggingface](https://huggingface.co/kha-white/manga-ocr-base)
- [EasyOCR](https://github.com/JaidedAI/EasyOCR) - Another popular OCR library with 80+ supported languages
- [yomitan](https://github.com/themoeway/yomitan) - A community-maintained fork of the now-sunset Yomichan project (chrome extension)
- [rikaikun](https://github.com/melink14/rikaikun) - A chrome extension that shows definitions of japanese words when you hover over them
- [Manga Image Translator](https://github.com/zyddnys/manga-image-translator) - Another tool designed to translate japanese manga that supports inpainting and text rendering
- [Balloon Translator](https://github.com/dmMaze/BallonsTranslator) - Yet another computer-aided comic/manga translation tool powered by deep learning
- [Sugoi Translation Toolkit](https://www.patreon.com/mingshiba/about) - A suite of tools you can use to translate japanese manga, games, and other media. 
- [Mokuro](https://github.com/kha-white/mokuro) - A Japanese learning tool that allows you to batch OCR downloaded manga and generate HTML files you can use to read. Works best with an extension like yomitan/rikaikun/etc.
- [VGT](https://github.com/K-RT-Dev/VGT) - An electron app that also offers OCR + LLM API integrations
- [openai](https://github.com/openai/openai-node) - Javascript/Typescript API library for interacting with OpenAI's services
- [Prompt Engineering Guide](https://www.promptingguide.ai) - A guide on how to build better prompts to use with LLMs

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
