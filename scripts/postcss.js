const {resolve, dirname} = require('path');
const fs = require('fs-extra');
const glob = require('glob-fs')({gitignore: true});
const chokidar = require('chokidar');

const postcss = require('postcss');
const postcssrc = require('postcss-load-config');

const IS_DEV = process.argv.find(arg => arg.includes('watch'));
const elementArg = process.argv.find(arg => arg.includes('element='));
const element = elementArg ? elementArg.replace('element=', '') : null;

const FOLDER = element ? `./elements/${element}/**/*.pcss` : './elements/**/*.pcss';

const _process = async file => {
  const cssFile = file.replace('postcss', 'css').replace('src', 'dist');
  const fileContent = await fs.readFile(file, 'utf8');
  const res = await postcssrc()
    .then(({plugins}) => postcss(plugins).process(fileContent, {from: file, to: cssFile}));

  await fs.ensureDir(dirname(cssFile));
  await fs.remove(cssFile);
  await fs.writeFile(cssFile, res.css);
  return true;
};

/** dev command */
const dev = folder => {
  const watcher = chokidar.watch(folder, {
    ignored: /dist/,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
});

  return watcher
    .on('add', sourcePath => console.log(`PostCSS Watcher: file ${sourcePath} has been added`))
    .on('change', async sourcePath => console.log(`Building: ${sourcePath}`, await _process(sourcePath)))
    .on('unlink', sourcePath => console.log(`PostCSS Watcher: File ${sourcePath} has been removed`));
};

/** Build command */
const build = async folder => {
  const files = glob.readdirSync(folder);
  files.forEach(async file => _process(file));
};

const main = () =>
  IS_DEV ? dev(FOLDER) : build(FOLDER).catch(err => console.error(err));

main();