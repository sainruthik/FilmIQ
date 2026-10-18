// Run: node lib/report.check.mts  (Node 23+ strips the types)
import assert from "node:assert/strict";
import { citationKind, fairPosition, parseMoney, reportHeadings, tagCitations } from "./report.ts";

assert.equal(parseMoney("$2M"), 2_000_000);
assert.equal(parseMoney("$2.6M"), 2_600_000);
assert.equal(parseMoney("$750K"), 750_000);
assert.equal(parseMoney("$2,400,000"), 2_400_000);
assert.equal(parseMoney("> $4.1M"), 4_100_000);
assert.equal(parseMoney("$1M-$2M"), null);
assert.equal(parseMoney(null), null);

assert.equal(fairPosition("$1M", "$2M", "$3M"), 0.5);
assert.equal(fairPosition("$1.8M", "$2.6M", "$4.1M").toFixed(3), "0.348");
assert.equal(fairPosition("$1M", "$1M", "$3M"), 0.15);
assert.equal(fairPosition("TBD", "$2M", "$3M"), 0.5);

assert.equal(
  tagCitations("Budget $3.2M [PDF p.4]. Lead's gross [unverified]. See [PDF pp.3-4] and [PDF p.2](http://x)."),
  "Budget $3.2M `PDF p.4`. Lead's gross `unverified`. See `PDF pp.3-4` and [PDF p.2](http://x).",
);
assert.equal(citationKind("PDF p.4"), "pdf");
assert.equal(citationKind("unverified"), "unverified");
assert.equal(citationKind("npm install"), null);

assert.deepEqual(reportHeadings("# Title\n## Story & Rights\ntext\n## **Risk** register ##\n### sub"), [
  { id: "story-rights", text: "Story & Rights" },
  { id: "risk-register", text: "Risk register" },
]);

console.log("report.check: ok");
