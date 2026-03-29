// Simple Node script to test the timestamp-aware merge logic used in src/App.tsx
// It mocks Supabase responses (no network) and validates three scenarios:
// 1) local is newer -> keep local and attempt push
// 2) cloud is newer -> accept cloud and save locally
// 3) equal timestamps -> prefer local

function sanitizeDB(db) {
  if (!db) return db;
  const newDb = { ...db };
  if (newDb.users && Array.isArray(newDb.users)) {
    const uniqueUsers = new Map();
    newDb.users.forEach((u) => {
      if (u && u.phone) {
        const phone = String(u.phone).trim();
        uniqueUsers.set(phone, { ...u, phone });
      }
    });
    newDb.users = Array.from(uniqueUsers.values());
  }
  if (!newDb.resetRequests) newDb.resetRequests = [];
  if (!newDb.systemEvents) newDb.systemEvents = [];
  return newDb;
}

function saveLocalDB(db, store) {
  const sanitized = sanitizeDB(db);
  sanitized.updated_at = new Date(sanitized.updated_at || Date.now()).toISOString();
  // emulate persisting locally by writing into provided store object
  store.local = JSON.parse(JSON.stringify(sanitized));
}

async function syncToSupabaseMock(sanitizedDb, mockClient) {
  // emulate upsert by calling the mock client's upsert handler
  sanitizedDb.updated_at = sanitizedDb.updated_at || new Date().toISOString();
  const payload = { id: 1, content: sanitizedDb, updated_at: sanitizedDb.updated_at };
  return mockClient.upsert(payload);
}

async function loadFromSupabaseMock(localDb, mockClient, store) {
  // emulate fetching from supabase
  const res = await mockClient.select();
  const data = res.data;

  if (data && data.content) {
    const cloudDb = sanitizeDB(data.content);
    if (!cloudDb.geminiApiKey || cloudDb.geminiApiKey.includes('MY_GEMINI')) {
      cloudDb.geminiApiKey = 'DUMMY';
    }
    const cloudUpdated = data.updated_at ? Date.parse(String(data.updated_at)) : 0;
    const localUpdated = localDb?.updated_at ? Date.parse(String(localDb.updated_at)) : 0;

    if (cloudUpdated > localUpdated) {
      cloudDb.updated_at = data.updated_at || new Date().toISOString();
      saveLocalDB(cloudDb, store);
      return { chosen: 'cloud', db: cloudDb };
    } else if (localUpdated > cloudUpdated) {
      try {
        const localSanitized = sanitizeDB(localDb);
        localSanitized.updated_at = localSanitized.updated_at || new Date().toISOString();
        await syncToSupabaseMock(localSanitized, mockClient);
        return { chosen: 'local', db: localSanitized };
      } catch (e) {
        return { chosen: 'local', db: localDb };
      }
    } else {
      return { chosen: 'local', db: localDb };
    }
  }
  return { chosen: 'local', db: localDb };
}

function createMockClient(cloudPayload) {
  let lastUpsert = null;
  return {
    select: async () => ({ data: cloudPayload }),
    upsert: async (payload) => {
      lastUpsert = payload;
      // emulate success
      return { error: null };
    },
    _lastUpsert: () => lastUpsert,
  };
}

async function runScenario(name, localDb, cloudPayload) {
  const store = { local: JSON.parse(JSON.stringify(localDb)) };
  const client = createMockClient(cloudPayload);
  const result = await loadFromSupabaseMock(store.local, client, store);
  console.log(`\nScenario: ${name}`);
  console.log('Chosen source:', result.chosen);
  console.log('Local.updated_at:', store.local.updated_at);
  console.log('Cloud.updated_at:', cloudPayload.updated_at);
  if (result.chosen === 'local') {
    const up = client._lastUpsert();
    console.log('Upsert payload present?', !!up);
    if (up) {
      console.log('Upsert.updated_at:', up.updated_at);
    }
  }
}

async function main() {
  const base = {
    version: 6,
    users: [{ phone: '0101', password: 'old', name: 'Test' }],
  };

  // 1) local newer
  const now = Date.now();
  const localNewer = { ...base, updated_at: new Date(now).toISOString(), users: [{ phone: '0101', password: 'new', name: 'Test' }] };
  const cloudOlder = { content: { ...base, users: [{ phone: '0101', password: 'old', name: 'Test' }] }, updated_at: new Date(now - 60000).toISOString() };
  await runScenario('local is newer', localNewer, cloudOlder);

  // 2) cloud newer
  const localOlder = { ...base, updated_at: new Date(now - 60000).toISOString(), users: [{ phone: '0101', password: 'old', name: 'Test' }] };
  const cloudNewer = { content: { ...base, users: [{ phone: '0101', password: 'cloud-new', name: 'Test' }] }, updated_at: new Date(now + 60000).toISOString() };
  await runScenario('cloud is newer', localOlder, cloudNewer);

  // 3) equal timestamps
  const equalTs = new Date(now).toISOString();
  const localEqual = { ...base, updated_at: equalTs, users: [{ phone: '0101', password: 'equal-local', name: 'Test' }] };
  const cloudEqual = { content: { ...base, users: [{ phone: '0101', password: 'equal-cloud', name: 'Test' }] }, updated_at: equalTs };
  await runScenario('equal timestamps (prefer local)', localEqual, cloudEqual);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(2); });
