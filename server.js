// Configuration: map routes to HTML files in the src folder
const config = {
    routes: {
        "/": "./src/index.html",
        "/hand-pose": "./src/hand-pose.html",
        "/training": "./src/training.html",
        "/body-segmentation": "./src/body-segmentation.html",
        "/image-recognition": "./src/image-recognition.html",
    },
    port: 3000,
};

Bun.serve({
    port: config.port,
    async fetch(req) {
        const url = new URL(req.url);

        // Handle favicon at root level
        if (url.pathname === "/favicon.ico") {
            const file = Bun.file("./src/demo/favicon.ico");
            if (await file.exists()) {
                return new Response(file, {
                    headers: {"Content-Type": "image/x-icon"},
                });
            }
        }

        const htmlPath = config.routes[url.pathname];
        if (htmlPath) {
            const file = Bun.file(htmlPath);
            return new Response(file, {
                headers: {"Content-Type": "text/html"},
            });
        }

        if (url.pathname.startsWith("/demo/") || url.pathname.startsWith("/js/") || url.pathname.startsWith("/images/")) {
            const file = Bun.file(`./src${url.pathname}`);
            if (await file.exists()) {
                const contentType =
                    url.pathname.endsWith(".js") ? "application/javascript" :
                        url.pathname.endsWith(".css") ? "text/css" :
                            url.pathname.endsWith(".html") ? "text/html" :
                                url.pathname.endsWith(".png") ? "image/png" :
                                    url.pathname.endsWith(".jpg") || url.pathname.endsWith(".jpeg") ? "image/jpeg" :
                                        url.pathname.endsWith(".gif") ? "image/gif" :
                                            url.pathname.endsWith(".svg") ? "image/svg+xml" :
                                                url.pathname.endsWith(".ico") ? "image/x-icon" :
                                                    "application/octet-stream";

                return new Response(file, {
                    headers: {"Content-Type": contentType},
                });
            }
        }

        return new Response("Not found", {status: 404});
    },
});

console.log(`Server running at http://localhost:${config.port}`);
console.log("Available routes:");
for (const [route, file] of Object.entries(config.routes)) {
    console.log(`  http://localhost:${config.port}${route} -> ${file}`);
}
