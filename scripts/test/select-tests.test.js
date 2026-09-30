'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { selectTests, loadClasses } = require('../select-tests');

const classes = new Map([
    ['InvoiceService', { source: 'public class InvoiceService {}', isTest: false }],
    ['InvoiceServiceTest', { source: '@IsTest private class InvoiceServiceTest { InvoiceService s; }', isTest: true }],
    ['PaymentGateway', { source: 'public class PaymentGateway {}', isTest: false }],
    ['CheckoutFlowTest', { source: '@IsTest class CheckoutFlowTest { PaymentGateway g; }', isTest: true }],
    ['CaseTriggerHandlerTest', { source: '@IsTest class CaseTriggerHandlerTest {}', isTest: true }],
    ['Orphan', { source: 'public class Orphan {}', isTest: false }]
]);

test('maps a class to its naming-convention test', () => {
    const result = selectTests(['force-app/main/default/classes/InvoiceService.cls'], classes);
    assert.equal(result.testLevel, 'RunSpecifiedTests');
    assert.deepEqual(result.tests, ['InvoiceServiceTest']);
});

test('finds tests that reference a changed class', () => {
    const result = selectTests(['force-app/main/default/classes/PaymentGateway.cls'], classes);
    assert.deepEqual(result.tests, ['CheckoutFlowTest']);
    assert.match(result.reason, /reference scan/);
});

test('maps a trigger to its handler test', () => {
    const result = selectTests(['force-app/main/default/triggers/CaseTrigger.trigger'], classes);
    assert.deepEqual(result.tests, ['CaseTriggerHandlerTest']);
});

test('a changed test class runs itself', () => {
    const result = selectTests(['force-app/main/default/classes/CheckoutFlowTest.cls'], classes);
    assert.deepEqual(result.tests, ['CheckoutFlowTest']);
});

test('falls back to RunLocalTests when nothing maps', () => {
    const result = selectTests(['force-app/main/default/classes/Orphan.cls'], classes);
    assert.equal(result.testLevel, 'RunLocalTests');
});

test('falls back when too many tests would run', () => {
    const result = selectTests(
        ['force-app/main/default/classes/InvoiceService.cls', 'force-app/main/default/classes/PaymentGateway.cls'],
        classes,
        { maxTests: 1 }
    );
    assert.equal(result.testLevel, 'RunLocalTests');
});

test('no Apex changes means no test run', () => {
    const result = selectTests(['force-app/main/default/lwc/foo/foo.js', 'README.md', ''], classes);
    assert.equal(result.testLevel, 'NoTestRun');
});

test('loads classes from disk and detects @IsTest', () => {
    const loaded = loadClasses(path.join(__dirname, '..', '..', 'force-app', 'main', 'default', 'classes'));
    assert.equal(loaded.get('SampleServiceTest').isTest, true);
    assert.equal(loaded.get('SampleService').isTest, false);
});
