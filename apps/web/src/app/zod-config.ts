// Imported first by both pages. Zod normally probes for eval (`Function('')`) to compile faster parsers; the pages'
// Content Security Policy forbids eval, and the blocked probe is logged as a console error. Jitless parsing is the
// same parsing without the probe.
import { config } from 'zod';

config({ jitless: true });
