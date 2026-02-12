using MarginCoinAPI.Model;
using MarginCoinAPI.Service;
using MarginCoinAPI.Configuration;
using MarginCoinAPI.Misc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Debugging;

// Capture Serilog internal sink errors to stderr for diagnostics
SelfLog.Enable(message => Console.Error.WriteLine($"[SerilogSelfLog] {message}"));

var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{environment}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables()
    .Build();

var seqUrl = configuration["Seq:Url"] ?? Environment.GetEnvironmentVariable("SEQ_URL");

var loggerConfig = new LoggerConfiguration()
    .ReadFrom.Configuration(configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/.txt", shared: true, rollingInterval: Serilog.RollingInterval.Day);

if (!string.IsNullOrWhiteSpace(seqUrl))
{
    try
    {
        loggerConfig.WriteTo.Seq(seqUrl);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Failed to configure Seq logging: {ex.Message}");
    }
}

Log.Logger = loggerConfig.CreateLogger();

// Log any unhandled application-level exceptions
AppDomain.CurrentDomain.UnhandledException += (sender, eventArgs) =>
{
    Log.Fatal(eventArgs.ExceptionObject as Exception, "Unhandled exception");
};

// Log any unobserved task exceptions before process exits
TaskScheduler.UnobservedTaskException += (sender, eventArgs) =>
{
    Log.Fatal(eventArgs.Exception, "Unobserved task exception");
    eventArgs.SetObserved();
};

try
{
    Log.Warning("MarginCoin API started!");

    var builder = WebApplication.CreateBuilder(args);

    // Add Serilog
    builder.Host.UseSerilog();

// Add services to the container.
builder.Services.AddControllers();

// Add HttpClient Factory
builder.Services.AddHttpClient();

// Configure Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("SqLite")));

// Configure Settings
builder.Services.Configure<BinanceConfiguration>(builder.Configuration.GetSection("Binance"));
builder.Services.Configure<TradingConfiguration>(builder.Configuration.GetSection("Trading"));
builder.Services.Configure<CoinMarketCapConfiguration>(builder.Configuration.GetSection("CoinMarketCap"));

// Register Services
builder.Services.AddSingleton<ITradingState, TradingStateService>();
builder.Services.AddScoped<IBinanceService, BinanceService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<ISymbolService, SymbolService>();
builder.Services.AddScoped<IMLService, MLService>();
builder.Services.AddScoped<IWebSocket, WebSocket>();
builder.Services.AddScoped<LSTMPredictionService>();
builder.Services.AddScoped<OpenAIPredictionService>();
builder.Services.AddScoped<ICandleDataService, CandleDataService>();
builder.Services.AddScoped<ITradingSettingsService, TradingSettingsService>();

// SignalR
builder.Services.AddSignalR();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Required for SignalR
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("ReactApp");

app.UseAuthorization();

// Map SignalR Hub
app.MapHub<SignalRHub>("/signalrhub");

app.MapControllers();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.WithOpenApi();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
