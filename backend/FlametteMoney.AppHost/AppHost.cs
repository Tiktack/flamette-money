var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.FlametteMoney_Web>("api")
	.WithExternalHttpEndpoints();

builder.AddBunApp("frontend", "../../frontend-new", entryPoint: "dev")
	.WithBunPackageInstallation()
	.WithReference(api)
	.WaitFor(api)
	.WithEnvironment("BROWSER", "none")
	.WithHttpEndpoint(env: "PORT")
	.WithExternalHttpEndpoints();

builder.Build().Run();
