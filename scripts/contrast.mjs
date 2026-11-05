#!/usr/bin/env node
// tokens.json → docs/contrast.md, the measured table the design contract (DESIGN.md) points to.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastReport } from './lib/contrast-report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const t = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'docs/contrast.md'), contrastReport(t));
