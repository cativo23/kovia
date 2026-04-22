import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('ScoringModule — BullBoardModule.forFeature registration', () => {
  const modulePath = path.join(__dirname, 'scoring.module.ts');
  let source: string;

  beforeEach(() => {
    source = fs.readFileSync(modulePath, 'utf-8');
  });

  it('imports BullBoardModule from @bull-board/nestjs', () => {
    expect(source).toMatch(/from\s+['"]@bull-board\/nestjs['"]/);
  });

  it('imports BullMQAdapter from @bull-board/api/bullMQAdapter', () => {
    expect(source).toMatch(/from\s+['"]@bull-board\/api\/bullMQAdapter['"]/);
  });

  it('registers scoring queue via BullBoardModule.forFeature', () => {
    expect(source).toMatch(/BullBoardModule\.forFeature/);
    expect(source).toMatch(/name:\s*['"]scoring['"]/);
    expect(source).toMatch(/adapter:\s*BullMQAdapter/);
  });
});
