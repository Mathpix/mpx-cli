const fs = require('fs');
const chalk = require('chalk');

class NavItem {
  constructor(path) {
    this.path = path;
    this.children = [];
    this.title = '';
  }

  setTitle(title) {
    this.title = title.replace(/\..+$/, '');
  }
}

const createTree = (path) => {
  try {
    const children = fs.readdirSync(path);
    let count = 0;
    if (!children.length) {
      return;
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
