#!/usr/bin/env node
'use strict';
/**
 * Chooses which Apex test classes to run for a pull request, so validation
 * deploys use `--test-level RunSpecifiedTests` instead of running every test.
 *
 * Rules
 *   - A changed test class runs itself.
 *   - A changed class `Foo` runs `FooTest` and `Foo_Test` if they exist.
 *   - A changed trigger `BarTrigger` on `Bar` runs `BarTriggerHandlerTest`, `BarTriggerTest`, `BarTest` if they exist.
 *   - Any other test class whose source mentions a changed class name is also selected.
 *   - If nothing maps, or more than `maxTests` would run, fall back to RunLocalTests.
 *
 * Usage
 *   git diff --name-only origin/main...HEAD | node scripts/select-tests.js --classes force-app/main/default/classes
 * Output (stdout, JSON): {"testLevel":"RunSpecifiedTests","tests":["FooTest"]}
 */
const fs = require('node:fs');
const path = require('node:path');

const isTestSource = (source) => /@istest/i.test(source);

function loadClasses(classesDir) {
    const classes = new Map(); // name -> { source, isTest }
    if (!fs.existsSync(classesDir)) return classes;
    for (const file of fs.readdirSync(classesDir)) {
        if (!file.endsWith('.cls')) continue;
        const source = fs.readFileSync(path.join(classesDir, file), 'utf8');
        classes.set(path.basename(file, '.cls'), { source, isTest: isTestSource(source) });
    }
    return classes;
}

function selectTests(changedFiles, classes, { maxTests = 50 } = {}) {
    const selected = new Set();
    const changedNames = [];
    let unmappedCodeChange = false;

    const addIfTest = (name) => {
        const cls = classes.get(name);
        if (cls && cls.isTest) {
            selected.add(name);
            return true;
        }
        return false;
    };

    for (const file of changedFiles.map((f) => f.trim()).filter(Boolean)) {
        const base = path.basename(file);
        if (base.endsWith('.cls')) {
            const name = path.basename(base, '.cls');
            changedNames.push(name);
            if (addIfTest(name)) continue;
            const mapped = [addIfTest(`${name}Test`), addIfTest(`${name}_Test`)].some(Boolean);
            if (!mapped) unmappedCodeChange = true;
        } else if (base.endsWith('.trigger')) {
            const name = path.basename(base, '.trigger');
            changedNames.push(name);
            const object = name.replace(/Trigger$/, '');
            const mapped = [addIfTest(`${name}HandlerTest`), addIfTest(`${name}Test`), addIfTest(`${object}Test`)].some(Boolean);
            if (!mapped) unmappedCodeChange = true;
        }
    }

    // Reference scan: tests that mention a changed class by name.
    for (const [name, cls] of classes) {
        if (!cls.isTest) continue;
        if (changedNames.some((changed) => new RegExp(`\\b${changed}\\b`).test(cls.source))) {
            selected.add(name);
        }
    }

    if (changedNames.length === 0) {
        return { testLevel: 'NoTestRun', tests: [], reason: 'No Apex changes' };
    }
    if (selected.size === 0 || selected.size > maxTests) {
        return { testLevel: 'RunLocalTests', tests: [], reason: selected.size === 0 ? 'No tests mapped' : 'Too many tests' };
    }
    return {
        testLevel: 'RunSpecifiedTests',
        tests: [...selected].sort(),
        reason: unmappedCodeChange ? 'Some classes matched only by reference scan' : 'All changes mapped'
    };
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const classesDir = args.includes('--classes') ? args[args.indexOf('--classes') + 1] : 'force-app/main/default/classes';
    const input = fs.readFileSync(0, 'utf8');
    const result = selectTests(input.split('\n'), loadClasses(classesDir));
    process.stdout.write(JSON.stringify(result) + '\n');
}

module.exports = { selectTests, loadClasses };
