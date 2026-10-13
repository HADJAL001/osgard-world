import { resolveIosBuildNumber, resolveIosMarketingVersion } from "./ios-release-version.mjs";

const version = resolveIosMarketingVersion(process.env);
const buildNumber = resolveIosBuildNumber(process.env);
const tag = String(process.env.CM_TAG || "").trim() || "(manual Codemagic build)";
console.log("OSGARD PLAY release preflight: " + tag);
console.log("Marketing version: " + version);
console.log("Build number: " + buildNumber);
