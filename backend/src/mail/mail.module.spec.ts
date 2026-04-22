import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('MailModule — BullBoardModule.forFeature registration', () => {
  const modulePath = path.join(__dirname, 'mail.module.ts');
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

  it('registers emails-auth queue via BullBoardModule.forFeature', () => {
    expect(source).toMatch(/name:\s*['"]emails-auth['"]/);
    const forFeatureMatches = source.match(/BullBoardModule\.forFeature/g);
    expect(forFeatureMatches).toBeTruthy();
    expect(forFeatureMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('registers emails-transactional queue via BullBoardModule.forFeature', () => {
    expect(source).toMatch(/name:\s*['"]emails-transactional['"]/);
  });

  it('has exactly 2 BullBoardModule.forFeature calls (one per email queue)', () => {
    const matches = source.match(/BullBoardModule\.forFeature/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBe(2);
  });
});
