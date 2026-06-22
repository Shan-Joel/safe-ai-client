import { createGuard, builtInPricing } from "safe-ai-client";

// Override or extend the built-in (estimated) pricing snapshot.
const guard = createGuard({
  pricing: {
    ...builtInPricing,
    openai: {
      ...builtInPricing.openai,
      "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 }, // your negotiated rates
    },
    "my-self-hosted": {
      "llama-3.1-70b": { inputPer1k: 0, outputPer1k: 0 }, // free / internal
    },
  },
});

void guard;
