@IsTest
private class SampleServiceTest {
    @IsTest
    static void greetsByName() {
        Assert.areEqual('Hello, Ada', SampleService.greet(' Ada '));
    }

    @IsTest
    static void defaultsWhenBlank() {
        Assert.areEqual('Hello, Trailblazer', SampleService.greet(null));
    }
}
