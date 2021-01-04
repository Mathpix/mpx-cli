const fs = require('fs');
const chalk = require('chalk');

let basePath = '';

class NavItem {
  constructor(path) {
    this.path = path;
    this.children = [];
    this.title = '';
    this.navLink = path.replace(basePath, '').replace(/\.[^/.]+$/, "").toLowerCase() + '/';
  }

  setTitle(title) {
    this.title = title.replace(/\..+$/, '');
  }
}


const createTree = (path, setBasePath) => {
  try {
    const children = fs.readdirSync(path);
    if (!children.length) {
      return;
    }
    let count = 0;
    if (setBasePath) {
      basePath = path;
    }
    const res = [];
    for (let i = 0; i < children.length; i++) {
      if (children[i].startsWith('.')) {
        continue;
      }
      const nextPath = path + '/' + children[i];
      const item = fs.statSync(nextPath);

      if (item.isFile() && /\.md$/.test(children[i]) || item.isDirectory()) {
        const navItem = new NavItem(nextPath);
        navItem.setTitle(children[i]);
        res.push(navItem);
      }
      if (item.isDirectory()) {
        res[count].children = createTree(nextPath);
      }
      count++;
    }
    return res;
  } catch (error) {
    console.log(chalk.red(error));
  }
}

module.exports = createTree;
