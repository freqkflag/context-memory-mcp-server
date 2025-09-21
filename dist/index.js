import process from "process";
import { pathToFileURL } from "url";
import { startContextMemoryServer } from "./server.js";
export * from "./server.js";
export { createContextMemoryServer as default } from "./server.js";
async function runCli() {
    try {
        const { waitUntilClosed } = await startContextMemoryServer();
        await waitUntilClosed;
    }
    catch (error) {
        console.error("Failed to start context memory MCP server", error);
        process.exit(1);
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void runCli();
}
