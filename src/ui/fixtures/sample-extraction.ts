import type { Extraction } from '../../shared/contracts';
import json from '../../fixtures/sample-extraction.json';

// S2's recorded /api/extract run on the sample plan; used by ?fixture=1 so the UI runs with no API.
export const SAMPLE_EXTRACTION = json as Extraction;
