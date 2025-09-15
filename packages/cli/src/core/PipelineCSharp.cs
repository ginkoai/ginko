/**
 * Pipeline Pattern Implementation for C#
 * Analyzing portability for .NET/Windows developers
 */

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Ginko.Pipeline
{
    // ============================================
    // C# IMPLEMENTATION - MODERN .NET STYLE
    // ============================================

    /// <summary>
    /// Context using C# 9+ record for immutability
    /// Note: C# has the best of both worlds - concise + type-safe
    /// </summary>
    public record PipelineContext
    {
        public string Intent { get; init; }
        public string? Domain { get; init; }
        public Dictionary<string, object>? Template { get; init; }
        public Dictionary<string, object>? Context { get; init; }
        public string? Output { get; init; }
        public List<string> Errors { get; init; } = new();
        public double Confidence { get; init; } = 1.0;

        // C# 10+ allows with-expressions for immutable updates
        public PipelineContext With(Action<Builder> configure)
        {
            var builder = new Builder(this);
            configure(builder);
            return builder.Build();
        }

        public class Builder
        {
            private PipelineContext _context;

            public Builder(PipelineContext context)
            {
                _context = context;
            }

            public Builder WithDomain(string domain)
            {
                _context = _context with { Domain = domain };
                return this;
            }

            public Builder WithTemplate(Dictionary<string, object> template)
            {
                _context = _context with { Template = template };
                return this;
            }

            public Builder AddError(string error)
            {
                var errors = new List<string>(_context.Errors) { error };
                _context = _context with { Errors = errors };
                return this;
            }

            public Builder WithConfidence(double confidence)
            {
                _context = _context with { Confidence = confidence };
                return this;
            }

            public PipelineContext Build() => _context;
        }
    }

    /// <summary>
    /// Main Pipeline class using modern C# features
    /// </summary>
    public class ReflectionPipeline
    {
        private readonly ILogger<ReflectionPipeline>? _logger;
        protected PipelineContext _context;

        public ReflectionPipeline(string intent, ILogger<ReflectionPipeline>? logger = null)
        {
            _context = new PipelineContext { Intent = intent };
            _logger = logger;
        }

        // Fluent methods with null-conditional operators
        public ReflectionPipeline WithDomain(string domain)
        {
            _context = _context with { Domain = domain };
            _logger?.LogInformation("📁 Domain: {Domain}", domain);
            return this;
        }

        public ReflectionPipeline WithTemplate(Dictionary<string, object> template)
        {
            _context = _context with { Template = template };
            _logger?.LogInformation("📄 Template loaded");
            return this;
        }

        public ReflectionPipeline WithContext(Dictionary<string, object> context)
        {
            _context = _context with { Context = context };
            _logger?.LogInformation("📊 Context added");
            return this;
        }

        public ReflectionPipeline Validate()
        {
            var errors = new List<string>(_context.Errors);
            var confidence = _context.Confidence;

            if (string.IsNullOrEmpty(_context.Domain))
            {
                errors.Add("Domain is required");
                confidence *= 0.5;
            }

            if (_context.Template?.Any() != true)
            {
                errors.Add("Template is required");
                confidence *= 0.7;
            }

            _context = _context with { Errors = errors, Confidence = confidence };

            if (!errors.Any())
            {
                _logger?.LogInformation("✅ Validation passed");
            }
            else
            {
                _logger?.LogWarning("⚠️ Validation issues: {Errors}", string.Join(", ", errors));
            }

            return this;
        }

        // C# local functions for cleaner code
        public ReflectionPipeline Transform(Func<PipelineContext, PipelineContext> transformer)
        {
            try
            {
                _context = transformer(_context);
                _logger?.LogInformation("🔄 Transform applied");
            }
            catch (Exception ex)
            {
                var errors = new List<string>(_context.Errors) { $"Transform failed: {ex.Message}" };
                _context = _context with
                {
                    Errors = errors,
                    Confidence = _context.Confidence * 0.3
                };
            }
            return this;
        }

        public ReflectionPipeline Generate()
        {
            if (_context.Errors.Any())
            {
                _logger?.LogWarning("⚠️ Skipping generation due to errors");
                return this;
            }

            _context = _context with
            {
                Output = $"Generated {_context.Domain} for: {_context.Intent}"
            };
            _logger?.LogInformation("✨ Content generated");
            return this;
        }

        public ReflectionPipeline Recover()
        {
            if (!_context.Errors.Any()) return this;

            _logger?.LogInformation("🔧 Attempting recovery...");

            var errors = new List<string>(_context.Errors);
            var domain = _context.Domain;
            var template = _context.Template;

            // Pattern matching (C# 8+)
            if (domain is null && _context.Intent.Contains("handoff", StringComparison.OrdinalIgnoreCase))
            {
                domain = "handoff";
                errors.RemoveAll(e => e.Contains("Domain"));
                _logger?.LogInformation("  → Auto-detected domain: handoff");
            }

            if (template is null)
            {
                template = new Dictionary<string, object> { ["default"] = true };
                errors.RemoveAll(e => e.Contains("Template"));
                _logger?.LogInformation("  → Using default template");
            }

            _context = _context with
            {
                Domain = domain,
                Template = template,
                Errors = errors,
                Confidence = 0.7
            };

            return this;
        }

        // Async/await with ValueTask for performance
        public async ValueTask<PipelineContext> ExecuteAsync()
        {
            if (_context.Confidence < 0.6)
            {
                _logger?.LogWarning("⚠️ Low confidence: {Confidence:P0}", _context.Confidence);
            }

            if (_context.Errors.Any() && _context.Confidence < 0.3)
            {
                throw new InvalidOperationException($"Pipeline failed: {string.Join(", ", _context.Errors)}");
            }

            // Simulate async work
            await Task.Yield();
            return _context;
        }

        // Synchronous version
        public PipelineContext Execute() => ExecuteAsync().AsTask().Result;

        // C# properties for clean access
        public double Confidence => _context.Confidence;
        public IReadOnlyList<string> Errors => _context.Errors.AsReadOnly();
    }

    // ============================================
    // C#-SPECIFIC PATTERNS
    // ============================================

    /// <summary>
    /// LINQ-based pipeline (C# unique feature)
    /// </summary>
    public static class LinqPipeline
    {
        public static PipelineContext Process(string intent)
        {
            return new[] { intent }
                .Select(i => new PipelineContext { Intent = i })
                .Select(ctx => ctx with { Domain = "auto-detected" })
                .Where(ctx => !string.IsNullOrEmpty(ctx.Domain))
                .Select(ctx => ctx with { Output = $"Processed: {ctx.Intent}" })
                .FirstOrDefault() ?? throw new InvalidOperationException("Pipeline failed");
        }

        // Extension methods for fluent LINQ
        public static IEnumerable<PipelineContext> ValidateAll(this IEnumerable<PipelineContext> contexts)
        {
            return contexts.Where(ctx => !ctx.Errors.Any());
        }

        public static IEnumerable<PipelineContext> RecoverAll(this IEnumerable<PipelineContext> contexts)
        {
            return contexts.Select(ctx =>
            {
                if (ctx.Domain is null)
                {
                    return ctx with { Domain = "recovered" };
                }
                return ctx;
            });
        }
    }

    /// <summary>
    /// Pattern matching pipeline (C# 9+)
    /// </summary>
    public class PatternMatchPipeline
    {
        public static string ProcessIntent(PipelineContext context) => context switch
        {
            { Intent: var i } when i.Contains("handoff") => "handoff domain",
            { Intent: var i } when i.Contains("start") => "start domain",
            { Intent: var i } when i.Contains("prd") => "prd domain",
            _ => "unknown domain"
        };

        // Switch expressions for validation
        public static (bool isValid, string? error) ValidateContext(PipelineContext context) => context switch
        {
            { Domain: null } => (false, "Domain required"),
            { Template: null } => (false, "Template required"),
            { Confidence: < 0.3 } => (false, "Confidence too low"),
            _ => (true, null)
        };
    }

    /// <summary>
    /// Async enumerable pipeline (C# 8+)
    /// </summary>
    public class AsyncPipeline
    {
        public async IAsyncEnumerable<PipelineContext> ProcessMultiple(IEnumerable<string> intents)
        {
            foreach (var intent in intents)
            {
                var pipeline = new ReflectionPipeline(intent)
                    .WithDomain("batch")
                    .Validate()
                    .Generate();

                yield return await pipeline.ExecuteAsync();
            }
        }
    }

    /// <summary>
    /// Dependency Injection with .NET Core
    /// </summary>
    public interface IPipelineService
    {
        Task<PipelineContext> ProcessAsync(string intent);
    }

    public class PipelineService : IPipelineService
    {
        private readonly ILogger<PipelineService> _logger;
        private readonly IValidator _validator;

        public PipelineService(ILogger<PipelineService> logger, IValidator validator)
        {
            _logger = logger;
            _validator = validator;
        }

        public async Task<PipelineContext> ProcessAsync(string intent)
        {
            var pipeline = new ReflectionPipeline(intent, _logger as ILogger<ReflectionPipeline>)
                .WithDomain("service")
                .Validate()
                .Generate();

            return await pipeline.ExecuteAsync();
        }
    }

    public interface IValidator
    {
        bool Validate(PipelineContext context);
    }

    // ============================================
    // USAGE EXAMPLES
    // ============================================

    public class Examples
    {
        public static async Task Main()
        {
            // Example 1: Standard fluent usage
            var result1 = await new ReflectionPipeline("Create handoff")
                .WithDomain("handoff")
                .WithTemplate(new Dictionary<string, object>
                {
                    ["sections"] = new[] { "summary", "context" }
                })
                .Validate()
                .Generate()
                .ExecuteAsync();

            Console.WriteLine($"Result: {result1.Output}");

            // Example 2: With pattern matching
            var domain = PatternMatchPipeline.ProcessIntent(result1);
            Console.WriteLine($"Detected domain: {domain}");

            // Example 3: LINQ pipeline
            var contexts = new[] { "task1", "task2", "task3" }
                .Select(intent => new ReflectionPipeline(intent)
                    .WithDomain("batch")
                    .Validate()
                    .Generate()
                    .Execute())
                .Where(ctx => ctx.Confidence > 0.5)
                .ToList();

            // Example 4: Async enumerable
            var asyncPipeline = new AsyncPipeline();
            await foreach (var ctx in asyncPipeline.ProcessMultiple(new[] { "async1", "async2" }))
            {
                Console.WriteLine($"Processed: {ctx.Intent}");
            }
        }
    }

    /// <summary>
    /// Extension via inheritance
    /// </summary>
    public class CustomPRDPipeline : ReflectionPipeline
    {
        public CustomPRDPipeline(string intent) : base(intent)
        {
            WithDomain("prd");
        }

        public CustomPRDPipeline WithUserStories(params string[] stories)
        {
            var context = _context.Context ?? new Dictionary<string, object>();
            context["userStories"] = stories;
            _context = _context with { Context = context };
            return this;
        }

        public CustomPRDPipeline WithPainPoints(params string[] points)
        {
            var context = _context.Context ?? new Dictionary<string, object>();
            context["painPoints"] = points;
            _context = _context with { Context = context };
            return this;
        }
    }

    // ============================================
    // C#-SPECIFIC ADVANTAGES & ANALYSIS
    // ============================================

    /*
     * C# Advantages for This Pattern:
     *
     * 1. **Records**: Perfect for immutable context (C# 9+)
     * 2. **Pattern Matching**: Elegant validation logic
     * 3. **LINQ**: Powerful pipeline transformations
     * 4. **Async/Await**: First-class async support
     * 5. **Extension Methods**: Clean API extensions
     * 6. **Nullable Reference Types**: Null safety (C# 8+)
     * 7. **ValueTask**: Performance optimization
     * 8. **IAsyncEnumerable**: Streaming pipelines
     *
     * IDE Support in C#:
     * - Visual Studio: Excellent - best-in-class IntelliSense
     * - VS Code + OmniSharp: Great for cross-platform
     * - Rider: Excellent with ReSharper features
     *
     * Pattern Fit: 9/10 - Nearly perfect fit
     * - More concise than Java
     * - More type-safe than Python
     * - Modern features reduce boilerplate
     *
     * Enterprise Fit: 10/10
     * - Integrates perfectly with .NET Core DI
     * - Works with Entity Framework
     * - Azure Functions compatible
     * - Full observability with Application Insights
     */
}