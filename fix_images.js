const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
const srcDir = path.join(__dirname, 'src');

function getTrueExtension(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return '.jpg';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return '.webp';
  }
  return null;
}

function updateImports(oldName, newName) {
  const walkSync = function(dir, filelist) {
    let files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
        filelist = walkSync(path.join(dir, file), filelist);
      }
      else if (file.endsWith('.js') || file.endsWith('.jsx')) {
        filelist.push(path.join(dir, file));
      }
    });
    return filelist;
  };

  const allFiles = walkSync(srcDir);
  let updatedCount = 0;
  
  allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(oldName)) {
      content = content.split(oldName).join(newName);
      fs.writeFileSync(file, content, 'utf8');
      updatedCount++;
    }
  });
  console.log(`Updated imports from ${oldName} to ${newName} in ${updatedCount} files.`);
}

const allAssetFiles = fs.readdirSync(assetsDir);
const pngFiles = allAssetFiles.filter(file => file.endsWith('.png'));

pngFiles.forEach(filename => {
  const filePath = path.join(assetsDir, filename);
  
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);
  
  const trueExt = getTrueExtension(buffer);
  
  if (trueExt) {
    const oldName = filename;
    const newName = filename.replace('.png', trueExt);
    const newFilePath = path.join(assetsDir, newName);
    
    console.log(`${oldName} is actually a ${trueExt} file. Renaming to ${newName}...`);
    fs.renameSync(filePath, newFilePath);
    
    updateImports(oldName, newName);
  }
});
console.log("Finished scanning all PNG files!");
