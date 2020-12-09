const markdownIt = require("markdown-it");
const markdownItReplaceLink = require('markdown-it-replace-link');
const { mathpixMarkdownPlugin, initMathpixMarkdown } = require('mathpix-markdown-it');
const eleventyPluginFilesMinifier = require("@sherby/eleventy-plugin-files-minifier");

const getMmdOptions = () => {
  return {
    width: 1200,
    htmlTags: true,
    mathJax: {},
    outMath: {},
    auto: false,
    openLinkInNewWindow: false,
    smiles: {
      disableColors: false,
      disableGradient: false
    }
  }
};

module.exports = function(config) {
  config.addPlugin(eleventyPluginFilesMinifier);

  config.addCollection('pages', collection => {
    return collection.getAllSorted().map(item => {
      item.outputPath = item.outputPath.toLowerCase();
    });
  });

  let markdownItOptions = {
    html: true,
    breaks: true,
    linkify: true,
    replaceLink(link, env) {
      // Skip outbound link.
      let isOutbound = new RegExp('^(?:[a-z]+:)?//', 'i');
      if (isOutbound.test(link)) { return link }

      // Remove markdown extension.
      let isMarkdown = new RegExp('(?:(readme|index))?.(md|mkd|mkdn|mdwn|mdown|markdown|mdl|mmd)$', 'i');
      if (isMarkdown.test(link)) {
        link = link.replace(isMarkdown, "");
      }

      // Check if there's an extension.
      let hasExt = /\.([0-9a-z]+)(?:[\?#]|$)/i;
      if (!hasExt.test(link)) {
        // Add trailing slash if missing.
        link = link.replace(/\/?(\?|#|$)/, '/$1');
      }

      // Ignore absolute root link.
      let isAbsolute = new RegExp(`^\/$`);
      if (isAbsolute.test(link)) {
        return link
      }

      let isInsideReadmeOrIndex = new RegExp('(?:(readme|index)).(md|mkd|mkdn|mdwn|mdown|markdown|mdl|mmd)$', 'i');
      if (isInsideReadmeOrIndex.test(env.page.inputPath)) {
         // Fix links inside README.md or index.md files.
        return config.getFilter("url")(link);
      } else {
        // Fix relative links.
        return config.getFilter("url")(`../${link}`);
      }
    }
  };
  
  let md = markdownIt(markdownItOptions)
  md.use(markdownItReplaceLink)
  md = initMathpixMarkdown(md, getMmdOptions);
  md.use(mathpixMarkdownPlugin, {});
  
  config.setLibrary("md", md);
  config.setLibrary("mmd", md);

  config.setBrowserSyncConfig({
    logLevel: "info",
    logPrefix: "Spectra",
    logFileChanges: false,
    ui: false,
    notify: true
  });

  return {
    pathPrefix: "/",
    dir: {
      layouts: '.spectra/layout',
      data: '.spectra/layout'
    },
    templateFormats: ['md'],
    markdownTemplateEngine: false
  };
};
