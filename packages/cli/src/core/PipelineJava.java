/**
 * Pipeline Pattern Implementation for Java
 * Analyzing portability and enterprise developer experience
 */

package com.ginko.pipeline;

import java.util.*;
import java.util.function.Function;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Logger;

// ============================================
// JAVA IMPLEMENTATION - ENTERPRISE STYLE
// ============================================

/**
 * Context object using Builder pattern (Java best practice)
 * Note: Java requires more boilerplate but gains type safety
 */
class PipelineContext {
    private final String intent;
    private String domain;
    private Map<String, Object> template;
    private Map<String, Object> context;
    private String output;
    private List<String> errors;
    private double confidence;

    private PipelineContext(Builder builder) {
        this.intent = builder.intent;
        this.domain = builder.domain;
        this.template = builder.template;
        this.context = builder.context;
        this.output = builder.output;
        this.errors = builder.errors;
        this.confidence = builder.confidence;
    }

    // Builder pattern (Java idiomatic)
    public static class Builder {
        private final String intent;
        private String domain;
        private Map<String, Object> template = new HashMap<>();
        private Map<String, Object> context = new HashMap<>();
        private String output;
        private List<String> errors = new ArrayList<>();
        private double confidence = 1.0;

        public Builder(String intent) {
            this.intent = intent;
        }

        public Builder domain(String domain) {
            this.domain = domain;
            return this;
        }

        public Builder template(Map<String, Object> template) {
            this.template = template;
            return this;
        }

        public Builder addError(String error) {
            this.errors.add(error);
            return this;
        }

        public Builder confidence(double confidence) {
            this.confidence = confidence;
            return this;
        }

        public PipelineContext build() {
            return new PipelineContext(this);
        }
    }

    // Getters (Java needs these)
    public String getIntent() { return intent; }
    public String getDomain() { return domain; }
    public Map<String, Object> getTemplate() { return template; }
    public Map<String, Object> getContext() { return context; }
    public String getOutput() { return output; }
    public List<String> getErrors() { return errors; }
    public double getConfidence() { return confidence; }

    // Package-private setters for pipeline
    void setDomain(String domain) { this.domain = domain; }
    void setTemplate(Map<String, Object> template) { this.template = template; }
    void setContext(Map<String, Object> context) { this.context = context; }
    void setOutput(String output) { this.output = output; }
    void addError(String error) { this.errors.add(error); }
    void setConfidence(double confidence) { this.confidence = confidence; }
}

/**
 * Main Pipeline class
 * Java version requires more verbosity but provides strong typing
 */
public class ReflectionPipeline {
    private static final Logger logger = Logger.getLogger(ReflectionPipeline.class.getName());
    protected PipelineContext ctx;

    public ReflectionPipeline(String intent) {
        this.ctx = new PipelineContext.Builder(intent).build();
    }

    // Fluent methods with self-return
    public ReflectionPipeline withDomain(String domain) {
        ctx.setDomain(domain);
        logger.info("📁 Domain: " + domain);
        return this;
    }

    public ReflectionPipeline withTemplate(Map<String, Object> template) {
        ctx.setTemplate(template);
        logger.info("📄 Template loaded");
        return this;
    }

    public ReflectionPipeline withContext(Map<String, Object> context) {
        ctx.setContext(context);
        logger.info("📊 Context added");
        return this;
    }

    public ReflectionPipeline validate() {
        if (ctx.getDomain() == null || ctx.getDomain().isEmpty()) {
            ctx.addError("Domain is required");
            ctx.setConfidence(ctx.getConfidence() * 0.5);
        }

        if (ctx.getTemplate() == null || ctx.getTemplate().isEmpty()) {
            ctx.addError("Template is required");
            ctx.setConfidence(ctx.getConfidence() * 0.7);
        }

        if (ctx.getErrors().isEmpty()) {
            logger.info("✅ Validation passed");
        } else {
            logger.warning("⚠️ Validation issues: " + String.join(", ", ctx.getErrors()));
        }

        return this;
    }

    public ReflectionPipeline transform(Function<PipelineContext, PipelineContext> transformer) {
        try {
            ctx = transformer.apply(ctx);
            logger.info("🔄 Transform applied");
        } catch (Exception e) {
            ctx.addError("Transform failed: " + e.getMessage());
            ctx.setConfidence(ctx.getConfidence() * 0.3);
        }
        return this;
    }

    public ReflectionPipeline generate() {
        if (!ctx.getErrors().isEmpty()) {
            logger.warning("⚠️ Skipping generation due to errors");
            return this;
        }

        ctx.setOutput(String.format("Generated %s for: %s", ctx.getDomain(), ctx.getIntent()));
        logger.info("✨ Content generated");
        return this;
    }

    public ReflectionPipeline recover() {
        if (!ctx.getErrors().isEmpty()) {
            logger.info("🔧 Attempting recovery...");

            // Auto-fix common issues
            if (ctx.getDomain() == null && ctx.getIntent().toLowerCase().contains("handoff")) {
                ctx.setDomain("handoff");
                ctx.getErrors().removeIf(e -> e.contains("Domain"));
                logger.info("  → Auto-detected domain: handoff");
            }

            if (ctx.getTemplate() == null) {
                Map<String, Object> defaultTemplate = new HashMap<>();
                defaultTemplate.put("default", true);
                ctx.setTemplate(defaultTemplate);
                ctx.getErrors().removeIf(e -> e.contains("Template"));
                logger.info("  → Using default template");
            }

            ctx.setConfidence(0.7);
        }
        return this;
    }

    // Java 8+ CompletableFuture for async
    public CompletableFuture<PipelineContext> executeAsync() {
        return CompletableFuture.supplyAsync(() -> {
            if (ctx.getConfidence() < 0.6) {
                logger.warning(String.format("⚠️ Low confidence: %.0f%%", ctx.getConfidence() * 100));
            }

            if (!ctx.getErrors().isEmpty() && ctx.getConfidence() < 0.3) {
                throw new RuntimeException("Pipeline failed: " + String.join(", ", ctx.getErrors()));
            }

            return ctx;
        });
    }

    // Synchronous version
    public PipelineContext execute() {
        return executeAsync().join();
    }

    // Java-style getters
    public double getConfidence() {
        return ctx.getConfidence();
    }

    public List<String> getErrors() {
        return ctx.getErrors();
    }
}

// ============================================
// JAVA-SPECIFIC PATTERNS
// ============================================

/**
 * Interface for extensibility (Java loves interfaces)
 */
interface PipelineStep<T> {
    T execute(T input) throws PipelineException;
    default T recover(T input, Exception e) {
        // Default recovery behavior
        return input;
    }
}

/**
 * Custom exception for pipeline failures
 */
class PipelineException extends Exception {
    private final double confidence;
    private final List<String> errors;

    public PipelineException(String message, double confidence, List<String> errors) {
        super(message);
        this.confidence = confidence;
        this.errors = errors;
    }

    public double getConfidence() { return confidence; }
    public List<String> getErrors() { return errors; }
}

/**
 * Alternative: Stream-based pipeline (Java 8+ style)
 */
class StreamPipeline {
    public static PipelineContext process(String intent) {
        return Stream.of(intent)
            .map(i -> new PipelineContext.Builder(i).build())
            .map(ctx -> {
                ctx.setDomain("auto-detected");
                return ctx;
            })
            .map(ctx -> {
                // Validation
                if (ctx.getDomain() == null) {
                    ctx.addError("Missing domain");
                }
                return ctx;
            })
            .filter(ctx -> ctx.getErrors().isEmpty())
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Pipeline failed"));
    }
}

/**
 * Enterprise pattern: Dependency Injection friendly
 */
class InjectablePipeline {
    private final Logger logger;
    private final ValidationService validator;
    private final GenerationService generator;

    // Constructor injection (Spring/Jakarta EE friendly)
    public InjectablePipeline(Logger logger, ValidationService validator, GenerationService generator) {
        this.logger = logger;
        this.validator = validator;
        this.generator = generator;
    }

    public PipelineContext process(String intent) {
        // Enterprise-style processing
        return null; // Implementation details
    }
}

// Stub services for DI example
interface ValidationService {
    boolean validate(PipelineContext ctx);
}

interface GenerationService {
    String generate(PipelineContext ctx);
}

// ============================================
// USAGE EXAMPLES
// ============================================

class Examples {
    public static void main(String[] args) {
        // Example 1: Standard fluent usage
        PipelineContext result1 = new ReflectionPipeline("Create handoff")
            .withDomain("handoff")
            .withTemplate(Map.of("sections", Arrays.asList("summary", "context")))
            .validate()
            .generate()
            .execute();

        System.out.println("Result: " + result1.getOutput());

        // Example 2: With error recovery
        PipelineContext result2 = new ReflectionPipeline("Start session")
            .validate()        // Will flag errors
            .recover()         // Auto-fixes
            .generate()
            .execute();

        // Example 3: Async execution
        new ReflectionPipeline("Async task")
            .withDomain("async")
            .validate()
            .executeAsync()
            .thenAccept(ctx -> System.out.println("Completed: " + ctx.getOutput()))
            .exceptionally(ex -> {
                System.err.println("Failed: " + ex.getMessage());
                return null;
            });

        // Example 4: Try-with-resources pattern (Java 7+)
        // Would need to implement AutoCloseable
    }
}

/**
 * Extension via inheritance (Java style)
 */
class CustomPRDPipeline extends ReflectionPipeline {
    public CustomPRDPipeline(String intent) {
        super(intent);
        this.withDomain("prd"); // Auto-set domain
    }

    public CustomPRDPipeline withUserStories(List<String> stories) {
        Map<String, Object> context = ctx.getContext();
        if (context == null) {
            context = new HashMap<>();
            ctx.setContext(context);
        }
        context.put("userStories", stories);
        return this;
    }

    public CustomPRDPipeline withPainPoints(List<String> points) {
        Map<String, Object> context = ctx.getContext();
        if (context == null) {
            context = new HashMap<>();
            ctx.setContext(context);
        }
        context.put("painPoints", points);
        return this;
    }

    @Override
    public CustomPRDPipeline generate() {
        super.generate();
        if (ctx.getOutput() != null) {
            ctx.setOutput("# PRD: " + ctx.getIntent() + "\n\n" + ctx.getOutput());
        }
        return this;
    }
}

// ============================================
// JAVA-SPECIFIC CHALLENGES & SOLUTIONS
// ============================================

/**
 * Java Challenges for This Pattern:
 *
 * 1. **Verbosity**: Need getters/setters, builders
 *    Solution: Use Lombok or Records (Java 14+)
 *
 * 2. **Type Erasure**: Generic limitations
 *    Solution: Explicit type tokens or Class<?> parameters
 *
 * 3. **Checked Exceptions**: Forces try-catch
 *    Solution: Wrap in RuntimeException or use Result type
 *
 * 4. **No Default Parameters**: Can't have optional args
 *    Solution: Method overloading or Builder pattern
 *
 * 5. **Immutability**: More complex than other languages
 *    Solution: Use Records (Java 14+) or Immutables library
 *
 * IDE Support in Java:
 * - IntelliJ IDEA: Excellent - auto-generates builders
 * - Eclipse: Good support with plugins
 * - NetBeans: Basic but functional
 *
 * Pattern Fit: 7/10 - Works well but requires more code
 *
 * Enterprise Fit: 10/10 - Perfect for enterprise patterns
 * - Integrates with Spring/Jakarta EE
 * - Works with dependency injection
 * - Testable with JUnit/Mockito
 * - Observable with JMX/Micrometer
 */