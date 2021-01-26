const fs = require("fs");
const chalk = require("chalk");

let basePath = "";

class NavItem {
  constructor(path) {
    this.path = path;
    this.children = [];
    this.title = "";
    this.savedLink = 
      path
        .replace(basePath, "")
        .replace(/\.[^/.]+$/, "")
        .toLowerCase() + "/";
    this.navLink = this.savedLink;
  }

  setTitle(title) {
    this.title = title.replace(/\..+$/, "");
  }

  overrideLink(link) {
    this.navLink = link;
  }
}

const createTree = (path, outputDirectory = "", parent = null) => {

  try {
    const children = fs.readdirSync(path);
    let count = 0;
    if (!children.length) {
      return;
    }
    if (outputDirectory) {
      basePath = path;
    }
    const res = [];
    for (let i = 0; i < children.length; i++) {
      let navItem = null;
      if (children[i].startsWith(".") || children[i] == outputDirectory.substring(2)) {
        continue;
      }
      if (children[i].match(/index\.(md|mmd)$/i) && !!outputDirectory) {
        navItem = new NavItem("/");
        navItem.setTitle("Page index");
        navItem.overrideLink("/");
        res.unshift(navItem);
      } else if(children[i].match(/index\.(md|mmd)$/i)) {
        parent.overrideLink(parent.savedLink);
        continue;
      } else {
        const nextPath = path + "/" + children[i];
        const item = fs.statSync(nextPath);
        if (
          (item.isFile() && /\.(md|mmd)$/.test(children[i])) ||
          item.isDirectory()
        ) {
          navItem = new NavItem(nextPath);
          navItem.setTitle(children[i]);
          res.push(navItem);
        }
        if (item.isDirectory() && res[count]) {
          res[count].overrideLink("");
          res[count].children = createTree(nextPath, "", navItem);
        }
      }
      count++;
    }
    return res;
  } catch (error) {
    console.log(chalk.red(error));
  }
};

module.exports = createTree;
