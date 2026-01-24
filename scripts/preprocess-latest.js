const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');
const LATEST_FILE = path.join(DATA_DIR, 'latest.json');

function preprocessLatest() {
  if (!fs.existsSync(LATEST_FILE)) {
    console.error('Error: latest.json not found');
    process.exit(1);
  }

  const latest = JSON.parse(fs.readFileSync(LATEST_FILE, 'utf8'));
  let updated = 0;
  let latestUpdatedAt = null;

  for (const [name, data] of Object.entries(latest)) {
    if (name === '_meta') continue;
    
    const successRate = data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0;
    if (data.success_rate !== successRate) {
      data.success_rate = successRate;
      updated++;
    }

    // Track most recent updated_at
    if (data.updated_at && (!latestUpdatedAt || data.updated_at > latestUpdatedAt)) {
      latestUpdatedAt = data.updated_at;
    }
  }

  // Add metadata
  latest._meta = {
    latest_updated_at: latestUpdatedAt,
    processed_at: new Date().toISOString(),
  };

  fs.writeFileSync(LATEST_FILE, JSON.stringify(latest, null, 2));
  console.log(`Preprocessed latest.json: ${updated} extensions updated, latest_updated_at: ${latestUpdatedAt}`);
}

preprocessLatest();
