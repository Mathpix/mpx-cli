# Spectra

Document conversion for scientific documents.

## Install

```
npm install -g @mathpix/spectra
```

## Usage

Sign up at https://accounts.mathpix.com and setup an API to get your OCR API key.

Once you copy the API key set it in an environment variable `MATHPIX_APP_KEY`:

```
env MATHPIX_OCR_API_KEY=...
```

To digitize PDF's to editable Mathpix Markdown, docx, or tex.zip:

```
spectra convert input-file.pdf output-file.mmd
spectra convert input-file.pdf output-file.docx
spectra convert input-file.pdf output-file.tex
```

You can also compile Markdown files without using Mathpix OCR:

```
spectra convert input-file.mmd output-file.docx
spectra convert input-file.mmd output-file.pdf
spectra convert input-file.mmd output-file.tex
```

To visualize mmd files:

```
spectra serve ./input-dir
spectra serve ./input-dir/example.mmd
```

To build a directory of mmd files:

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
  convert [options] <source.ext> <destination.ext>  convert files between markdown, mathpix markdown, docx, latex and pdf formats
  serve [options] <source.mmd|md>                   serve markdown or mathpix markdown rendered at html
  build [options] [source] [destination]            build a static html site from a directory of markdown or mathpix markdown
  help [command]                                    display help for command
```
