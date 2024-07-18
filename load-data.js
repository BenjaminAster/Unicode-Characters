
/* 
node --experimental-default-type=module load-data.js
bun load-data.js
*/

import * as fs from "node:fs/promises";
import * as path from "node:path";

await fs.mkdir(path.resolve(import.meta.dirname, "./data/"), { recursive: true });

await Promise.all([
	["https://unicode.org/Public/UCD/latest/ucd/UnicodeData.txt", path.resolve(import.meta.dirname, "./data/UnicodeData.txt")],
	["https://unicode.org/Public/emoji/latest/emoji-sequences.txt", path.resolve(import.meta.dirname, "./data/emoji-sequences.txt")],
	["https://unicode.org/Public/emoji/latest/emoji-zwj-sequences.txt", path.resolve(import.meta.dirname, "./data/emoji-zwj-sequences.txt")],
	["https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-annotations-full/annotations/en/annotations.json", path.resolve(import.meta.dirname, "./data/cldr-annotations.json")],
].map(async ([url, filePath]) => await fs.writeFile(filePath, await (await global.fetch(url)).text())));
