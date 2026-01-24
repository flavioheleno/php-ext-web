const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '../public/data/reports');
const DATA_DIR = path.join(__dirname, '../public/data');
const LATEST_FILE = path.join(DATA_DIR, 'latest.json');

function processExtensionVersion(extensionName, version) {
  const reportPath = path.join(REPORTS_DIR, extensionName, version + '.json');
  if (!fs.existsSync(reportPath)) return false;

  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const historyFile = { extension: extensionName, version, snapshots: [] };
  const builds = reportData.builds;

  if (!builds) return false;

  for (const year of Object.keys(builds).sort()) {
    for (const month of Object.keys(builds[year]).sort()) {
      for (const day of Object.keys(builds[year][month]).sort()) {
        const historyPath = path.join(DATA_DIR, builds[year][month][day]);
        const allBuilds = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        const extensionBuilds = allBuilds.filter(b => b.extension === extensionName);
        
        if (extensionBuilds.length === 0) continue;
        
        const snapshot = {
          id: extensionBuilds[0].workflow_run_id.toString(),
          date: year + '-' + month + '-' + day,
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
            const arch = (build.arch === 'amd64' || build.arch === 'x86_64') ? 'x86_64' : 'aarch64';
            platformMap.get(key)[arch] = build.status;
          });
          
          snapshot.platforms[phpVersion] = [];
          platformMap.forEach((archs, key) => {
            const parts = key.split('-');
            snapshot.platforms[phpVersion].push({
              platform: parts[0],
              version: parts.slice(1).join('-'),
              x86_64: archs.x86_64 || 'failure',
              aarch64: archs.aarch64 || 'failure'
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
    if (processExtensionVersion(name, data.version)) {
      processed++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone: ${processed} generated, ${skipped} skipped`);
}

const args = process.argv.slice(2);
if (args[0] === '--all') {
  processAll();
} else if (args.length === 2) {
  processExtensionVersion(args[0], args[1]);
} else {
  console.log('Usage:');
  console.log('  bun scripts/generate-history.js <extension> <version>');
  console.log('  bun scripts/generate-history.js --all');
}
