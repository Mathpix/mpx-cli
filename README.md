# Spectra [![npm package][npm-img]][npm-url] [![github license][license-img]][license-url]

Document conversion for scientific documents.

## Install

```
npm install -g @mathpix/spectra
```

## Usage

Sign up at https://accounts.mathpix.com and then run `spetra login` which will ask for your email and password and save an authorization token to be used for any commands that require connecting to our servers such as digitizing PDF files or converting Markdown to docx or pdf files.

Alternatively you can use a Mathpix API account by creating an API key from https://accounts.mathpix.com/ocr-api and then set the API key as an environment variable `MATHPIX_OCR_API_KEY`:

```
export MATHPIX_OCR_API_KEY=...
```

Or save it permanently in the spectra config file:

```
spectra set-api-key ...
# This will save the key in a file at
# ~/.spectra/config on Linux, macOS, or Unix
# C:\Users\USERNAME\.spectra\config on Windows
```

To digitize PDF's to editable Mathpix Markdown, docx, html or tex.zip:

```
spectra convert input-file.pdf output-file.mmd
spectra convert input-file.pdf output-file.docx
spectra convert input-file.pdf output-file.tex
spectra convert input-file.pdf output-file.html
```

To digitize images to editable Mathpix Markdown, docx, html or tex.zip:

```
spectra convert input-file.png output-file.mmd
spectra convert input-file.png output-file.docx
spectra convert input-file.jpeg output-file.tex
spectra convert input-file.jpeg output-file.html
```

You can also compile Markdown files without using Mathpix OCR:

```
spectra convert input-file.mmd output-file.docx
spectra convert input-file.mmd output-file.tex
spectra convert input-file.mmd output-file.html
spectra convert input-file.mmd output-file.pdf
spectra convert input-file.mmd output-file.pdf --pdf-method html
```

To view mmd files rendered into html on a local server:

```
spectra serve ./input-dir
spectra serve ./input-dir/example.mmd
```

To build a directory of mmd files into a static html site:

```
spectra build ./input-dir ./output-dir
```

The cli has built in `--help` that will show all commands and flags:

```
$ spectra --help
Usage: spectra command [options] [args]

Document conversion for scientific documents

Options:
  -V, --version                                     output the version number
  -h, --help                                        display help for command

Commands:
  build [options] [source] [destination]            build a static html site from a directory of markdown or mathpix markdown
  convert [options] <source.ext> <destination.ext>  convert files between markdown, mathpix markdown, docx, latex and pdf formats
  serve [options] <source>                          serve markdown or mathpix markdown rendered at html
  set-api-key [options] <mathpix_ocr_api_key>       save Mathpix OCR API key
  unset-api-key [options]                           remove Mathpix OCR API key
  login [options]                                   log into your Mathpix Snip account and save authorization token
  logout [options]                                  log out of your Mathpix Snip account and remove authorization token
  help [command]                                    display help for command
```

[npm-img]: https://img.shields.io/npm/v/@mathpix/spectra?color=blue
[npm-url]: https://www.npmjs.com/package/@mathpix/spectra
[license-img]: https://img.shields.io/github/license/mathpix/spectra?color=blue
[license-url]: https://github.com/Mathpix/spectra/blob/master/LICENSE
