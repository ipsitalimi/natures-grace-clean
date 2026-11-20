import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BANK_NOT_LINKED_NOTICE,
  MANUAL_PAYOUT_NOTICE,
  formatNextPayoutDate,
  isPractitionerBankAccountLinked,
} from "../client/lib/payoutDisclosure";

test("practitioner wallet does not treat the shared placeholder bank label as linked", () => {
  assert.equal(isPractitionerBankAccountLinked("HDFC Bank ···· 4821"), false);
  assert.equal(isPractitionerBankAccountLinked(" hdfc bank ···· 4821 "), false);
});

test("practitioner wallet recognizes a real masked bank label and missing values", () => {
  assert.equal(isPractitionerBankAccountLinked("ICICI Bank ···· 1234"), true);
  assert.equal(isPractitionerBankAccountLinked("Bank account not linked"), false);
  assert.equal(isPractitionerBankAccountLinked(null), false);
  assert.equal(isPractitionerBankAccountLinked(undefined), false);
});

test("payout disclosure keeps manual admin processing clear", () => {
  assert.match(MANUAL_PAYOUT_NOTICE, /handled directly by the Nature's Grace admin team/i);
  assert.match(BANK_NOT_LINKED_NOTICE, /managed directly with the Nature's Grace admin team/i);
  assert.equal(formatNextPayoutDate(null), "Scheduled after admin review");
});
