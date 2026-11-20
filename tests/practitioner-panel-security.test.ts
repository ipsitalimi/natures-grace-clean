import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BANK_NOT_LINKED_NOTICE,
  MANUAL_PAYOUT_NOTICE,
  formatNextPayoutDate,
  isBankAccountLinked,
  isPractitionerBankAccountLinked,
} from "../client/lib/payoutDisclosure";

test("practitioner bank details require both a masked label and account-holder name", () => {
  assert.equal(isPractitionerBankAccountLinked("HDFC Bank ···· 4821", ""), false);
  assert.equal(isPractitionerBankAccountLinked("HDFC Bank ···· 4821", "A Practitioner"), true);
  assert.equal(isPractitionerBankAccountLinked("ICICI Bank ···· 1234", "A Practitioner"), true);
  assert.equal(isPractitionerBankAccountLinked("Bank account not linked", "A Practitioner"), false);
});

test("practitioner wallet recognizes missing bank details", () => {
  assert.equal(isBankAccountLinked("Bank account not linked"), false);
  assert.equal(isBankAccountLinked(null), false);
  assert.equal(isBankAccountLinked(undefined), false);
});

test("payout disclosure keeps manual admin processing clear", () => {
  assert.match(MANUAL_PAYOUT_NOTICE, /handled directly by the Nature's Grace admin team/i);
  assert.match(BANK_NOT_LINKED_NOTICE, /managed directly with the Nature's Grace admin team/i);
  assert.equal(formatNextPayoutDate(null), "Scheduled after admin review");
});
