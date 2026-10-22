import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { MODEL_TARGET, configureCloudflareModel, runModelPreflight } from './configure-cloudflare-model.mjs'

const fakeToken = 'test-credential-that-must-never-be-logged'
const otherSecret = 'unrelated-private-config-must-not-be-logged'
const env = { CLOUDFLARE_API_TOKEN: fakeToken, CLOUDFLARE_ACCOUNT_ID: MODEL_TARGET.accountId, CLOUDFLARE_PROJECT_NAME: MODEL_TARGET.project }
const project = () => ({
  id: 'verified-project-id', name: MODEL_TARGET.project, subdomain: `${MODEL_TARGET.project}.pages.dev`,
  deployment_configs: {
    preview: { env_vars: { DEEPSEEK_MODEL: { type: 'plain_text', value: 'preview-model' }, PRIVATE_KEY: { type: 'secret_text', value: otherSecret } }, compatibility_date: '2026-07-16' },
    production: {
      env_vars: { DEEPSEEK_MODEL: { type: 'plain_text', value: 'deepseek-v4-flash' }, DEEPSEEK_API_KEY: { type: 'secret_text', value: otherSecret }, ANOTHER_VAR: { type: 'plain_text', value: 'unchanged' } },
      wrangler_config_hash: 'retain-existing-config-hash', compatibility_date: '2026-07-16', compatibility_flags: ['nodejs_compat'], kv_namespaces: { DATA: { namespace_id: 'unchanged-binding' } },
    },
  },
})
const response = (result) => Response.json({ success: true, result })
function backend(initial = project()) {
  let state = structuredClone(initial)
  const fetcher = vi.fn(async (_url, options) => {
    if (options.method === 'PATCH') {
      const patch = JSON.parse(options.body).deployment_configs.production
      Object.assign(state.deployment_configs.production.env_vars, patch.env_vars)
      if (Object.hasOwn(patch, 'wrangler_config_hash')) state.deployment_configs.production.wrangler_config_hash = patch.wrangler_config_hash
    }
    return response(structuredClone(state))
  })
  return { fetcher, read: () => structuredClone(state), change: (mutate) => mutate(state) }
}

describe('Cloudflare production model preflight (mock API only)', () => {
  it('keeps branch dispatches preflight-only and requires model verification before a main deployment', () => {
    const workflow = readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8')
    expect(workflow).toMatch(/preflight_only:\s+description:[^\n]+\s+type: boolean\s+required: false\s+default: false/)
    expect(workflow).toContain('ref: ${{ github.sha }}')
    expect(workflow).toContain('persist-credentials: false')
    expect(workflow).toMatch(/deploy:\s+needs: configure-model\s+if: \$\{\{ github\.ref == 'refs\/heads\/main' && \(github\.event_name != 'workflow_dispatch' \|\| !inputs\.preflight_only\) \}\}/)
    const configureJob = workflow.split('  configure-model:')[1].split('\n  deploy:')[0]
    expect(configureJob).toContain('node scripts/configure-cloudflare-model.mjs')
    expect(configureJob).not.toMatch(/pnpm install|pnpm build|pages deploy/)
  })
  it('updates only the approved plaintext model, retains the hash, and verifies all environments', async () => {
    const before = project()
    const d = backend(before)
    expect(await configureCloudflareModel(env, d)).toEqual({ project: 'add-some-luck', model: 'deepseek-flash', changed: true })
    expect(d.fetcher.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'PATCH', 'GET'])
    const [url, options] = d.fetcher.mock.calls[1]
    expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/${MODEL_TARGET.accountId}/pages/projects/add-some-luck`)
    expect(options.headers.Authorization).toBe(`Bearer ${fakeToken}`)
    expect(options.redirect).toBe('error')
    expect(JSON.parse(options.body)).toEqual({ deployment_configs: { production: { env_vars: { DEEPSEEK_MODEL: { type: 'plain_text', value: 'deepseek-flash' } }, wrangler_config_hash: 'retain-existing-config-hash' } } })
    expect(options.body).not.toContain(otherSecret)
    const after = d.read()
    before.deployment_configs.production.env_vars.DEEPSEEK_MODEL = { type: 'plain_text', value: 'deepseek-flash' }
    expect(after).toEqual(before)
  })
  it('avoids a needless PATCH when the model is already correct but still verifies the configuration', async () => {
    const initial = project()
    initial.deployment_configs.production.env_vars.DEEPSEEK_MODEL.value = 'deepseek-flash'
    const d = backend(initial)
    expect((await configureCloudflareModel(env, d)).changed).toBe(false)
    expect(d.fetcher.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'GET'])
  })
  it.each([
    { ...env, CLOUDFLARE_ACCOUNT_ID: 'another-account' },
    { ...env, CLOUDFLARE_PROJECT_NAME: 'another-project' },
    { ...env, CLOUDFLARE_PROJECT_NAME: undefined },
    { ...env, CLOUDFLARE_API_TOKEN: '' },
    { ...env, CLOUDFLARE_API_TOKEN: 'invalid\ncredential' },
  ])('rejects an unexpected target or missing credentials before any API request', async (settings) => {
    const d = backend()
    await expect(configureCloudflareModel(settings, d)).rejects.toThrow()
    expect(d.fetcher).not.toHaveBeenCalled()
  })
  it.each(['name', 'subdomain', 'id'])('does not PATCH an unexpected project response (%s)', async (field) => {
    const initial = project()
    initial[field] = field === 'id' ? '' : 'unexpected-project'
    const d = backend(initial)
    await expect(configureCloudflareModel(env, d)).rejects.toThrow('read_unexpected_project')
    expect(d.fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([
    (state) => { state.deployment_configs.preview.env_vars.DEEPSEEK_MODEL.value = 'unexpected' },
    (state) => { state.deployment_configs.production.env_vars.ANOTHER_VAR.value = 'unexpected' },
    (state) => { state.deployment_configs.production.env_vars.DEEPSEEK_API_KEY.value = 'unexpected' },
    (state) => { state.deployment_configs.production.compatibility_date = '2099-01-01' },
    (state) => { state.deployment_configs.production.wrangler_config_hash = 'unexpected' },
    (state) => { state.deployment_configs.production.env_vars.DEEPSEEK_MODEL.type = 'secret_text' },
    (state) => { state.id = 'another-project-id' },
  ])('blocks deployment if any unapproved configuration changes on readback', async (mutate) => {
    const d = backend()
    const fetcher = vi.fn(async (url, options) => {
      if (options.method === 'GET' && fetcher.mock.calls.length === 3) d.change(mutate)
      return d.fetcher(url, options)
    })
    await expect(configureCloudflareModel(env, { fetcher })).rejects.toThrow('verify_unexpected_configuration_change')
  })
  it('preserves an absent optional config hash rather than inventing one', async () => {
    const initial = project()
    delete initial.deployment_configs.production.wrangler_config_hash
    const d = backend(initial)
    await configureCloudflareModel(env, d)
    expect(JSON.parse(d.fetcher.mock.calls[1][1].body).deployment_configs.production).not.toHaveProperty('wrangler_config_hash')
  })
  it.each(['network', 'http', 'invalid-json', 'api-error'])('fails safely without leaking credentials, configuration or upstream errors (%s)', async (failure) => {
    const upstreamDetail = `private response ${fakeToken} ${otherSecret}`
    const fetcher = vi.fn(async () => {
      if (failure === 'network') throw new Error(upstreamDetail)
      if (failure === 'http') return new Response(upstreamDetail, { status: 403 })
      if (failure === 'invalid-json') return new Response(upstreamDetail)
      return Response.json({ success: false, errors: [{ message: upstreamDetail }] })
    })
    const log = vi.fn(), error = vi.fn()
    expect(await runModelPreflight(env, { fetcher, log, error })).toBe(1)
    expect(log).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(error.mock.calls)).not.toContain(fakeToken)
    expect(JSON.stringify(error.mock.calls)).not.toContain(otherSecret)
    expect(JSON.stringify(error.mock.calls)).not.toContain(upstreamDetail)
  })
  it('does not retry or continue after a failed PATCH', async () => {
    const d = backend()
    const fetcher = vi.fn((url, options) => options.method === 'PATCH' ? Promise.resolve(new Response('private update failure', { status: 503 })) : d.fetcher(url, options))
    await expect(configureCloudflareModel(env, { fetcher })).rejects.toThrow('update_http_failed')
    expect(fetcher.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'PATCH'])
  })
  it('prints only a fixed success message, never the API payload', async () => {
    const d = backend(), log = vi.fn(), error = vi.fn()
    expect(await runModelPreflight(env, { fetcher: d.fetcher, log, error })).toBe(0)
    expect(log).toHaveBeenCalledWith('Production DEEPSEEK_MODEL verified as deepseek-flash.')
    expect(error).not.toHaveBeenCalled()
    expect(JSON.stringify(log.mock.calls)).not.toContain(fakeToken)
    expect(JSON.stringify(log.mock.calls)).not.toContain(otherSecret)
  })
})
