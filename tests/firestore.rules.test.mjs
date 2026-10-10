
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";

import "firebase/compat/app";
import "firebase/compat/firestore";

import firebase from "firebase/compat/app";

const PROJECT_ID = "demo-bhoomifi";
const OWNER_UID = "test-owner";
const OTHER_UID = "other-owner";
const DEVICE_UID = "test-device";
const FARM_ID = "test-farm";
const DEVICE_ID = "test-device-01";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await env.clearFirestore();

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await db.doc(`farms/${FARM_ID}`).set({
      ownerUid: OWNER_UID,
      name: "Test Farm",
    });

    await db.doc(`devices/${DEVICE_ID}`).set({
      farmId: FARM_ID,
      deviceUid: DEVICE_UID,
    });
  });
});

after(async () => {
  await env?.cleanup();
});

function validReading(overrides = {}) {
  return {
    soilMoisture: 45,
    soilRawADC: 2200,
    temperature: 28,
    humidity: 60,
    light: 350,
    timestamp: firebase.firestore.Timestamp.now(),
    ...overrides,
  };
}

test("unauthenticated users cannot read a farm", async () => {
  const db = env.unauthenticatedContext().firestore();

  await assertFails(db.doc(`farms/${FARM_ID}`).get());
});

test("farm owner can read their own farm", async () => {
  const db = env.authenticatedContext(OWNER_UID).firestore();

  await assertSucceeds(db.doc(`farms/${FARM_ID}`).get());
});

test("another user cannot read the farm", async () => {
  const db = env.authenticatedContext(OTHER_UID).firestore();

  await assertFails(db.doc(`farms/${FARM_ID}`).get());
});

test("device identity can create a valid sensor reading", async () => {
  const db = env.authenticatedContext(DEVICE_UID).firestore();

  await assertSucceeds(
    db.doc(`devices/${DEVICE_ID}/readings/reading-1`).set(validReading())
  );
});

test("device identity cannot create an out-of-range reading", async () => {
  const db = env.authenticatedContext(DEVICE_UID).firestore();

  await assertFails(
    db
      .doc(`devices/${DEVICE_ID}/readings/reading-invalid`)
      .set(validReading({ soilMoisture: 150 }))
  );
});

test("farm owner can create a valid pump command", async () => {
  const db = env.authenticatedContext(OWNER_UID).firestore();

  await assertSucceeds(
    db.doc(`devices/${DEVICE_ID}/commands/current`).set({
      pumpCommand: "START",
      autoMode: false,
      minimumMoisture: 35,
      targetMoisture: 45,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    })
  );
});

test("another user cannot issue a pump command", async () => {
  const db = env.authenticatedContext(OTHER_UID).firestore();

  await assertFails(
    db.doc(`devices/${DEVICE_ID}/commands/current`).set({
      pumpCommand: "START",
      autoMode: false,
      minimumMoisture: 35,
      targetMoisture: 45,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    })
  );
});