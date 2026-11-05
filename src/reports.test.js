import test from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./reports.js";

test("CSV quotes delimiters, line breaks, and embedded quotes", () => {
  assert.equal(toCsv([{ date: "2026-11-06", note: 'felt, "okay"\ntoday' }], [["date", "Date"], ["note", "Note"]]), '"Date","Note"\r\n"2026-11-06","felt, ""okay""\ntoday"');
});
