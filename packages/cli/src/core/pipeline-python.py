"""
Pipeline Pattern Implementation for Python
Analyzing portability and developer experience
"""

from typing import Optional, Dict, Any, List, TypeVar, Generic
from dataclasses import dataclass, field
from enum import Enum
import logging

# ============================================
# PYTHON IMPLEMENTATION - MOST NATURAL
# ============================================

@dataclass
class PipelineContext:
    """Context object using dataclass for clean syntax"""
    intent: str
    domain: Optional[str] = None
    template: Optional[Dict] = None
    context: Optional[Dict] = None
    output: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    confidence: float = 1.0


class ReflectionPipeline:
    """
    Python version - leveraging Python's strengths
    Note: Method chaining feels very natural in Python
    """

    def __init__(self, intent: str):
        self.ctx = PipelineContext(intent=intent)
        self.logger = logging.getLogger(__name__)

    def with_domain(self, domain: str) -> 'ReflectionPipeline':
        """Fluent method with type hints for IDE support"""
        self.ctx.domain = domain
        self.logger.info(f"📁 Domain: {domain}")
        return self

    def with_template(self, template: Dict) -> 'ReflectionPipeline':
        self.ctx.template = template
        self.logger.info("📄 Template loaded")
        return self

    def with_context(self, context: Dict) -> 'ReflectionPipeline':
        self.ctx.context = context
        self.logger.info("📊 Context added")
        return self

    def validate(self) -> 'ReflectionPipeline':
        """Validation with Pythonic error handling"""
        if not self.ctx.domain:
            self.ctx.errors.append("Domain is required")
            self.ctx.confidence *= 0.5

        if not self.ctx.template:
            self.ctx.errors.append("Template is required")
            self.ctx.confidence *= 0.7

        if not self.ctx.errors:
            self.logger.info("✅ Validation passed")
        else:
            self.logger.warning(f"⚠️ Validation issues: {', '.join(self.ctx.errors)}")

        return self

    def transform(self, func) -> 'ReflectionPipeline':
        """Python's dynamic typing makes transforms easy"""
        try:
            self.ctx = func(self.ctx)
            self.logger.info("🔄 Transform applied")
        except Exception as e:
            self.ctx.errors.append(f"Transform failed: {e}")
            self.ctx.confidence *= 0.3
        return self

    def generate(self) -> 'ReflectionPipeline':
        if self.ctx.errors:
            self.logger.warning("⚠️ Skipping generation due to errors")
            return self

        self.ctx.output = f"Generated {self.ctx.domain} for: {self.ctx.intent}"
        self.logger.info("✨ Content generated")
        return self

    def recover(self) -> 'ReflectionPipeline':
        """Python's duck typing makes recovery flexible"""
        if self.ctx.errors:
            self.logger.info("🔧 Attempting recovery...")

            # Auto-fix with Python's string operations
            if not self.ctx.domain and 'handoff' in self.ctx.intent.lower():
                self.ctx.domain = 'handoff'
                self.ctx.errors = [e for e in self.ctx.errors if 'Domain' not in e]
                self.logger.info("  → Auto-detected domain: handoff")

            if not self.ctx.template:
                self.ctx.template = {'default': True}
                self.ctx.errors = [e for e in self.ctx.errors if 'Template' not in e]
                self.logger.info("  → Using default template")

            self.ctx.confidence = 0.7

        return self

    async def execute(self) -> PipelineContext:
        """Async support is first-class in Python"""
        if self.ctx.confidence < 0.6:
            self.logger.warning(f"⚠️ Low confidence: {self.ctx.confidence:.0%}")

        if self.ctx.errors and self.ctx.confidence < 0.3:
            raise ValueError(f"Pipeline failed: {', '.join(self.ctx.errors)}")

        return self.ctx

    # Python-specific: Property accessors
    @property
    def confidence(self) -> float:
        return self.ctx.confidence

    @property
    def errors(self) -> List[str]:
        return self.ctx.errors


# ============================================
# PYTHONIC ALTERNATIVES
# ============================================

# Alternative 1: Context Manager Pattern (Very Pythonic!)
class PipelineContextManager:
    """Using Python's context manager for resource safety"""

    def __init__(self, intent: str):
        self.pipeline = ReflectionPipeline(intent)

    def __enter__(self):
        logging.info("Starting pipeline execution")
        return self.pipeline

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            logging.error(f"Pipeline failed: {exc_val}")
            self.pipeline.recover()
        else:
            logging.info("Pipeline completed successfully")
        return False


# Alternative 2: Decorator Pattern (Also Very Pythonic!)
def validate_pipeline(func):
    """Decorator for automatic validation"""
    def wrapper(self, *args, **kwargs):
        result = func(self, *args, **kwargs)
        if hasattr(self, 'ctx'):
            if self.ctx.confidence < 0.5:
                logging.warning("Low confidence detected")
        return result
    return wrapper


# Alternative 3: Generator-based Pipeline (Python Unique!)
def pipeline_generator(intent: str):
    """Using generators for lazy evaluation"""
    ctx = PipelineContext(intent=intent)

    # Each yield is a pipeline step
    ctx.domain = yield "Set domain"
    ctx.template = yield "Set template"

    # Validation
    if not ctx.domain:
        ctx.errors.append("Missing domain")

    yield ctx


# ============================================
# USAGE EXAMPLES
# ============================================

# Example 1: Standard fluent usage (works great!)
async def example_basic():
    result = await (ReflectionPipeline("Create handoff")
        .with_domain("handoff")
        .with_template({"sections": ["summary", "context"]})
        .validate()
        .generate()
        .execute())

    print(f"Result: {result}")


# Example 2: With context manager (Pythonic!)
async def example_context_manager():
    with PipelineContextManager("Start session") as pipeline:
        result = await (pipeline
            .with_domain("start")
            .validate()
            .recover()
            .generate()
            .execute())


# Example 3: List comprehension style (Python specific)
def batch_pipelines(intents: List[str]):
    """Python's list comprehensions make batch processing elegant"""
    pipelines = [
        ReflectionPipeline(intent)
        .with_domain("auto")
        .validate()
        .generate()
        for intent in intents
    ]
    return pipelines


# Example 4: Extension via inheritance
class CustomPRDPipeline(ReflectionPipeline):
    """Python makes extension trivial"""

    def __init__(self, intent: str):
        super().__init__(intent)
        self.with_domain("prd")  # Auto-set domain

    def with_user_stories(self, stories: List[str]) -> 'CustomPRDPipeline':
        """Domain-specific methods"""
        if not self.ctx.context:
            self.ctx.context = {}
        self.ctx.context['user_stories'] = stories
        return self

    def with_pain_points(self, points: List[str]) -> 'CustomPRDPipeline':
        self.ctx.context = self.ctx.context or {}
        self.ctx.context['pain_points'] = points
        return self


# ============================================
# PYTHON-SPECIFIC ADVANTAGES
# ============================================

"""
Python Strengths for This Pattern:

1. **Duck Typing**: No need for interfaces, just works
2. **Clean Syntax**: Method chaining looks natural
3. **Dataclasses**: Perfect for context objects
4. **Type Hints**: Optional but helpful for IDEs
5. **Async/Await**: First-class async support
6. **Context Managers**: Resource safety built-in
7. **Decorators**: Easy to add cross-cutting concerns
8. **Generators**: Lazy evaluation options

IDE Support in Python:
- PyCharm: Excellent autocomplete with type hints
- VSCode + Pylance: Great IntelliSense
- Jupyter: Interactive development perfect for pipelines

Pattern Fit: 9/10 - Nearly perfect for Python
"""

# ============================================
# COMPARISON WITH TYPESCRIPT
# ============================================

"""
Python vs TypeScript for this pattern:

Python Advantages:
+ Cleaner syntax (no 'this' everywhere)
+ Duck typing reduces boilerplate
+ Dataclasses are cleaner than interfaces
+ Context managers for safety
+ Better REPL for testing

TypeScript Advantages:
+ Compile-time type safety
+ Better refactoring tools
+ Interfaces enforce contracts
+ Generic types more powerful

Overall: Python implementation is MORE concise and readable
"""