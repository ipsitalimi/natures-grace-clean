import assert from "node:assert/strict";
import { test } from "node:test";

import { isPractitionerBankAccountLinked } from "../client/lib/payoutDisclosure";

test("practitioner wallet does not treat the legacy HDFC placeholder as bank details", () => {
  assert.equal(isPractitionerBankAccountLinked("HDFC Bank ···· 4821"), false);
  assert.equal(isPractitionerBankAccountLinked("Bank account not linked"), false);
  assert.equal(isPractitionerBankAccountLinked(null), false);
});

test("practitioner wallet accepts a real masked bank label", () => {
  assert.equal(isPractitionerBankAccountLinked("ICICI Bank ···· 1234"), true);
});
