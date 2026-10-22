import { isDeepStrictEqual } from 'node:util'
import { pathToFileURL } from 'node:url'

// This release preflight may only touch the existing, verified production project.
export const MODEL_TARGET = Object.freeze({
  accountId: '10c8b89168d86ee22c3049f54f3df324',
  project: 'add-some-luck',
  model: 'deepseek-flash',
})

class ModelPreflightError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ModelPreflightError'
    this.code = code
  }
}
const fail = (code) => { throw new ModelPreflightError(code) }
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

export async function configureCloudflareModel(env, { fetcher = globalThis.fetch } = {}) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const projectName = env.CLOUDFLARE_PROJECT_NAME?.trim()
  const token = env.CLOUDFLARE_API_TOKEN?.trim()
  if (accountId !== MODEL_TARGET.accountId || projectName !== MODEL_TARGET.project) fail('unexpected_target')
  if (!token || /\s/.test(token)) fail('missing_or_invalid_credentials')

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${MODEL_TARGET.accountId}/pages/projects/${MODEL_TARGET.project}`
  async function request(method, phase, body) {
    let response
    try {
      response = await fetcher(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    } catch { fail(`${phase}_request_failed`) }
    // Never include upstream response bodies, configuration, or credentials in errors.
    if (!response.ok) fail(`${phase}_http_failed`)
    let payload
    try { payload = await response.json() } catch { fail(`${phase}_invalid_response`) }
    if (payload?.success !== true || !object(payload.result)) fail(`${phase}_invalid_response`)
    const project = payload.result
    if (project.name !== MODEL_TARGET.project || project.subdomain !== `${MODEL_TARGET.project}.pages.dev` || typeof project.id !== 'string' || !project.id) fail(`${phase}_unexpected_project`)
    if (!object(project.deployment_configs) || !object(project.deployment_configs.production) || !object(project.deployment_configs.preview) || !object(project.deployment_configs.production.env_vars)) fail(`${phase}_invalid_configuration`)
    return project
  }

  const before = await request('GET', 'read')
  const expectedConfigs = structuredClone(before.deployment_configs)
  const expectedModel = { type: 'plain_text', value: MODEL_TARGET.model }
  const changed = !isDeepStrictEqual(expectedConfigs.production.env_vars.DEEPSEEK_MODEL, expectedModel)
  expectedConfigs.production.env_vars.DEEPSEEK_MODEL = expectedModel
  if (changed) {
    const productionPatch = { env_vars: { DEEPSEEK_MODEL: expectedModel } }
    if (Object.hasOwn(before.deployment_configs.production, 'wrangler_config_hash')) {
      const hash = before.deployment_configs.production.wrangler_config_hash
      if (hash !== null && typeof hash !== 'string') fail('read_invalid_configuration')
      productionPatch.wrangler_config_hash = hash
    }
    await request('PATCH', 'update', { deployment_configs: { production: productionPatch } })
  }
  const after = await request('GET', 'verify')
  if (after.id !== before.id || !isDeepStrictEqual(after.deployment_configs, expectedConfigs)) fail('verify_unexpected_configuration_change')
  return { project: MODEL_TARGET.project, model: MODEL_TARGET.model, changed }
}

export async function runModelPreflight(env = process.env, { fetcher = globalThis.fetch, log = console.log, error = console.error } = {}) {
  try {
    await configureCloudflareModel(env, { fetcher })
    log('Production DEEPSEEK_MODEL verified as deepseek-flash.')
    return 0
  } catch (cause) {
    const code = cause instanceof ModelPreflightError ? cause.code : 'unexpected_failure'
    error(`Cloudflare production model preflight failed (${code}).`)
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runModelPreflight()
}
