# Local Date And Detail Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix incorrect income role totals in the detail page and remove UTC-based date/month defaults that can save or query records under the wrong local day or month.

**Architecture:** Introduce two tiny utilities: one for local date/month formatting, and one for selecting role totals by active record type. Wire existing components and server routes to these helpers with the smallest possible changes.

**Tech Stack:** Vue 3, Fastify, Node.js built-in test runner

---

### Task 1: Add failing regression tests

**Files:**
- Create: `test/helpers.test.js`
- Create: `src/utils/date.js`
- Create: `src/utils/detailSummary.js`

**Step 1: Write the failing test**

Add tests for local month/date formatting and detail summary selection.

**Step 2: Run test to verify it fails**

Run: `node --test test/helpers.test.js`
Expected: FAIL because helper modules do not exist yet.

**Step 3: Write minimal implementation**

Create helper modules with the smallest API needed by current code.

**Step 4: Run test to verify it passes**

Run: `node --test test/helpers.test.js`
Expected: PASS.

### Task 2: Wire helpers into app and server

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/AiInput.vue`
- Modify: `src/components/Dashboard.vue`
- Modify: `src/components/DetailPage.vue`
- Modify: `server.js`

**Step 1: Replace UTC defaults**

Use the local date/month helper everywhere a current date or month is derived.

**Step 2: Fix detail summary source**

Use the detail summary helper so the page reads `income` for income and `expense` for expense.

**Step 3: Run targeted test**

Run: `node --test test/helpers.test.js`
Expected: PASS.

### Task 3: Verify application still builds

**Files:**
- Modify: `package.json`

**Step 1: Add a test script**

Add a minimal `test` script using the Node test runner.

**Step 2: Run verification**

Run: `npm test`
Run: `npm run build`
Expected: both succeed.
