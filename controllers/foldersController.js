const fs = require('fs');
const path = require('path');

const getTree =  (req, res) => {
    const rootDir = path.join('public', 'storage');
    const treeData = getDirectoryTree(rootDir);
    res.json(treeData);
  };

  function getDirectoryTree(dirPath) {
    const name = path.basename(dirPath);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    const type = isDirectory ? 'directory' : 'file';
  
    const item = {
      name,
      type,
    };
  
    if (isDirectory) {
      item.children = fs.readdirSync(dirPath).map(childName => getDirectoryTree(path.join(dirPath, childName)));
    }
  
    return item;
}

module.exports = {getTree};