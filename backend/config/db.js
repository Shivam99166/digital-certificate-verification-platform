const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const dns = require("dns").promises;
const dnsBase = require("dns");

// On Windows, local ISP resolvers often block Atlas SRV queries.
// On Linux/Render containers, overriding setServers breaks container DNS routing,
// so only configure public DNS servers on Windows or as an explicit fallback.
if (process.platform === "win32") {
  try {
    dnsBase.setServers(["1.1.1.1", "8.8.8.8"]);
  } catch (_) {}
}

const connectOptions = (uri) => ({
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  tls: uri.startsWith("mongodb+srv://"),
});

const connectDB = async () => {
  const rawAtlas = process.env.MONGO_URI;
  const atlasUri = rawAtlas ? rawAtlas.trim().replace(/^["']|["']$/g, "") : undefined;
  const localUri = process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/digital_certificate";
  const useInMemoryFallback = process.env.USE_IN_MEMORY_DB === "true";
  const isProduction = process.env.NODE_ENV === "production";

  const uri = atlasUri || localUri;

  if (!uri && !useInMemoryFallback) {
    throw new Error("MONGO_URI or LOCAL_MONGO_URI is not configured");
  }

  const tryConnect = async (connectionUri) => {
    await mongoose.connect(connectionUri, connectOptions(connectionUri));
    console.log("MongoDB connected successfully");
  };

  try {
    await tryConnect(uri);
    return;
  } catch (error) {
    console.warn("Primary MongoDB connection attempt failed:", error.message);

    const shouldRetryWithHosts =
      atlasUri &&
      atlasUri.startsWith("mongodb+srv://") &&
      /querySrv|ECONNREFUSED|ENOTFOUND|timeout|whitelist/i.test(error.message);

    if (shouldRetryWithHosts) {
      console.warn("Attempting fallback SRV resolution...");
      try {
        const fallbackUri = await buildFallbackUri(atlasUri);
        await tryConnect(fallbackUri);
        return;
      } catch (fallbackError) {
        console.error("Explicit seed list retry failed:", fallbackError.message);
      }
    }

    // Only attempt local database fallback in development
    if (!isProduction && atlasUri && localUri && localUri !== atlasUri) {
      console.warn("Attempting local database fallback (development only)...");
      try {
        await tryConnect(localUri);
        console.log("MongoDB connected successfully using LOCAL_MONGO_URI");
        return;
      } catch (localError) {
        console.error("Local MongoDB connection failed:", localError.message);
      }
    }

    if (useInMemoryFallback) {
      console.warn("USE_IN_MEMORY_DB=true so starting an in-memory MongoDB instance...");
      try {
        const memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        await tryConnect(memoryUri);
        console.log("MongoDB connected successfully using in-memory MongoDB");
        return;
      } catch (memoryError) {
        console.error("In-memory MongoDB fallback failed:", memoryError.message);
      }
    }

    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

const buildFallbackUri = async (uri) => {
  const parsed = new URL(uri);
  const host = parsed.hostname;
  try {
    dnsBase.setServers(["1.1.1.1", "8.8.8.8"]);
  } catch (_) {}
  const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${host}`);
  const hostList = srvRecords.map((record) => `${record.name}:${record.port}`).join(",");

  const authPart = parsed.username
    ? `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}@`
    : "";

  return `mongodb://${authPart}${hostList}${parsed.pathname}${parsed.search}`;
};

module.exports = connectDB;