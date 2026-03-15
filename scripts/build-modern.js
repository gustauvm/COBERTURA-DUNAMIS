const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

async function ensureCleanDist() {
    fs.rmSync(DIST, { recursive: true, force: true });
    fs.mkdirSync(DIST, { recursive: true });
}

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
        return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}

async function minifyJs(inFile, outFile) {
    const source = fs.readFileSync(inFile, 'utf8');
    const result = await transform(source, {
        loader: 'js',
        minify: true,
        sourcemap: true,
        target: 'es2020'
    });
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, result.code, 'utf8');
    if (result.map) {
        fs.writeFileSync(outFile + '.map', result.map, 'utf8');
    }
}

async function minifyCss(inFile, outFile) {
    const source = fs.readFileSync(inFile, 'utf8');
    const result = await transform(source, {
        loader: 'css',
        minify: true,
        sourcemap: true,
        target: 'es2020'
    });
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, result.code, 'utf8');
    if (result.map) {
        fs.writeFileSync(outFile + '.map', result.map, 'utf8');
    }
}

function rewriteIndexHtml() {
    const htmlPath = path.join(ROOT, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('href="main.css"', 'href="main.css"');
    fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
}

async function main() {
    await ensureCleanDist();

    rewriteIndexHtml();

    await minifyCss(path.join(ROOT, 'main.css'), path.join(DIST, 'main.css'));
    await minifyJs(path.join(ROOT, 'config.js'), path.join(DIST, 'config.js'));
    await minifyJs(path.join(ROOT, 'core', 'data-layer.js'), path.join(DIST, 'core', 'data-layer.js'));
    await minifyJs(path.join(ROOT, 'app.js'), path.join(DIST, 'app.js'));
    await minifyJs(path.join(ROOT, 'sw.js'), path.join(DIST, 'sw.js'));

    copyRecursive(path.join(ROOT, 'images'), path.join(DIST, 'images'));
    copyRecursive(path.join(ROOT, 'unit_addresses.json'), path.join(DIST, 'unit_addresses.json'));
    copyRecursive(path.join(ROOT, 'unit_geo_cache.json'), path.join(DIST, 'unit_geo_cache.json'));
    copyRecursive(path.join(ROOT, 'manifest.webmanifest'), path.join(DIST, 'manifest.webmanifest'));

    console.log('Build moderno concluido em dist/.');
}

main().catch((err) => {
    console.error('Falha no build moderno:', err);
    process.exit(1);
});
