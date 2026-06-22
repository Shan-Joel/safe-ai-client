import { createGuard } from "safe-ai-client";

// Set per-1k token rates for each provider/model you use. The provider and model
// strings are just labels you choose — they must match what you pass to `guard.run`.
const guard = createGuard({
  pricing: {
    "your-provider": {
      "your-model": { inputPer1k: 0.001, outputPer1k: 0.002 }, // your negotiated rates
      "your-cheaper-model": { inputPer1k: 0.0002, outputPer1k: 0.0006 },
    },
    "self-hosted": {
      "internal-model": { inputPer1k: 0, outputPer1k: 0 }, // free / internal
    },
  },
});

void guard;
