/**
 * Placeholder class so the pipeline has something to deploy and test.
 * Replace force-app/ with your own project source.
 */
public with sharing class SampleService {
    public static String greet(String name) {
        return 'Hello, ' + (String.isBlank(name) ? 'Trailblazer' : name.trim());
    }
}
