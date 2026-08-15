import { z } from "zod";
import { DEFAULT_PAGE_SIZE, DOMAIN_PATTERN, MAX_PAGE_SIZE } from "./constants.js";

export const domainSchema = z
  .string()
  .regex(DOMAIN_PATTERN, "Must look like a Vinted domain, e.g. 'vinted.com', 'vinted.fr', 'vinted.co.uk'")
  .default("vinted.com")
  .describe(
    "Vinted marketplace domain to query, e.g. 'vinted.com' (US), 'vinted.fr' (France), 'vinted.co.uk' (UK), " +
      "'vinted.de' (Germany). Listings are region-specific. Defaults to 'vinted.com'.",
  );

export const pageSchema = z.number().int().min(1).default(1).describe("1-indexed page number.");

export const perPageSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE)
  .describe(`Results per page (1-${MAX_PAGE_SIZE}).`);
