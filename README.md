# Spectra [![npm package][npm-img]][npm-url] [![github license][license-img]][license-url]

Document conversion for scientific documents.

## Install

```
npm install -g @mathpix/spectra
```

## Usage

Sign up at https://accounts.mathpix.com and setup an API to get your OCR API key.

Once you copy the API key you can set it as an environment variable `MATHPIX_APP_KEY`:

```
export MATHPIX_OCR_API_KEY=...
```

Or save it permanently in a credentials file:

```
spectra set-api-key ...
# This will save the key in a file at
# ~/.spectra/credentials on Linux, macOS, or Unix
# C:\Users\USERNAME\.spectra\credentials on Windows
```

To digitize PDF's to editable Mathpix Markdown, docx, html or tex.zip:

```
spectra convert input-file.pdf output-file.mmd
spectra convert input-file.pdf output-file.docx
spectra convert input-file.pdf output-file.tex
spectra convert input-file.pdf output-file.html
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
  set-api-key [options] <mathpix_ocr_api_key>       save Mathpix OCR API key at ~/.spectra/credentials
  help [command]                                    display help for command
```

[npm-img]: https://img.shields.io/npm/v/@mathpix/spectra?color=blue
[npm-url]: https://www.npmjs.com/package/@mathpix/spectra
[license-img]: https://img.shields.io/github/license/mathpix/spectra?color=blue
[license-url]: https://github.com/Mathpix/spectra/blob/master/LICENSE
