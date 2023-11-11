
// navigator.serviceWorker?.register("./service-worker.js", { scope: "./", updateViaCache: "all" });

{
	navigator.serviceWorker.addEventListener("message", async (/** @type {MessageEvent} */ { data }) => {
		if (data.message === "updateAvailable") {
			console.log("update available");
		}
	});

	{
		const checkReadyState = async () => {
			if (document.readyState === "complete" && navigator.onLine) {
				(await navigator.serviceWorker?.ready)?.active.postMessage({ message: "checkForUpdate" });
			}
		};
		checkReadyState();
		document.addEventListener("readystatechange", checkReadyState);
	}
}

const lines = (await (await window.fetch("./UnicodeData.txt")).text()).split("\n"); // https://unicode.org/Public/draft/UCD/ucd/UnicodeData.txt
const zwjSequencesLines = (
	await (await window.fetch("./emoji-sequences.txt")).text()
	+ await (await window.fetch("./emoji-zwj-sequences.txt")).text()
).split("\n"); // https://unicode.org/Public/draft/emoji/emoji-zwj-sequences.txt

const renderCharacters = async (/** @type {string} */ characterMode) => {
	const mainEl = document.querySelector("ul.list");
	mainEl.innerHTML = "";

	const addCharacter = (/** @type {number[]} */ codePoints, /** @type {string} */ name, /** @type {DocumentFragment} */ fragment) => {
		const el = document.createElement("li");

		el.textContent = codePoints.map((codePoint) => String.fromCodePoint(codePoint)).join("") + (
			characterMode === "symbol" ? "\uFE0E" : characterMode === "emoji" ? "\uFE0F" : ""
		);
		el.title = `${codePoints.map((codePoint) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`).join(" ")}: ${name}`;

		fragment.append(el);
	}

	for (let i = 0; i < lines.length;) {
		// for (let i = 0; i < 100;) {
		let documentFragment = new DocumentFragment();

		$innerLoop: for (let j = 0; j < 0x1_000; j++, i++) {
			if (i >= lines.length) {
				break $innerLoop;
			}

			const characterData = lines[i].split(";");
			const codePointString = characterData[0];
			const codePoint = window.parseInt(codePointString, 16);
			let name = characterData[1];
			if (name.endsWith(", First>")) {
				const match = name.match(/<(?<script>.+), First>/);
				const scriptName = match?.groups.script;
				if (!scriptName) console.error("Malformed Unicode script range");
				i++;
				mainEl.append(documentFragment);
				documentFragment = new DocumentFragment();
				if (!["Private Use", "Plane 15 Private Use", "Plane 16 Private Use"].includes(scriptName)) {
					const endCodePoint = window.parseInt(lines[i].split(";")[0], 16);
					for (let k = codePoint; k <= endCodePoint;) {

						const fragment = new DocumentFragment();

						$innerInnerLoop: for (let l = 0; l < 0x1_000; l++, k++) {
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
				if (name === "<control>") name += ` (${characterData[10]})`;
				addCharacter([codePoint], name, documentFragment);
			}
		}

		mainEl.append(documentFragment);

		await new Promise((resolve) => setTimeout(() => requestAnimationFrame(resolve)));
	}

	for (let i = 0; i < zwjSequencesLines.length;) {
		const documentFragment = new DocumentFragment();

		innerLoop: for (let j = 0; j < 0x1_000; j++, i++) {
			if (i >= zwjSequencesLines.length) {
				break innerLoop;
			}

			const line = zwjSequencesLines[i].split("#")[0].trim();
			let data = line.split(";");
			if (data.length < 3) continue innerLoop;
			const codePoints = data[0].trim().split(" ").map((string) => window.parseInt(string, 16));
			const typeField = data[1].trim();
			if (typeField === "Basic_Emoji") continue innerLoop;
			const description = data[2].trim();

			addCharacter(codePoints, description, documentFragment);
		}

		mainEl.append(documentFragment);

		await new Promise((resolve) => setTimeout(resolve));
	}
};

for (const characterMode of ["normal", "symbol", "emoji"]) {
	document.querySelector(`[data-render=${characterMode}]`).addEventListener("change", () => {
		renderCharacters(characterMode);
	});
}

renderCharacters("normal");

export { };
