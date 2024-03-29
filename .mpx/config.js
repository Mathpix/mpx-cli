const markdownIt = require.main.require("markdown-it");
const markdownItReplaceLink = require.main.require('markdown-it-replace-link');
const { mathpixMarkdownPlugin, initMathpixMarkdown } = require.main.require('mathpix-markdown-it');
const eleventyPluginFilesMinifier = require.main.require("@sherby/eleventy-plugin-files-minifier");

const getMmdOptions = () => {
  return {
    width: 1200,
    breaks: false,
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

  config.addCollection('pages', (collection) => {
    return collection
      .getAllSorted()
      .map((item) => {
        item.outputPath = item.outputPath.replace(item.filePathStem, item.filePathStem.toLowerCase());
        item.lowerURL = item.url.toLowerCase();
        item.data.page.url = item.lowerURL;
        return item;
      })
      .sort((a, b) => {
        return a.lowerURL.localeCompare(b.lowerURL);
      });
  });


  let markdownItOptions = {
    html: true,
    breaks: false,
    linkify: true,
    replaceLink(link, env) {

      link = link.toLowerCase()

      // Skip outbound link.
      let isOutbound = new RegExp('^(?:[a-z]+:)?//', 'i');
      if (isOutbound.test(link)) { return link }

      // Remove markdown extension.
      let isMarkdown = new RegExp('(?:(index))?.(md|mkd|mkdn|mdwn|mdown|markdown|mdl|mmd)$', 'i');
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

      let isInsideIndex = new RegExp('(?:(index)).(md|mkd|mkdn|mdwn|mdown|markdown|mdl|mmd)$', 'i');
      if (isInsideIndex.test(env.page.inputPath)) {
         // Fix links inside INDEX.md or index.md files.
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
  
  config.setTemplateFormats([
    "md",
    "mmd",
    "png",
    "gif",
    "jpg",
    "jpeg",
    "pdf",
    "svg",
    "njk",
  ]);

  config.setLibrary("md", md);
  config.setLibrary("mmd", md);

  config.setBrowserSyncConfig({
    logLevel: "info",
    logPrefix: "mpx",
    logFileChanges: false,
    ui: false,
    notify: true
  });

  return {
    markdownTemplateEngine: "md",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",

    pathPrefix: "/",
    dir: {
      layouts: '.mpx/layout',
      data: '.mpx/layout'
    },
    templateFormats: ['md', 'mmd', 'njk']
  };
};
