# Spectra

A static site generator built on top of Markdown with Mathpix Markdown support.

## Install

```
npm install -g @mathpix/spectra
```

## Usage

```sh
# To convert a directory of markdown files into a static site
spectra convert --input ./content --output ./public

# You can also watch the input directory for changes with --watch flag
spectra convert --input ./content --output ./public --watch

# If you want to preview the built html locally you can use serve command
spectra serve --input ./content --output ./public
```

## Help

```
$ spectra --help
Usage: spectra [options] [command]

A static site generator built on top of Mathpix Markdown

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  convert [options]  convert markdown into html
  help [command]     display help for command
```

```
$ spectra convert --help
Usage: spectra convert [options]

Convert markdown into html and optionally watch for changes and serve locally.

Options:
  -i, --input [directory]   input directory of markdown to convert into html. (default: ".")
  -o, --output [directory]  output directory to save the converted html. (default: "./dist")
  -w, --watch               watch the directory of markdown for changes and convert if changed.
  -s, --serve               serve the converted html on a local port with reloading
  -h, --help                display help for command
```

## Configuration

### HTML Layout

You can modify the HTML template layout created in the input directory at `./spectra/layout/layout.njk` to customize the output HTML.

### YAML Front Matter

For use in the title and description HTML metatags the default layout can use YAML front matter defined in the markdown files.

You can also overwrite the default permalink naming using `permalink` field.

*Note:* Make sure to include trailing slash to create a directory with a corresponding index.html file.

```markdown
---
title: Spectra
description: A static site generator built on top of Markdown with Mathpix Markdown support.
permalink: "tools/cli/spectra/"
---
# Spectra
````

## Troubleshooting

### File Naming Conventions

All files in the input directory will be moved to the output directory. 

Any Markdown or Mathpix Markdown files will be converted to html using the following algorithm to have pretty permalink URLs:

1. Lowercase the file name and remove the extension
2. Create a directory with this lowercased non-extension name
3. Convert the \[mathpix-\]markdown to html and save it as index.html in this directory

For example:

- ./input/README.md becomes ./output/readme/index.html

A special case for INDEX.md which omits the directory and simple becomes index.html

- ./input/INDEX.md becomes ./output/index.html available at `/`

Nested folders also work:

- ./input/section/INDEX.md becomes ./output/section/index.html available at `/section`
- ./input/section/README.md becomes ./output/section/readme/index.html available at `/section/readme`
