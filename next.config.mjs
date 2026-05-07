import withPWAInit from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
	dest: "public",
	register: true,
	skipWaiting: true,
	disable: isDev,
	runtimeCaching: [
		{
			// App Router RSC payloads (prefetch + navigation) for offline transitions.
			urlPattern: ({ request, sameOrigin }) =>
				sameOrigin &&
				(request.headers.get("RSC") === "1" ||
					request.headers.get("next-router-prefetch") === "1"),
			handler: "StaleWhileRevalidate",
			options: {
				cacheName: "rsc-cache",
				expiration: {
					maxEntries: 128,
					maxAgeSeconds: 7 * 24 * 60 * 60,
				},
				cacheableResponse: {
					statuses: [0, 200],
				},
			},
		},
		{
			// Static app shell and route documents for fast offline loads.
			urlPattern: ({ request, sameOrigin }) =>
				sameOrigin && request.mode === "navigate",
			handler: "StaleWhileRevalidate",
			options: {
				cacheName: "pages-cache",
				expiration: {
					maxEntries: 64,
					maxAgeSeconds: 7 * 24 * 60 * 60,
				},
				cacheableResponse: {
					statuses: [0, 200],
				},
			},
		},
		{
			// Static assets (JS/CSS/fonts/images).
			urlPattern: ({ request, sameOrigin }) =>
				sameOrigin &&
				["script", "style", "font", "image"].includes(request.destination),
			handler: "CacheFirst",
			options: {
				cacheName: "static-assets-cache",
				expiration: {
					maxEntries: 128,
					maxAgeSeconds: 30 * 24 * 60 * 60,
				},
				cacheableResponse: {
					statuses: [0, 200],
				},
			},
		},
		{
			// FD JSON and data payloads: serve cache immediately, update in background.
			urlPattern: ({ url, sameOrigin }) =>
				sameOrigin &&
				(url.pathname.startsWith("/fd-info/") || url.pathname.endsWith(".json")),
			handler: "StaleWhileRevalidate",
			options: {
				cacheName: "fd-data-cache",
				expiration: {
					maxEntries: 50,
					maxAgeSeconds: 24 * 60 * 60,
				},
				cacheableResponse: {
					statuses: [0, 200],
				},
			},
		},
		{
			// API routes: always try network first, then fallback to cached response.
			urlPattern: ({ url, sameOrigin }) =>
				sameOrigin &&
				(url.pathname.startsWith("/api/chat") ||
					url.pathname.startsWith("/api/transcribe")),
			handler: "NetworkFirst",
			options: {
				cacheName: "api-network-first",
				networkTimeoutSeconds: 8,
				expiration: {
					maxEntries: 32,
					maxAgeSeconds: 60 * 60,
				},
				cacheableResponse: {
					statuses: [0, 200],
				},
			},
		},
	],
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
