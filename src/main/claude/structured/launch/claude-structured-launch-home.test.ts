import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encodeClaudeProjectPath } from '../../../ai-vault/scanners/claude/claude-project-dir-encoding'
import { claudeLaunchResumesTranscript } from './claude-structured-launch-home'

const SESSION_ID = '0b7c5c3e-6a3f-4c1e-9f3a-2d4b5e6f7a8b'
let root: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'orca-claude-launch-home-')))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function transcriptPath(home: string, cwd: string): string {
  return join(home, 'projects', encodeClaudeProjectPath(cwd), `${SESSION_ID}.jsonl`)
}

function resumes(selectedHome: string, recordHome: string, cwd: string): Promise<boolean> {
  return claudeLaunchResumesTranscript({
    router: {
      accountHomes: () => [recordHome, selectedHome],
      systemDefaultHome: () => join(root, 'system')
    },
    leafUuid: 'leaf',
    providerSessionId: SESSION_ID,
    claudeConfigDir: selectedHome,
    recordHome,
    cwd
  })
}

describe('claudeLaunchResumesTranscript', () => {
  it('brings history from another account into the selected one, which then resumes it', async () => {
    const [accountA, accountB, cwd] = [join(root, 'a'), join(root, 'b'), join(root, 'repo')]
    const source = transcriptPath(accountA, cwd)
    mkdirSync(join(source, '..'), { recursive: true })
    writeFileSync(source, '{"type":"user"}\n')

    await expect(resumes(accountB, accountA, cwd)).resolves.toBe(true)

    expect(readFileSync(transcriptPath(accountB, cwd), 'utf8')).toBe('{"type":"user"}\n')
    expect(readFileSync(source, 'utf8')).toBe('{"type":"user"}\n')
  })
})
