import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../public/data', import.meta.url));
const LATEST_FILE = path.join(DATA_DIR, 'latest.json');

export function processExtensionVersion(extensionName, version, dataDir = DATA_DIR) {
  const REPORTS_DIR = path.join(dataDir, 'reports');
  const reportPath = path.join(REPORTS_DIR, extensionName, version + '.json');
  if (!fs.existsSync(reportPath)) return false;

  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const historyFile = { extension: extensionName, version, snapshots: [] };
  const builds = reportData.builds;

  if (!builds) return false;

  for (const year of Object.keys(builds).sort()) {
    for (const month of Object.keys(builds[year]).sort()) {
      for (const day of Object.keys(builds[year][month]).sort()) {
        const historyPath = path.join(dataDir, builds[year][month][day]);
        const allBuilds = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        const extensionBuilds = allBuilds.filter(b => b.extension === extensionName && b.extension_version === version);
        
        if (extensionBuilds.length === 0) continue;
        
        const snapshot = {
          id: extensionBuilds[0].workflow_run_id.toString(),
          date: extensionBuilds[0].started_at || year + '-' + month + '-' + day,
          trigger: 'Scheduled build',
          php_versions: {},
          platforms: {}
        };
        
        const byPhp = new Map();
        extensionBuilds.forEach(build => {
          if (!byPhp.has(build.php_version)) byPhp.set(build.php_version, []);
          byPhp.get(build.php_version).push(build);
        });
        
        byPhp.forEach((phpBuilds, phpVersion) => {
          const pass = phpBuilds.filter(b => b.status === 'success').length;
          const total = phpBuilds.length;
          snapshot.php_versions[phpVersion] = {
            pass, fail: total - pass, total,
            success_rate: Math.round((pass / total) * 100)
          };
          
          const platformMap = new Map();
          phpBuilds.forEach(build => {
            const key = build.platform + '-' + build.platform_version;
            if (!platformMap.has(key)) platformMap.set(key, {});
            platformMap.get(key)[build.arch] = build.status;
          });
          
          snapshot.platforms[phpVersion] = [];
          platformMap.forEach((archs, key) => {
            const parts = key.split('-');
            snapshot.platforms[phpVersion].push({
              platform: parts[0],
              version: parts.slice(1).join('-'),
              architectures: archs
            });
          });
        });
        
        historyFile.snapshots.push(snapshot);
      }
    }
  }

  historyFile.snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
  const outputPath = path.join(REPORTS_DIR, extensionName, version + '-history.json');
  fs.writeFileSync(outputPath, JSON.stringify(historyFile, null, 2));
  console.log('Generated:', outputPath, '(' + historyFile.snapshots.length + ' snapshots)');
  return true;
}

function processAll() {
  if (!fs.existsSync(LATEST_FILE)) {
    console.error('Error: latest.json not found at', LATEST_FILE);
    process.exit(1);
  }

  const latest = JSON.parse(fs.readFileSync(LATEST_FILE, 'utf8'));
  const extensions = Object.entries(latest);
  let processed = 0, skipped = 0;

  for (const [name, data] of extensions) {
    if (name === '_meta') continue;
    if (processExtensionVersion(name, data.version)) {
      processed++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone: ${processed} generated, ${skipped} skipped`);
  if (skipped > 0) throw new Error(`${skipped} extension report indexes are missing or invalid`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const args = process.argv.slice(2);
if (args[0] === '--all') {
  processAll();
} else if (args.length === 2) {
  if (!processExtensionVersion(args[0], args[1])) throw new Error('Extension report index is missing or invalid');
} else {
  console.log('Usage:');
  console.log('  bun scripts/generate-history.js <extension> <version>');
  console.log('  bun scripts/generate-history.js --all');
}
}
