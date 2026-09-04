// Ein einziges Vite-Plugin fuer alle drei Firmware-Web-Projekte (factory_in_a_box, sensact,
// labathome): inlined JS+CSS in eine einzige index.html, entfernt zusaetzliche Leerzeichen (inkl.
// Lit-Templates, s. singlefile-minify.ts) und schreibt das Ergebnis direkt Brotli-komprimiert als
// Firmware-Asset. Vorher als drei textidentische bzw. fast-identische Kopien pro Repo gepflegt
// (factory_in_a_box/web/build-tools/, sensact_firmware/web/, zuletzt auch fuer labathome geplant)
// -- jetzt hier EIN Mal, von allen per file:-Abhaengigkeit konsumiert.
//
//   1) Inlined JS+CSS in die index.html -- der Kern davon ist an
//      https://github.com/richardtallent/vite-plugin-singlefile (MIT-lizenziert, Autor Richard
//      Tallent) angelehnt/nachgebaut: replaceScript()/replaceCss() unten entsprechen dessen
//      gleichnamigen Funktionen, auf das hier tatsaechlich benoetigte Minimum (ein JS- und ein
//      CSS-Bundle) zugeschnitten.
//   2) minifyHtmlDocument() (singlefile-minify.ts) entfernt zusaetzliche Leerzeichen aus dem
//      inlinierten HTML/CSS/JS -- inklusive Lit-Tagged-Template-Inhalten (html`...`/css`...`), die
//      generische Minifizierer als beliebige String-Literale unangetastet liessen.
//   3) Brotli-komprimiert das Ergebnis direkt im selben Rutsch.
//
// Zielverzeichnis (Parameter "outDir", optional): die drei Konsumenten haben unterschiedliche
// Konventionen, WOHIN das fertige Firmware-Asset geschrieben wird -- factory_in_a_box schreibt
// unabhaengig von Vites eigenem build.outDir in einen board-uebergreifenden, mit Zertifikaten
// GETEILTEN Ordner (build/assets/), der bewusst NICHT von Vite geleert werden darf (sonst
// verschwinden dort bereits abgelegte device_certificate.der/device_key.der/root_ca.der wieder);
// sensact/labathome dagegen rufen "vite build --outDir <generatedDir> --emptyOutDir" auf und
// verlassen sich auf Vites eigenen, dafuer vorgesehenen Ausgabeordner. Deshalb: wird ein
// expliziter "outDir" uebergeben, wird DORTHIN geschrieben (factory_in_a_box); wird er weggelassen,
// wird options.dir (Vites tatsaechlich aufgeloester Ausgabeordner) verwendet (sensact/labathome).
// So bleibt das bisherige, pro Projekt bewusst unterschiedliche Verhalten erhalten -- nur die
// Implementierung ist jetzt geteilt.
// BEWUSST kein "import type {Plugin} from 'vite'"/"from 'rollup'": dieses Package wird per file:
// in drei voneinander unabhaengige Repos gelinkt, jedes mit seiner EIGENEN vite-Installation. Ein
// Typ-Import wuerde eine zweite, physisch andere "vite"-Modulinstanz ins Spiel bringen, gegen die
// TS Vites (stark rekursive) Plugin-/UserConfig-Generics vergleichen muesste -- das schlaegt mit
// "TS2321: Excessive stack depth" fehl (zwei nominell gleiche, aber unterschiedlich aufgeloeste
// Modultypen). Exakt der Grund, warum die bereits bestehende @klaus-liebler/vite-single-file
// (gleiches file:-Verteilungsmuster) ihre Plugin-Rueckgabe ebenfalls als "any" typisiert, statt
// "vite"/"rollup" zu importieren -- hier aus demselben Grund uebernommen.
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { minifyHtmlDocument } from "./singlefile-minify.ts";

interface RollupOutputAsset {
	type: "asset";
	fileName: string;
	source: string | Uint8Array;
}
interface RollupOutputChunk {
	type: "chunk";
	fileName: string;
	code: string;
}
type RollupOutputItem = RollupOutputAsset | RollupOutputChunk;
type RollupOutputBundle = Record<string, RollupOutputItem>;

const isJsFile = /\.[mc]?js$/;
const isCssFile = /\.css$/;
const isHtmlFile = /\.html?$/;

// Angelehnt an vite-plugin-singlefile's replaceScript() (s. Datei-Kommentar oben).
function replaceScript(html: string, scriptFilename: string, scriptCode: string): string {
	const escapedFilename = scriptFilename.replaceAll(".", "\\.");
	const scriptTagPattern = new RegExp(`<script([^>]*?) src="(?:[^"]*?/)?${escapedFilename}"([^>]*)></script>`);
	const preloadMarker = /"?__VITE_PRELOAD__"?/g;
	const newCode = scriptCode.replace(preloadMarker, "void 0").replace(/<(\/script>|!--)/g, "\\x3C$1");
	return html.replace(scriptTagPattern, (_match, beforeSrc, afterSrc) => `<script${beforeSrc}${afterSrc}>${newCode.trim()}</script>`);
}

// Angelehnt an vite-plugin-singlefile's replaceCss() (s. Datei-Kommentar oben).
function replaceCss(html: string, styleFilename: string, cssCode: string): string {
	const escapedFilename = styleFilename.replaceAll(".", "\\.");
	const linkTagPattern = new RegExp(`<link([^>]*?) href="(?:[^"]*?/)?${escapedFilename}"([^>]*)>`);
	const newCode = cssCode.replace(`@charset "UTF-8";`, "");
	return html.replace(linkTagPattern, (_match, beforeHref, afterHref) => `<style${beforeHref}${afterHref}>${newCode.trim()}</style>`);
}

function inlineBundleIntoHtml(bundle: RollupOutputBundle): RollupOutputAsset | undefined {
	let htmlAsset: RollupOutputAsset | undefined;
	const jsChunks: RollupOutputChunk[] = [];
	const cssAssets: RollupOutputAsset[] = [];
	const toDelete: string[] = [];

	for (const [fileName, item] of Object.entries(bundle)) {
		if (isHtmlFile.test(fileName)) {
			htmlAsset = item as RollupOutputAsset;
		} else if (isJsFile.test(fileName) && item.type === "chunk") {
			jsChunks.push(item);
		} else if (isCssFile.test(fileName) && item.type === "asset") {
			cssAssets.push(item as RollupOutputAsset);
		}
	}

	if (!htmlAsset) return undefined;

	let html = htmlAsset.source as string;
	for (const chunk of jsChunks) {
		html = replaceScript(html, chunk.fileName, chunk.code);
		toDelete.push(chunk.fileName);
	}
	for (const asset of cssAssets) {
		html = replaceCss(html, asset.fileName, asset.source as string);
		toDelete.push(asset.fileName);
	}

	htmlAsset.source = html;
	for (const fileName of toDelete) {
		delete bundle[fileName];
	}
	return htmlAsset;
}

export function singleFileFirmwareAssetPlugin(compressedFileName: string = "index.compressed.br", outDir?: string): any {
	return {
		name: "single-file-firmware-asset",
		enforce: "post",

		// Entspricht vite-plugin-singlefile's "useRecommendedBuildConfig": alle Assets/Chunks
		// muessen in EINEM JS- und EINEM CSS-Bundle landen, damit generateBundle unten ueberhaupt
		// etwas zum Inlinen hat.
		config() {
			return {
				build: {
					assetsInlineLimit: () => true,
					cssCodeSplit: false,
					assetsDir: "",
					rollupOptions: {
						output: {
							inlineDynamicImports: true,
						},
					},
				},
				base: "./",
			};
		},

		async generateBundle(options: { dir?: string }, bundle: RollupOutputBundle) {
			const htmlAsset = inlineBundleIntoHtml(bundle);
			if (!htmlAsset) return;

			const minified = await minifyHtmlDocument(htmlAsset.source as string);
			htmlAsset.source = minified;

			const htmlBuffer = Buffer.from(minified, "utf8");
			const compressed = brotliCompressSync(htmlBuffer, {
				params: {
					[zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
					[zlibConstants.BROTLI_PARAM_SIZE_HINT]: htmlBuffer.length,
				},
			});

			// Explizites outDir (Aufrufer-Parameter) hat Vorrang vor options.dir (Vites eigenem,
			// tatsaechlich aufgeloestem Ausgabeordner) -- s. Datei-Kommentar oben.
			const resolvedOutDir = outDir ?? options.dir ?? ".";
			mkdirSync(resolvedOutDir, { recursive: true });
			const outFile = path.join(resolvedOutDir, compressedFileName);
			writeFileSync(outFile, compressed);
			console.log(`[single-file-firmware-asset] ${htmlBuffer.length} B -> brotli ${compressed.length} B -> ${outFile}`);
		},
	};
}
