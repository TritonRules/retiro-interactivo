#!/usr/bin/env node
import { buildEvents } from '../automation/reports/build-events.mjs';

const offline = process.argv.includes('--offline');
buildEvents({ offline }).catch((error) => {
  console.error(error);
  process.exit(1);
});
