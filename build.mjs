// @ts-check
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const baseOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'esm',
    // CSS files are imported as text strings (for LitElement unsafeCSS usage)
    loader: { '.css': 'text' },
    target: 'es2022',
    sourcemap: true,
};

/** @type {import('esbuild').BuildOptions} */
const libBuildOptions = {
    ...baseOptions,
    outfile: 'dist/index.js',
    // Library bundle for npm consumers (deps resolved by host bundler/runtime)
    external: [
        'lit',
        'lit/decorators.js',
        'lit/directives/*',
        '@lit/*',
        '@material/web',
        '@material/web/*',
        '@material/material-color-utilities',
    ],
    metafile: true,
};

/** @type {import('esbuild').BuildOptions} */
const browserBuildOptions = {
    ...baseOptions,
    outfile: 'dist/index.browser.js',
    // Browser-ready bundle for static hosting (GitHub Pages, local static server)
    external: [],
    metafile: true,
};

if (watch) {
    const ctx = await esbuild.context(libBuildOptions);
    await ctx.watch();
    console.log('[umi-components] Watching dist/index.js (library bundle)...');
} else {
    const [libResult, browserResult] = await Promise.all([
        esbuild.build(libBuildOptions),
        esbuild.build(browserBuildOptions),
    ]);

    const libSize = libResult.metafile
        ? Object.values(libResult.metafile.outputs).reduce((s, o) => s + o.bytes, 0)
        : 0;
    const browserSize = browserResult.metafile
        ? Object.values(browserResult.metafile.outputs).reduce((s, o) => s + o.bytes, 0)
        : 0;

    console.log(`[umi-components] Build complete → dist/index.js (${(libSize / 1024).toFixed(1)} KB)`);
    console.log(`[umi-components] Build complete → dist/index.browser.js (${(browserSize / 1024).toFixed(1)} KB)`);
}
