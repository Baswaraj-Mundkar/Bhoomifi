import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'bhoomifi';
const FARM_ID = 'bhoomifi-farm-01';
const DEVICE_ID = 'BHOOMIFI-ESP32-NODE-01';

function parseArguments(argv) {
  const options = {
    apply: false,
    confirmedProject: null,
    deviceUid: null,
    farmName: null,
    ownerUid: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') {
      options.apply = true;
    } else if (
      argument === '--owner-uid'
      || argument === '--device-uid'
      || argument === '--farm-name'
      || argument === '--confirm'
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;
      if (argument === '--owner-uid') options.ownerUid = value.trim();
      if (argument === '--device-uid') options.deviceUid = value.trim();
      if (argument === '--farm-name') options.farmName = value.trim();
      if (argument === '--confirm') options.confirmedProject = value.trim();
    } else if (argument === '--help') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function printUsage() {
  console.log(`Provision BhoomiFi's farm and device Firestore documents using ADC.

Usage:
  node scripts/provision-firebase.mjs --owner-uid UID --device-uid UID --farm-name NAME

Writes are disabled by default. To apply the displayed, validated plan:
  node scripts/provision-firebase.mjs --owner-uid UID --device-uid UID --farm-name NAME --apply --confirm bhoomifi`);
}

function validateOptions(options) {
  for (const key of ['ownerUid', 'deviceUid', 'farmName']) {
    if (typeof options[key] !== 'string' || options[key].length === 0) {
      throw new Error(`A non-empty --${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`);
    }
  }
  if (options.ownerUid === options.deviceUid) {
    throw new Error('The owner UID and ESP32 device UID must belong to separate Firebase Auth accounts.');
  }
  if (options.apply !== (options.confirmedProject !== null)) {
    throw new Error('Writing requires both --apply and --confirm bhoomifi; omit both for a dry run.');
  }
  if (options.confirmedProject !== null && options.confirmedProject !== PROJECT_ID) {
    throw new Error(`Confirmation must match the target project "${PROJECT_ID}".`);
  }
}

function validateExistingFarm(farm, ownerUid) {
  if (farm.ownerUid !== ownerUid) {
    throw new Error('Existing farm has a different ownerUid; refusing to change ownership.');
  }
  if (typeof farm.name !== 'string' || farm.name.trim() === '') {
    throw new Error('Existing farm has no valid name; refusing to overwrite it.');
  }
  if (!Array.isArray(farm.deviceIds) || farm.deviceIds.some((id) => typeof id !== 'string')) {
    throw new Error('Existing farm deviceIds is missing or invalid; refusing to overwrite it.');
  }
}

function validateExistingDevice(device, options) {
  if (
    device.farmId !== FARM_ID
    || device.ownerUid !== options.ownerUid
    || device.deviceUid !== options.deviceUid
  ) {
    throw new Error('Existing device ownership links conflict; refusing to change them.');
  }
  if (
    typeof device.deviceName !== 'string'
    || (device.deviceStatus !== 'ONLINE' && device.deviceStatus !== 'OFFLINE')
    || !Object.hasOwn(device, 'lastSeen')
    || (device.lastSeen !== null && typeof device.lastSeen?.toDate !== 'function')
    || typeof device.firmwareVersion !== 'string'
    || typeof device.wifiStatus !== 'string'
  ) {
    throw new Error('Existing device is incomplete or has invalid field types; refusing to overwrite it.');
  }
}

function describePlan(plan) {
  if (plan.length === 0) {
    console.log('No changes are needed; the farm/device documents and relationship are already provisioned.');
    return;
  }
  for (const item of plan) {
    console.log(`- ${item}`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }
  validateOptions(options);

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID
  });
  const db = getFirestore(app);
  const farmRef = db.collection('farms').doc(FARM_ID);
  const deviceRef = db.collection('devices').doc(DEVICE_ID);

  const result = await db.runTransaction(async (transaction) => {
    const [farmSnapshot, deviceSnapshot] = await transaction.getAll(farmRef, deviceRef);
    const plan = [];
    let farmNeedsDeviceLink = false;

    if (farmSnapshot.exists) {
      const farm = farmSnapshot.data();
      validateExistingFarm(farm, options.ownerUid);
      farmNeedsDeviceLink = !farm.deviceIds.includes(DEVICE_ID);
      if (farmNeedsDeviceLink) {
        plan.push(`Add ${DEVICE_ID} to farms/${FARM_ID}.deviceIds (preserving existing IDs).`);
      }
    } else {
      plan.push(`Create farms/${FARM_ID} with the supplied name/owner and deviceIds [${DEVICE_ID}].`);
    }

    if (deviceSnapshot.exists) {
      validateExistingDevice(deviceSnapshot.data(), options);
      plan.push(`Keep existing devices/${DEVICE_ID}; ownership and required fields match.`);
    } else {
      plan.push(`Create devices/${DEVICE_ID} with the verified farm/owner/device links and initial offline state.`);
    }

    if (options.apply) {
      if (!farmSnapshot.exists) {
        transaction.create(farmRef, {
          name: options.farmName,
          ownerUid: options.ownerUid,
          deviceIds: [DEVICE_ID]
        });
      } else if (farmNeedsDeviceLink) {
        transaction.update(farmRef, {
          deviceIds: FieldValue.arrayUnion(DEVICE_ID)
        });
      }

      if (!deviceSnapshot.exists) {
        transaction.create(deviceRef, {
          deviceName: 'BhoomiFi ESP32 Node 01',
          deviceStatus: 'OFFLINE',
          lastSeen: null,
          firmwareVersion: 'Not connected',
          wifiStatus: 'Not connected',
          farmId: FARM_ID,
          ownerUid: options.ownerUid,
          deviceUid: options.deviceUid
        });
      }
    }
    return plan;
  });

  console.log(`Firebase project: ${PROJECT_ID}`);
  console.log(`Farm document: farms/${FARM_ID}`);
  console.log(`Device document: devices/${DEVICE_ID}`);
  describePlan(result);
  if (options.apply) {
    console.log('Provisioning completed. No Auth users, rules, indexes, or other documents were changed.');
  } else {
    console.log('Dry run only: no Firestore documents were written. Add --apply --confirm bhoomifi to apply.');
  }
}

main().catch((error) => {
  console.error(`Provisioning stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
