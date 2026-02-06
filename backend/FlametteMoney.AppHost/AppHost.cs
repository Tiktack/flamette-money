var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.FlametteMoney_Web>("api")
	.WithExternalHttpEndpoints();

builder.AddViteApp("frontend", "../../frontend")
	.WithReference(api)
	.WaitFor(api)
	.WithEnvironment("BROWSER", "none")
	.WithExternalHttpEndpoints();

builder.Build().Run();
