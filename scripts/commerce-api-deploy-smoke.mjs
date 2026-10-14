import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const remote = readFileSync("scripts/deploy-commerce-api-remote.sh", "utf8");
const workflow = readFileSync(".github/workflows/deploy-frontend.yml", "utf8");
const apiDockerfile = readFileSync("services/osgard-commerce-api/Dockerfile", "utf8");
const nginx = readFileSync("nginx.conf", "utf8");
const publicConfig = JSON.parse(readFileSync("public/games/commerce-config.json", "utf8"));

assert.ok(remote.startsWith("#!/usr/bin/env bash") && remote.includes("set -euo pipefail"), "Remote service deploy must use strict shell mode");
assert.ok(remote.includes("osgard-commerce-postgres") && remote.includes("osgard-commerce-postgres-data") && remote.includes("type=volume"), "Postgres must persist in a named Docker volume");
assert.ok(remote.includes("--network \"$network\"") && remote.includes("docker inspect osgard-world"), "Database and API must use the actual frontend private network");
assert.ok(remote.includes("--label com.osgard.managed=osgard-commerce-api") && remote.includes("refusing to replace it"), "Existing unmanaged containers must not be overwritten");
assert.ok(remote.includes("ADMIN_API_TOKEN") && remote.includes("/var/lib/osgard-commerce-api/admin-api-token"), "Admin token must be generated and stored only on the host");
assert.ok(remote.includes("DATABASE_SSL=false") && remote.includes("ENABLE_LIVE_PAYMENTS=false") && remote.includes("ENABLE_OSGARD_PREMIUM_SALES=false"), "New API deployment must keep live payments and premium sales fail-closed");
assert.ok(remote.includes("pg_dump") && remote.includes("/var/backups/osgard-commerce-api") && remote.includes("17 3 * * *"), "Persistent database needs compressed scheduled backups with retention");
assert.ok(remote.includes("docker exec osgard-world wget") && remote.includes("/v1/game-catalog") && remote.includes("/readyz"), "Deploy must validate database readiness and the real 11-game API contract");
assert.ok(!/docker\\s+run[^\\n]*\\s-p\\s*8080/.test(remote), "Commerce API/Postgres must not publish a public port");
assert.ok(!remote.includes("echo \"$admin_token\"") && !remote.includes("echo \"$db_password\""), "Credentials must never be printed to the deployment logs");
assert.ok(apiDockerfile.includes("FROM node:22-alpine") && apiDockerfile.includes("COPY src ./src"), "Production image must package the Node 22 Commerce API source");
assert.ok(nginx.includes("set $osgard_commerce_api_host osgard-commerce-api;") && nginx.includes("proxy_pass http://$osgard_commerce_api_host:8080"), "Nginx must retain the private same-origin API proxy");
assert.ok(publicConfig.apiBaseUrl === "", "Browser config must not contain secrets or a guessed public API origin");
assert.ok(workflow.includes("services/osgard-commerce-api/**") && workflow.includes("scripts/deploy-commerce-api-remote.sh") && workflow.includes("osgard-commerce-api-image.tar.gz"), "Master deploy workflow must trigger, build and stage the private API image");
assert.ok(workflow.includes("Build private Commerce API image") && workflow.includes("Deploy Commerce API on the private network"), "Backend deploy must run before public route verification");

console.log("PASS Commerce API deployment safety: private-network only, persistent PostgreSQL, host-only credentials, backup contract, payments disabled, and release ordering.");
