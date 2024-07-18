
/// <reference types="better-typescript" />

const unicodeData = (await (
	await self.fetch(import.meta.resolve("./data/UnicodeData.txt"))
).text()).trim().split("\n").map((line) => {
	const lineData = line.split(";");
	if (lineData[1] === "<control>") lineData[1] += ` (${lineData[10]})`;
	return /** @type {const} */ ([self.parseInt(lineData[0], 16), lineData[1]]);
});

const emojiAndZwjSequencesLines = (
	await (await self.fetch(import.meta.resolve("./data/emoji-sequences.txt"))).text()
	+ await (await self.fetch(import.meta.resolve("./data/emoji-zwj-sequences.txt"))).text()
).split("\n"); // https://unicode.org/Public/draft/emoji/

const unicodeCharMap = new Map(unicodeData);
// const unicodeCharMap = new Map(Object.fromEntries([]));

const cldrAnnotations = (await (await self.fetch(import.meta.resolve("./data/cldr-annotations.json"))).json()).annotations.annotations;

const mainEl = document.querySelector("ul.list");
const characterInfobox = document.querySelector("#character-info");

let /** @type {AbortController} */ abortController;

const renderCharacters = async (/** @type {string} */ characterMode) => {
	mainEl.innerHTML = "";
	abortController = new AbortController();
	const signal = abortController.signal;

	const addCharacter = (/** @type {number[]} */ codePoints, /** @type {string} */ name, /** @type {DocumentFragment} */ fragment) => {
		const el = document.createElement("li");

		const string = codePoints.map((codePoint) => String.fromCodePoint(codePoint)).join("");
		el.textContent = string + (characterMode === "symbol" ? "\uFE0E" : characterMode === "emoji" ? "\uFE0F" : "");
		const annotation = cldrAnnotations[string];
		// el.title = `${codePoints.map((codePoint) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`).join(" ")}: ${name + (annotation ? ` (${annotation.tts[0]})` : "")}`;
		el.dataset.name = name;
		el.dataset.codePoints = codePoints.length === 1
			? `U+${codePoints[0].toString(16).toUpperCase().padStart(4, "0")}`
			: codePoints.map((codePoint) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")} ${String.fromCodePoint(codePoint)} (${unicodeCharMap.get(codePoint)})`).join("\n");
		if (annotation) el.dataset.annotation = annotation.tts[0];

		fragment.append(el);
	}

	if (characterMode.startsWith("all-")) {
		for (let i = 0; i < unicodeData.length;) {
			// for (let i = 0; i < 100;) {
			let documentFragment = new DocumentFragment();

			$innerLoop: for (let j = 0; j < 0x1_000; j++, i++) {
				if (signal.aborted) return;
				if (i >= unicodeData.length) {
					break $innerLoop;
				}

				// const characterData = lines[i].split(";");
				// const codePointString = characterData[0];
				// const codePoint = window.parseInt(codePointString, 16);
				let [codePoint, name] = unicodeData[i];
				// let name = characterData[1];
				if (name.endsWith(", First>")) {
					const match = name.match(/<(?<script>.+), First>/);
					const scriptName = match?.groups.script;
					if (!scriptName) console.error("Malformed Unicode script range");
					i++;
					mainEl.append(documentFragment);
					documentFragment = new DocumentFragment();
					if (!["Private Use", "Plane 15 Private Use", "Plane 16 Private Use"].includes(scriptName)) {
						const endCodePoint = unicodeData[i][0];
						for (let k = codePoint; k <= endCodePoint;) {

							const fragment = new DocumentFragment();

							$innerInnerLoop: for (let l = 0; l < 0x1_000; l++, k++) {
								if (signal.aborted) return;
								if (k > endCodePoint) {
									break $innerInnerLoop;
								}

								addCharacter([k], scriptName, fragment);
							}

							mainEl.append(fragment);

							await new Promise((resolve) => setTimeout(() => requestAnimationFrame(resolve)));
						}
					}
				} else {
					// if (name === "<control>") name += ` (${unicode1_0Name})`;
					addCharacter([codePoint], name, documentFragment);
				}
			}

			mainEl.append(documentFragment);

			await new Promise((resolve) => setTimeout(() => requestAnimationFrame(resolve)));
		}
	} else {
		for (let i = 0; i < emojiAndZwjSequencesLines.length;) {
			const documentFragment = new DocumentFragment();

			innerLoop: for (let j = 0; j < 0x1_000; j++, i++) {
				if (signal.aborted) return;
				if (i >= emojiAndZwjSequencesLines.length) {
					break innerLoop;
				}

				const line = emojiAndZwjSequencesLines[i].split("#")[0].trim();
				let data = line.split(";");
				if (data.length < 3) continue innerLoop;
				// const typeField = data[1].trim();
				const codePointsString = data[0].trim();
				if (codePointsString.includes("..")) {
					const [startCodePointString, endCodePointString] = codePointsString.split("..");
					const startCodePoint = self.parseInt(startCodePointString, 16);
					const endCodePoint = self.parseInt(endCodePointString, 16);
					for (let k = startCodePoint; k <= endCodePoint; k++) {
						addCharacter([k], unicodeCharMap.get(k), documentFragment);
					}
				} else {
					const codePointStrings = codePointsString.split(" ");
					// if (codePointStrings.length < 2) continue innerLoop;
					const codePoints = codePointStrings.map((string) => self.parseInt(string, 16));
					const description = data[2].trim();

					addCharacter(codePoints, description, documentFragment);
				}
			}

			mainEl.append(documentFragment);

			await new Promise((resolve) => setTimeout(resolve));
		}
	}
};

{
	mainEl.addEventListener("pointerover", (event) => {
		// console.log(event.target);

		// characterInfobox.textContent = JSON.stringify({
		// 	name: event.target.dataset.name,
		// 	"code points": event.target.dataset.codePoints,
		// 	annotation: event.target.dataset.annotation
		// }, null, "\t");
		characterInfobox.querySelector("[itemprop=name]").textContent = event.target.dataset.name;
		characterInfobox.querySelector("[itemprop=code-points]").textContent = event.target.dataset.codePoints;
		characterInfobox.querySelector("[itemprop=annotation]").textContent = event.target.dataset.annotation;
	});
}

document.querySelector(`fieldset#render-mode`).addEventListener("change", ({ target }) => {
	// console.log(target.value);
	abortController?.abort();
	history.pushState(null, "", `?tab=${target.value}`);
	renderCharacters(target.value);
});

window.addEventListener("popstate", () => {
	abortController?.abort();
	const searchParams = new URLSearchParams(location.search);
	renderCharacters(searchParams.get("tab") || "all-normal");
});

const searchParams = new URLSearchParams(location.search);
(document.querySelector(`fieldset#render-mode input[value="${searchParams.get("tab") || "all-normal"}"]`) || /** @type {any} */ ({})).checked = true;
renderCharacters(searchParams.get("tab") || "all-normal");

export { };
