import { join } from 'node:path'
import type { ClaudeProfileRouter } from '../../../claude-accounts/profiles/routing/claude-profile-router'
import { AgentSessionPreSpawnError } from '../../../native-chat/agent-session-wire/providers/structured-agent-session-adapter-errors'
import { resolveSessionFilePath } from '../../../native-chat/session-file-resolver'
import { moveClaudeTranscriptIntoAccountHome } from '../../transcripts/claude-transcript-account-move'
import { prepareClaudeLaunchAccount } from './claude-launch-account'

/** Follow the current account selection and pin its environment for this launch. */
export async function resolveClaudeStructuredLaunchHome(
  router: ClaudeProfileRouter | undefined,
  env: Record<string, string>,
  recordHome: string
): Promise<string> {
  return (await prepareClaudeLaunchAccount(router, env, recordHome)).home
}

async function claudeTranscriptExists(input: {
  providerSessionId: string
  claudeConfigDir: string
  cwd?: string
}): Promise<boolean> {
  const path = await resolveSessionFilePath('claude', input.providerSessionId, {
    claudeProjectsDir: join(input.claudeConfigDir, 'projects'),
    cwd: input.cwd
  })
  return path !== null
}

/** A stored leaf implies resume; history in another account is brought along, refused only when it can't be. */
export async function claudeLaunchResumesTranscript(input: {
  router: Pick<ClaudeProfileRouter, 'accountHomes' | 'systemDefaultHome'> | undefined
  leafUuid: string | null
  providerSessionId: string
  claudeConfigDir: string
  recordHome: string
  /** The launch cwd; Claude keeps its transcript in this folder's project bucket. */
  cwd?: string
  hasTranscript?: typeof claudeTranscriptExists
}): Promise<boolean> {
  const { router, providerSessionId, claudeConfigDir, cwd } = input
  if (!router && input.leafUuid !== null) {
    return true
  }
  const hasTranscript = input.hasTranscript ?? claudeTranscriptExists
  if (await hasTranscript({ providerSessionId, claudeConfigDir, cwd })) {
    return true
  }
  if (input.leafUuid === null) {
    return false
  }
  const otherHomes = router
    ? [input.recordHome, ...router.accountHomes(), router.systemDefaultHome()]
    : []
  for (const home of otherHomes.filter((home) => home !== claudeConfigDir)) {
    if (!(await hasTranscript({ providerSessionId, claudeConfigDir: home, cwd }))) {
      continue
    }
    try {
      const args = { sessionId: providerSessionId, fromHome: home, toHome: claudeConfigDir, cwd }
      if (await moveClaudeTranscriptIntoAccountHome(args)) {
        return true
      }
    } catch (error) {
      // E.g. a different file already holds the transcript's name in the selected account.
      throw new AgentSessionPreSpawnError(error, { reason: 'historyInOtherAccount' })
    }
  }
  // A stored leaf still requires resume when its transcript folder is no longer known.
  return true
}
