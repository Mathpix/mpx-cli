# mpx cli [![npm package][npm-img]][npm-url] [![github license][license-img]][license-url]

Document conversion for scientific documents.

## Install

```
npm install -g @mathpix/mpx-cli
```

## Usage

Sign up at https://accounts.mathpix.com and then run `mpx login` which will ask for your Mathpix email and password then save an authorization token to be used for any commands that require connecting to our servers such as digitizing PDF files or converting Markdown to docx or pdf files.

```
mpx login
```

Alternatively you can use a Mathpix API account by creating an API key from https://accounts.mathpix.com/ocr-api and then set the API key as an environment variable `MATHPIX_OCR_API_KEY`:

```
export MATHPIX_OCR_API_KEY=...
```

Or save it permanently in the mpx config file:

```
mpx set-api-key ...
# This will save the key in a file at
# ~/.mpx/config on Linux, macOS, or Unix
# C:\Users\USERNAME\.mpx\config on Windows
```

To digitize PDF's to editable Mathpix Markdown, docx, html or tex.zip:

```
mpx convert input-file.pdf output-file.mmd
mpx convert input-file.pdf output-file.docx
mpx convert input-file.pdf output-file.tex
mpx convert input-file.pdf output-file.html
```

To digitize images to editable Mathpix Markdown, docx, html or tex.zip:

```
mpx convert input-file.png output-file.mmd
mpx convert input-file.png output-file.docx
mpx convert input-file.jpeg output-file.tex
mpx convert input-file.jpeg output-file.html
```

You can also compile Markdown files without using Mathpix OCR:

```
mpx convert input-file.mmd output-file.docx
mpx convert input-file.mmd output-file.tex
mpx convert input-file.mmd output-file.html
mpx convert input-file.mmd output-file.pdf
mpx convert input-file.mmd output-file.pdf --pdf-method html
```

To view mmd files rendered into html on a local server:

```
mpx serve ./input-dir
mpx serve ./input-dir/example.mmd
```

To build a directory of mmd files into a static html site:

```
mpx build ./input-dir ./output-dir
```

The cli has built in `--help` that will show all commands and flags:

```
$ mpx --help
Usage: mpx command [options] [args]

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

[npm-img]: https://img.shields.io/npm/v/@mathpix/mpx-cli?color=blue
[npm-url]: https://www.npmjs.com/package/@mathpix/mpx-cli
[license-img]: https://img.shields.io/github/license/mathpix/mpx-cli?color=blue
[license-url]: https://github.com/Mathpix/mpx-cli/blob/master/LICENSE
