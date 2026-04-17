import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const packageJsonPath = resolve(workspaceRoot, "package.json");
const packageLockPath = resolve(workspaceRoot, "package-lock.json");
const versionModulePath = resolve(workspaceRoot, "version.ts");
const shouldIncrement = process.argv.includes("--increment") && !process.env.CI;

function parseVersion(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

	if (!match) {
		throw new Error(`Unsupported version format: ${version}`);
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3])
	};
}

function formatVersion({ major, minor, patch }) {
	return `${major}.${minor}.${patch}`;
}

function updateRootVersions(nextVersion) {
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

	packageJson.version = nextVersion;
	writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

	const packageLock = JSON.parse(readFileSync(packageLockPath, "utf8"));
	packageLock.version = nextVersion;

	if (packageLock.packages?.[""]) {
		packageLock.packages[""].version = nextVersion;
	}

	writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`, "utf8");
}

const currentPackageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const nextVersion = shouldIncrement
	? formatVersion({
		...parseVersion(currentPackageJson.version),
		patch: parseVersion(currentPackageJson.version).patch + 1
	})
	: currentPackageJson.version;

if (nextVersion !== currentPackageJson.version) {
	updateRootVersions(nextVersion);
}

const nextContents = `export const APP_VERSION = ${JSON.stringify(nextVersion)};\n`;
writeFileSync(versionModulePath, nextContents, "utf8");