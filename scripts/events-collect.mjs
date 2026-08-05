#!/usr/bin/env node
import { collectEvents } from '../automation/collectors/madrid-open-data-agenda.mjs';

const offline = process.argv.includes('--offline');
collectEvents({ offline })
  .then((items) => {
    console.log(
      `OK events:collect — ${items.map((i) => i.sourceId).join(', ')}`,
    );
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
