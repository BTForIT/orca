import { basename, dirname, join } from 'node:path'
import { installRollout } from '../../codex/history/resume/codex-legacy-session-resume'
import { resolveSessionFilePath } from '../../native-chat/session-file-resolver'

/** Claude resumes a session only from a transcript in its own config folder, so a chat moving
 *  accounts brings its transcript along first. False when `fromHome` holds no transcript. */
export async function moveClaudeTranscriptIntoAccountHome(args: {
  sessionId: string
  fromHome: string
  toHome: string
  cwd?: string
}): Promise<boolean> {
  const found = await resolveSessionFilePath('claude', args.sessionId, {
    claudeProjectsDir: join(args.fromHome, 'projects'),
    cwd: args.cwd,
    strictErrors: true
  })
  if (!found) {
    return false
  }
  // <home>/projects/<bucket>/<id>.jsonl; the same bucket name, so long-path hashes carry over.
  const bucket = basename(dirname(found))
  await installRollout(found, join(args.toHome, 'projects', bucket, basename(found)))
  return true
}
