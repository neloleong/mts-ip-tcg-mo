#!/usr/bin/env node
"use strict";

// Local-only image import. This script never downloads, deletes source files,
// edits environment files, or invokes Git/npm.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const IMAGE_FOLDERS = ["card", "vgcards", "zpacks"];
const IGNORE_RULES = "*\n!.gitignore\n";
const REPO_ROOT = fs.realpathSync(path.resolve(__dirname, ".."));
const TARGET_RELATIVE = ["public", "vanguard-images"];

function usage() {
  console.log(String.raw`用法：
  node scripts/importVanguardImages.cjs "C:\...\VGCard_Offline_Archive"
  node scripts/importVanguardImages.cjs "C:\...\解壓位置" --dry-run
  node scripts/importVanguardImages.cjs "C:\...\VGCard_Offline_Archive" --overwrite

接受 VGCard_Offline_Archive 本身，或直接包含該資料夾的上一層。
只匯入 assets/vg-assets.yimieji.com/data 下的 card、vgcards、zpacks 圖片。
三個圖片目錄可只存在部分；一個都沒有時會停止。

選項：
  --dry-run    只預覽數量及衝突，不建立資料夾、不複製或修改檔案。
  --overwrite  明確覆蓋大小不同的既有圖片；同大小檔案仍跳過。
  --help       顯示本說明。

來源檔案永遠保留。符號連結與 Windows junction 不會被跟隨。`);
}

function parseArgs(argv) {
  const result = { source: null, dryRun: false, overwrite: false, help: false };
  for (const arg of argv) {
    if (arg === "--dry-run") result.dryRun = true;
    else if (arg === "--overwrite") result.overwrite = true;
    else if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg.startsWith("--")) throw new Error(`未知選項：${arg}`);
    else if (result.source !== null) throw new Error("只能指定一個來源資料夾；包含空格的路徑請使用雙引號。");
    else result.source = arg;
  }
  if (!result.help && !result.source) throw new Error("請指定已解壓的備份資料夾。使用 --help 查看範例。");
  return result;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function samePath(a, b) {
  return path.relative(a, b) === "" && path.relative(b, a) === "";
}

function lstatIfPresent(filename) {
  try {
    return fs.lstatSync(filename);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function assertSafeSegment(segment) {
  if (!segment || segment === "." || segment === ".." || /[\\/\0<>:"|?*]/.test(segment)) {
    throw new Error(`不安全或不支援的路徑名稱：${JSON.stringify(segment)}`);
  }
}

function assertNotLink(filename, stat) {
  if (stat.isSymbolicLink()) {
    throw new Error(`拒絕符號連結或 junction：${filename}`);
  }
}

function existingDirectory(filename, boundary) {
  const stat = lstatIfPresent(filename);
  if (!stat) return null;
  assertNotLink(filename, stat);
  if (!stat.isDirectory()) throw new Error(`這個路徑不是資料夾：${filename}`);
  const real = fs.realpathSync(filename);
  if (boundary && !isWithin(boundary, real)) throw new Error(`資料夾超出允許範圍：${filename}`);
  return real;
}

// Inspect each existing directory in a chain. Missing directories are only
// returned as planned paths; creating them is a separate explicit operation.
function inspectDirectoryChain(root, segments, allowMissing) {
  let current = root;
  let missing = false;
  for (const segment of segments) {
    assertSafeSegment(segment);
    current = path.join(current, segment);
    if (missing) continue;
    const real = existingDirectory(current, root);
    if (!real) {
      if (!allowMissing) return null;
      missing = true;
    } else {
      current = real;
    }
  }
  if (!isWithin(root, current)) throw new Error(`路徑超出允許範圍：${current}`);
  return current;
}

function findSource(sourceArg, targetRoot) {
  const inputPath = path.resolve(sourceArg);
  const inputRoot = existingDirectory(inputPath);
  if (!inputRoot) throw new Error(`找不到來源資料夾：${inputPath}`);
  if (samePath(inputRoot, targetRoot)) throw new Error("來源資料夾與目標資料夾不能相同。");

  const candidates = [inputRoot];
  const childPath = path.join(inputRoot, "VGCard_Offline_Archive");
  const child = existingDirectory(childPath, inputRoot);
  if (child) candidates.push(child);

  for (const archiveRoot of candidates) {
    const dataRoot = inspectDirectoryChain(archiveRoot, ["assets", "vg-assets.yimieji.com", "data"], false);
    if (!dataRoot) continue;
    if (samePath(dataRoot, targetRoot) || isWithin(dataRoot, targetRoot) || isWithin(targetRoot, dataRoot)) {
      throw new Error("來源圖片目錄與目標目錄相同或互相包含，不能匯入。");
    }
    const folders = [];
    const missingFolders = [];
    for (const name of IMAGE_FOLDERS) {
      const folder = existingDirectory(path.join(dataRoot, name), dataRoot);
      if (folder) folders.push({ name, folder });
      else missingFolders.push(name);
    }
    if (folders.length) return { archiveRoot, dataRoot, folders, missingFolders };
  }
  throw new Error("找不到可匯入的圖片目錄。請選 VGCard_Offline_Archive 或其上一層，並先解壓至少一個圖片分包；預期 assets/vg-assets.yimieji.com/data/card、vgcards 或 zpacks。");
}

function collectImages(source) {
  const files = [];
  let ignored = 0;
  function walk(directory, relativeParts) {
    const directoryStat = fs.lstatSync(directory);
    assertNotLink(directory, directoryStat);
    if (!directoryStat.isDirectory() || !isWithin(source.dataRoot, fs.realpathSync(directory))) {
      throw new Error(`來源目錄超出範圍或已被更改：${directory}`);
    }
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      assertSafeSegment(entry.name);
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`拒絕來源符號連結或 junction：${filename}`);
      if (entry.isDirectory()) {
        walk(filename, [...relativeParts, entry.name]);
        continue;
      }
      if (!IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        ignored += 1;
        continue;
      }
      const stat = fs.lstatSync(filename);
      assertNotLink(filename, stat);
      if (!stat.isFile()) throw new Error(`來源不是一般圖片檔案：${filename}`);
      const real = fs.realpathSync(filename);
      if (!isWithin(source.dataRoot, real)) throw new Error(`來源圖片超出允許範圍：${filename}`);
      files.push({ source: real, relativeParts: [...relativeParts, entry.name], size: stat.size });
    }
  }
  for (const item of source.folders) walk(item.folder, [item.name]);
  return { files, ignored };
}

function inspectDestination(targetRoot, relativeParts) {
  for (const part of relativeParts) assertSafeSegment(part);
  const parent = inspectDirectoryChain(targetRoot, relativeParts.slice(0, -1), true);
  const destination = path.join(parent, relativeParts[relativeParts.length - 1]);
  if (!isWithin(targetRoot, destination)) throw new Error(`目標圖片超出允許範圍：${destination}`);
  const stat = lstatIfPresent(destination);
  if (stat) {
    assertNotLink(destination, stat);
    if (!stat.isFile()) throw new Error(`目標不是一般檔案：${destination}`);
    if (!isWithin(targetRoot, fs.realpathSync(destination))) throw new Error(`目標圖片超出允許範圍：${destination}`);
  }
  return { destination, stat };
}

function inspectIgnore(targetRoot) {
  const filename = path.join(targetRoot, ".gitignore");
  const stat = lstatIfPresent(filename);
  if (stat) {
    assertNotLink(filename, stat);
    if (!stat.isFile() || !isWithin(targetRoot, fs.realpathSync(filename))) {
      throw new Error(`目標 .gitignore 路徑不安全：${filename}`);
    }
  }
  return filename;
}

function createSafeDirectories(root, segments) {
  if (!existingDirectory(root, root)) throw new Error(`目標根目錄已不存在：${root}`);
  let current = root;
  for (const segment of segments) {
    assertSafeSegment(segment);
    if (!existingDirectory(current, root)) throw new Error(`目標父目錄已被更改：${current}`);
    current = path.join(current, segment);
    const stat = lstatIfPresent(current);
    if (!stat) fs.mkdirSync(current);
    const real = existingDirectory(current, root);
    if (!real) throw new Error(`無法建立目標資料夾：${current}`);
    current = real;
  }
  return current;
}

function temporaryPath(parent) {
  return path.join(parent, `.vanguard-import-${process.pid}-${crypto.randomBytes(8).toString("hex")}.tmp`);
}

function writeIgnoreRules(targetRoot) {
  if (!existingDirectory(targetRoot, targetRoot)) throw new Error("目標根目錄已被更改。");
  const filename = inspectIgnore(targetRoot);
  const old = fs.existsSync(filename) ? fs.readFileSync(filename) : Buffer.alloc(0);
  const lines = old.toString("utf8").replace(/\r\n/g, "\n").trimEnd().split("\n");
  if (lines.length >= 2 && lines[lines.length - 2] === "*" && lines[lines.length - 1] === "!.gitignore") return;
  const separator = old.length && old[old.length - 1] !== 10 ? Buffer.from("\n") : Buffer.alloc(0);
  const content = Buffer.concat([old, separator, Buffer.from(IGNORE_RULES)]);
  const temporary = temporaryPath(targetRoot);
  try {
    fs.writeFileSync(temporary, content, { flag: "wx" });
    inspectIgnore(targetRoot);
    if (!isWithin(targetRoot, fs.realpathSync(path.dirname(temporary)))) throw new Error("目標資料夾在寫入期間被更改。");
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function copyImage(file, sourceRoot, targetRoot, overwrite) {
  // Repeat the checks immediately before use, rather than relying solely on
  // the earlier preflight (a folder may have changed while the import runs).
  const sourceStat = fs.lstatSync(file.source);
  assertNotLink(file.source, sourceStat);
  if (!sourceStat.isFile() || !isWithin(sourceRoot, fs.realpathSync(file.source))) throw new Error(`來源圖片已被更改：${file.source}`);
  if (sourceStat.size !== file.size) throw new Error(`來源圖片大小在匯入期間改變，請稍後重跑：${file.source}`);
  createSafeDirectories(targetRoot, file.relativeParts.slice(0, -1));
  const current = inspectDestination(targetRoot, file.relativeParts);
  if (current.stat?.size === file.size) return { status: "skipped" };
  if (current.stat && !overwrite) return { status: "conflict", targetSize: current.stat.size };
  const temporary = temporaryPath(path.dirname(current.destination));
  try {
    fs.copyFileSync(file.source, temporary, fs.constants.COPYFILE_EXCL);
    if (fs.statSync(temporary).size !== file.size) throw new Error(`複製後大小不符：${file.relativeParts.join("/")}`);
    const latest = inspectDestination(targetRoot, file.relativeParts);
    if (latest.stat?.size === file.size) return { status: "skipped" };
    if (latest.stat && !overwrite) return { status: "conflict", targetSize: latest.stat.size };
    fs.renameSync(temporary, latest.destination);
    return { status: latest.stat ? "overwritten" : "copied" };
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function printConflict(file, targetSize) {
  console.log(`  衝突並保留：${file.relativeParts.join("/")}（來源 ${file.size} bytes；目標 ${targetSize} bytes）`);
}

function printSummary(stats, dryRun) {
  console.log(`\n${dryRun ? "預覽結果（沒有建立或修改檔案）" : "匯入結果"}：`);
  console.log(`  圖片總數：${stats.total}`);
  console.log(`  ${dryRun ? "預計新增" : "新增複製"}：${stats.copied}`);
  console.log(`  ${dryRun ? "預計覆蓋" : "明確覆蓋"}：${stats.overwritten}`);
  console.log(`  同大小跳過：${stats.skipped}`);
  console.log(`  保留衝突：${stats.conflicts}`);
  console.log(`  忽略非圖片檔：${stats.ignored}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { usage(); return; }
  const targetRoot = inspectDirectoryChain(REPO_ROOT, TARGET_RELATIVE, true);
  const source = findSource(options.source, targetRoot);
  const collected = collectImages(source);
  inspectIgnore(targetRoot);
  const stats = { total: collected.files.length, copied: 0, overwritten: 0, skipped: 0, conflicts: 0, ignored: collected.ignored };
  const plans = collected.files.map((file) => {
    const target = inspectDestination(targetRoot, file.relativeParts);
    let action = "copied";
    if (target.stat?.size === file.size) action = "skipped";
    else if (target.stat) action = options.overwrite ? "overwritten" : "conflict";
    return { file, action, targetSize: target.stat?.size };
  });
  console.log(`來源：${source.archiveRoot}`);
  console.log(`目標：${targetRoot}`);
  if (source.missingFolders.length) console.log(`提示：未找到 ${source.missingFolders.join("、")}，只匯入已解壓的圖片目錄。`);
  console.log(`找到 ${stats.total} 張支援的圖片。`);
  if (!stats.total) {
    printSummary(stats, options.dryRun);
    console.log("提示：圖片目錄目前為空，或沒有支援的圖片；沒有建立或修改檔案。請解壓圖片分包後重跑。");
    return;
  }

  if (options.dryRun) {
    for (const plan of plans) {
      if (plan.action === "conflict") { stats.conflicts += 1; printConflict(plan.file, plan.targetSize); }
      else stats[plan.action] += 1;
    }
    printSummary(stats, true);
    console.log("正式匯入時會在 public/vanguard-images/.gitignore 補齊本地圖片忽略規則。");
    return;
  }

  const createdTarget = createSafeDirectories(REPO_ROOT, TARGET_RELATIVE);
  if (!samePath(createdTarget, targetRoot)) throw new Error("目標資料夾在預檢後改變，已停止。");
  writeIgnoreRules(targetRoot);
  let processed = 0;
  for (const plan of plans) {
    const result = copyImage(plan.file, source.dataRoot, targetRoot, options.overwrite);
    if (result.status === "conflict") { stats.conflicts += 1; printConflict(plan.file, result.targetSize); }
    else stats[result.status] += 1;
    processed += 1;
    if (processed % 500 === 0 || processed === stats.total) {
      console.log(`[${processed}/${stats.total}] 已複製 ${stats.copied + stats.overwritten}，跳過 ${stats.skipped}，衝突 ${stats.conflicts}。`);
    }
  }
  printSummary(stats, false);
  if (stats.conflicts) console.log("大小不同的既有圖片已保留；確認後可加 --overwrite 重跑。");
  console.log("\n下一步：在你自己的 .env.local 加入以下設定，再重新啟動 npm run dev：");
  console.log("VITE_VANGUARD_ASSET_BASE_URL=/vanguard-images/");
  console.log("本工具沒有修改 .env/.env.local，也沒有執行 Git 或 npm。");
}

try {
  main();
} catch (error) {
  console.error(`匯入已停止：${error.message}`);
  process.exitCode = 1;
}
