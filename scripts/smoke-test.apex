// Post-deploy smoke check: fails the pipeline step if core logic is broken.
String result = SampleService.greet('pipeline');
if (result != 'Hello, pipeline') {
    throw new IllegalArgumentException('Smoke test failed: ' + result);
}
System.debug('Smoke test passed');
