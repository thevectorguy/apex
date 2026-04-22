import { MongoClient } from 'mongodb';
import './networkTls.js';
import { getContentSeeds } from './contentSeeds.js';
import { getLeadSeeds } from './leadSeeds.js';
import { MASTER_COPY_HASH, MASTER_COPY_VERSION, masterCopySnapshot } from './masterCopy.js';
import { getMongoConfig, isMongoConfigured } from './myCoachConfig.js';

const COLLECTIONS = {
  customers: 'myCoachCustomers',
  sessions: 'myCoachSessions',
  reports: 'myCoachReports',
  audioAssets: 'myCoachAudioAssets',
  masterCopySnapshots: 'masterCopySnapshots',
  leads: 'leads',
  vehicles: 'vehicles',
  brochures: 'brochures',
  announcements: 'announcements',
};

let clientPromise = null;
let databasePromise = null;
let setupPromise = null;

export function getAppCollectionNames() {
  return { ...COLLECTIONS };
}

export function getMyCoachCollectionNames() {
  return getAppCollectionNames();
}

export async function getMongoDb() {
  if (!isMongoConfigured()) {
    throw new Error('MongoDB is not configured. Set MONGODB_URI and MONGODB_DB_NAME for the My Coach backend.');
  }

  if (!databasePromise) {
    databasePromise = (async () => {
      const client = await getMongoClient();
      return client.db(getMongoConfig().dbName);
    })();
  }

  return databasePromise;
}

export async function ensureMongoReady() {
  const db = await getMongoDb();
  if (!setupPromise) {
    setupPromise = setupMongoCollections(db);
  }
  await setupPromise;
  return db;
}

export async function getMongoHealth() {
  const config = getMongoConfig();
  if (!isMongoConfigured()) {
    return {
      configured: false,
      connected: false,
      dbName: config.dbName || null,
    };
  }

  try {
    const db = await ensureMongoReady();
    await db.command({ ping: 1 });
    return {
      configured: true,
      connected: true,
      dbName: config.dbName,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      dbName: config.dbName,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function closeMongoConnection() {
  if (!clientPromise) {
    databasePromise = null;
    setupPromise = null;
    return;
  }

  const pendingClient = clientPromise;
  clientPromise = null;
  databasePromise = null;
  setupPromise = null;

  try {
    const client = await pendingClient;
    await client.close();
  } catch {
    // Ignore connection shutdown issues during local scripts and tests.
  }
}

async function getMongoClient() {
  if (!clientPromise) {
    const config = getMongoConfig();
    const client = new MongoClient(config.uri, {
      maxPoolSize: 10,
    });
    clientPromise = client.connect();
  }

  return clientPromise;
}

async function setupMongoCollections(db) {
  const seedData = getContentSeeds();
  const leadSeedData = getLeadSeeds();
  const customers = db.collection(COLLECTIONS.customers);
  const sessions = db.collection(COLLECTIONS.sessions);
  const reports = db.collection(COLLECTIONS.reports);
  const audioAssets = db.collection(COLLECTIONS.audioAssets);
  const masterCopySnapshots = db.collection(COLLECTIONS.masterCopySnapshots);
  const leads = db.collection(COLLECTIONS.leads);
  const vehicles = db.collection(COLLECTIONS.vehicles);
  const brochures = db.collection(COLLECTIONS.brochures);
  const announcements = db.collection(COLLECTIONS.announcements);

  await Promise.all([
    customers.createIndex({ id: 1 }, { unique: true }),
    customers.createIndex({ updatedAt: -1 }),
    sessions.createIndex({ id: 1 }, { unique: true }),
    sessions.createIndex({ customerId: 1, createdAt: -1 }),
    sessions.createIndex({ status: 1, createdAt: -1 }),
    sessions.createIndex({ reportId: 1 }),
    reports.createIndex({ id: 1 }, { unique: true }),
    reports.createIndex({ customerId: 1, createdAt: -1 }),
    reports.createIndex({ sessionId: 1 }),
    audioAssets.createIndex({ id: 1 }, { unique: true }),
    audioAssets.createIndex({ customerId: 1, createdAt: -1 }),
    audioAssets.createIndex({ sessionId: 1, createdAt: 1 }),
    masterCopySnapshots.createIndex({ version: 1, hash: 1 }, { unique: true }),
    leads.createIndex({ id: 1 }, { unique: true }),
    leads.createIndex({ updatedAt: -1 }),
    leads.createIndex({ status: 1, priority: 1, updatedAt: -1 }),
    leads.createIndex({ email: 1 }),
    leads.createIndex({ phone: 1 }),
    leads.createIndex({ vehicleId: 1, updatedAt: -1 }),
    vehicles.createIndex({ id: 1 }, { unique: true }),
    vehicles.createIndex({ network: 1, bodyStyle: 1 }),
    vehicles.createIndex({ inventoryStatus: 1 }),
    brochures.createIndex({ id: 1 }, { unique: true }),
    brochures.createIndex({ vehicleId: 1 }),
    brochures.createIndex({ theme: 1 }),
    announcements.createIndex({ id: 1 }, { unique: true }),
    announcements.createIndex({ segments: 1 }),
    announcements.createIndex({ publishedAt: 1 }),
  ]);

  await masterCopySnapshots.updateOne(
    { version: MASTER_COPY_VERSION, hash: MASTER_COPY_HASH },
    {
      $setOnInsert: {
        ...masterCopySnapshot(),
        hash: MASTER_COPY_HASH,
      },
    },
    { upsert: true },
  );

  await Promise.all([
    syncSeedCollection(vehicles, seedData.vehicles),
    syncSeedCollection(brochures, seedData.brochures),
    syncSeedCollection(announcements, seedData.announcements),
    syncSeedCollection(leads, leadSeedData, { overwriteExisting: false, seedSource: 'leadSeeds' }),
  ]);
}

async function syncSeedCollection(collection, rows, options = {}) {
  const { overwriteExisting = true, seedSource = 'contentSeeds' } = options;
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  await Promise.all(
    rows.map((row, index) =>
      collection.updateOne(
        { id: row.id },
        overwriteExisting
          ? {
              $set: {
                ...row,
                seedOrder: index,
                seedSource,
                updatedAt: new Date().toISOString(),
              },
              $setOnInsert: {
                createdAt: new Date().toISOString(),
              },
            }
          : {
              $setOnInsert: {
                ...row,
                seedOrder: index,
                seedSource,
                createdAt: row.createdAt || new Date().toISOString(),
                updatedAt: row.updatedAt || new Date().toISOString(),
              },
            },
        { upsert: true },
      ),
    ),
  );
}
