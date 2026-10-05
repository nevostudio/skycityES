import test from "node:test";
import assert from "node:assert/strict";
import { claimSchema, takeoverSchema } from "../lib/validation";
import { emptyAd } from "../lib/seed";

const base = {
  propertyId: "building-1",
  email: "buyer@example.com",
  ad: { ...emptyAd, brand: "Consent Co" },
};

test("purchases and takeovers require accepting the terms and immediate delivery", () => {
  for (const consent of [
    undefined,
    { terms: false, immediate: true },
    { terms: true, immediate: false },
  ]) {
    assert.throws(() => claimSchema.parse({ ...base, consent }));
    assert.throws(() =>
      takeoverSchema.parse({ ...base, offerAmount: 5, consent }),
    );
  }
  const consent = { terms: true, immediate: true };
  assert.equal(claimSchema.parse({ ...base, consent }).consent.terms, true);
  assert.equal(
    takeoverSchema.parse({ ...base, offerAmount: 5, consent }).consent
      .immediate,
    true,
  );
});
