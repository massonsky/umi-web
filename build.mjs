// @ts-check
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/index.js',
    // CSS files are imported as text strings (for LitElement unsafeCSS usage)
    loader: { '.css': 'text' },
    // Peer/host dependencies — do not bundle them
    external: [
        'lit',
        'lit/decorators.js',
        'lit/directives/*',
        '@lit/*',
        '@material/web',
        '@material/web/*',
        '@material/material-color-utilities',
    ],
    target: 'es2022',
    sourcemap: true,
    metafile: true,
};

if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('[umi-components] Watching for changes...');
} else {
    const result = await esbuild.build(buildOptions);
    if (result.metafile) {
        const outputSize = Object.values(result.metafile.outputs)
            .reduce((s, o) => s + o.bytes, 0);
        console.log(`[umi-components] Build complete → dist/index.js (${(outputSize / 1024).toFixed(1)} KB)`);
    } else {
        console.log('[umi-components] Build complete → dist/index.js');
    }
}
