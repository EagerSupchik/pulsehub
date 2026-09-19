import assert from "node:assert/strict";
import test from "node:test";
import { calculatePersonalityBonus } from "../backend/personality/service";

const highConnectorProfile = {
  openness: 40,
  conscientiousness: 60,
  extraversion: 82,
  agreeableness: 65,
  emotionalStability: 70,
};

test("adds a ten percent bonus for a strong matching trait", () => {
  assert.deepEqual(
    calculatePersonalityBonus(highConnectorProfile, 150, "connector"),
    { bonus: 15, rate: 0.1, style: "connector" },
  );
});

test("adds a five percent bonus for a moderate matching trait", () => {
  assert.deepEqual(
    calculatePersonalityBonus(highConnectorProfile, 140, "organizer"),
    { bonus: 7, rate: 0.05, style: "organizer" },
  );
});

test("does not change base points without consented profile or task style", () => {
  assert.equal(calculatePersonalityBonus(null, 200, "connector").bonus, 0);
  assert.equal(calculatePersonalityBonus(highConnectorProfile, 200, null).bonus, 0);
});
