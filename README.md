# Spectra

Document conversion for scientific documents.

## Install

```
npm install -g @mathpix/spectra
```

## Usage

```
spectra convert input-file.ext output-file.ext
spectra build ./input-dir ./output-dir
spectra serve ./input-dir
```

**Note:** Some commands and options require a Mathpix Account and OCR API credentials.

Sign up at https://accounts.mathpix.com and setup an API to get your OCR API key.

Once you copy the API key set it in an environment variable `MATHPIX_APP_KEY`:

```
env MATHPIX_OCR_API_KEY=...
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
  serve [options] <source.mmd|md>                   serve markdown or mathpix markdown rendered at html
  help [command]                                    display help for command
```
