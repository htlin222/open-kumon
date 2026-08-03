/**
 * 進度快照 API。
 *
 * 刻意做成單向：電腦推快照上來，手機讀。不做雙向同步 ——
 * 擁有者要的是「在手機上看孩子今天寫了沒」，不是在手機上操作。
 * 單向少掉衝突解決、少掉一半的失敗模式。
 *
 * 身分來自 Cloudflare Access 的 JWT，不自己做登入。Access 已經擋在最前面，
 * 能打到這裡的請求都已經通過驗證，我們只需要知道「是誰」。
 */

interface Env {
  PROGRESS: KVNamespace
}

/**
 * 以 Pages Functions 形式部署，而不是獨立 Worker。
 * 獨立 Worker 會落在自己的 workers.dev 網域，前端打 /api/progress 到不了它，
 * 而且 Cloudflare Access 的驗證標頭也不會跟著過去。
 * Pages Functions 跟站台同網域，Access 擋在前面，兩個問題一起解決。
 */

/** Access 會把已驗證的 email 放進這個標頭 */
const EMAIL_HEADER = 'cf-access-authenticated-user-email'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
    const email = request.headers.get(EMAIL_HEADER)
    if (!email) {
      // 沒有這個標頭代表沒經過 Access —— 不該發生，但不能默默放行
      return json({ error: 'unauthenticated' }, 401)
    }
    const key = `progress:${email}`

    if (request.method === 'PUT') {
      const body = await request.text()
      // 大小上限：正常快照只有幾 KB，超過就是有問題
      if (body.length > 512 * 1024) return json({ error: 'too large' }, 413)
      try {
        JSON.parse(body)
      } catch {
        return json({ error: 'invalid json' }, 400)
      }
      await env.PROGRESS.put(key, body, { metadata: { at: new Date().toISOString() } })
      return json({ ok: true })
    }

    if (request.method === 'GET') {
      const stored = await env.PROGRESS.get(key)
      if (!stored) return json({ empty: true })
      return new Response(stored, {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      })
    }

    return json({ error: 'method not allowed' }, 405)
}
