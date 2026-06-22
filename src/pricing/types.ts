/** USD price per 1,000 tokens. */
export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
}

/** Map of model id -> pricing. */
export type ProviderPricing = Record<string, ModelPricing>;

/** Map of provider name -> its models' pricing. */
export type PricingRegistry = Record<string, ProviderPricing>;
