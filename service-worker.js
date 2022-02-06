
/// <reference lib="webworker" />

const cacheName = new URL(self.registration.scope).pathname;

self.addEventListener("fetch", (/** @type {FetchEvent} */ event) => {
	event.respondWith((async () => (
		await (await self.caches.open(cacheName)).match(event.request)
		??
		await (async () => {
			const response = await self.fetch(event.request, { cache: "no-store" });
			await (await self.caches.open(cacheName)).put(event.request, response.clone());
			return response;
		})()
	))());
});

self.addEventListener("message", async (/** @type {MessageEvent} */ { data, source }) => {
	if (data.message === "checkForUpdate") {

		const cachedHTML = await (await (await self.caches.open(cacheName)).match("./"))?.text();

		if (!cachedHTML) return;

		const fetchedHTML = await (async () => {
			try {
				return await (await self.fetch("./", { cache: "no-store" }))?.text();
			} catch {
				console.log("%cFailed to check for an update.", "color: lightCoral; background: black");
				return null;
			}
		})();

		if (!fetchedHTML) return;

		if (cachedHTML !== fetchedHTML) {
			await self.caches.delete(cacheName);
			await self.registration.unregister();

			source.postMessage({ message: "updateAvailable" });
		}
	}
});
