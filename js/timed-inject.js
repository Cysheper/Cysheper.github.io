(() => {
  const rules = window.__timedInjectRules__ || []
  if (!Array.isArray(rules) || !rules.length) return

  const normalizePoint = (point) => {
    if (!point) return null
    if (Array.isArray(point)) {
      const merged = point.reduce((acc, item) => {
        if (item && typeof item === 'object') Object.assign(acc, item)
        return acc
      }, {})
      point = merged
    }
    if (!point || typeof point !== 'object') return null
    const month = Number(point.month)
    const day = Number(point.day)
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return { month, day }
  }

  const toDayOfYear = (month, day) => {
    const d = new Date(new Date().getFullYear(), month - 1, day)
    const start = new Date(d.getFullYear(), 0, 1)
    return Math.floor((d - start) / 86400000) + 1
  }

  const inDateRange = (todayPoint, startPoint, endPoint) => {
    const todayDOY = toDayOfYear(todayPoint.month, todayPoint.day)
    const startDOY = toDayOfYear(startPoint.month, startPoint.day)
    const endDOY = toDayOfYear(endPoint.month, endPoint.day)
    if (startDOY <= endDOY) return todayDOY >= startDOY && todayDOY <= endDOY
    return todayDOY >= startDOY || todayDOY <= endDOY
  }

  const extractScriptSrc = (scriptLike) => {
    if (!scriptLike) return ''
    if (typeof scriptLike !== 'string') {
      if (typeof scriptLike === 'object') {
        if (scriptLike.src) return String(scriptLike.src).trim()
        if (scriptLike.path) return String(scriptLike.path).trim()
      }
      return ''
    }
    let value = scriptLike.trim()
    if (!value) return ''
    value = value.replace(/^['"]+|['"]+$/g, '')
    value = value.replace(/%22/gi, '')
    value = value.replace(/["']/g, '')
    value = value.replace(/\/+$/, '')

    const srcMatch = value.match(/<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1]
        .trim()
        .replace(/^['"]+|['"]+$/g, '')
        .replace(/%22/gi, '')
        .replace(/["']/g, '')
        .replace(/\/+$/, '')
    }
    return value
  }

  const toAbsoluteSrc = (src) => {
    if (!src) return ''
    let normalized = src.trim().replace(/^['"]+|['"]+$/g, '')
    normalized = normalized.replace(/%22/gi, '')
    normalized = normalized.replace(/["']/g, '')
    try {
      normalized = decodeURIComponent(normalized)
    } catch (e) {
      // ignore decode errors
    }
    normalized = normalized.replace(/%22/gi, '')
    normalized = normalized.replace(/["']/g, '')
    normalized = normalized.replace(/\/+$/, '')
    if (/^(https?:)?\/\//i.test(normalized)) return normalized
    return '/' + normalized.replace(/^\/+/, '')
  }

  const load = () => {
    const now = new Date()
    const today = {
      month: now.getMonth() + 1,
      day: now.getDate()
    }

    const matched = rules.find((rule) => {
      const start = normalizePoint(rule && rule.start)
      const end = normalizePoint(rule && rule.end)
      if (!start || !end) return false
      return inDateRange(today, start, end)
    })
    if (!matched) return

    const scriptList = []
    if (Array.isArray(matched.scripts)) scriptList.push(...matched.scripts)
    if (matched.script) scriptList.push(matched.script)

    scriptList.forEach((raw) => {
      const src = extractScriptSrc(raw)
      if (!src) return
      const abs = toAbsoluteSrc(src)
      if (!abs) return
      const safeSrc = abs.replace(/%22/gi, '').replace(/["']/g, '')
      if (document.querySelector(`script[data-timed-src="${safeSrc}"]`)) return

      const s = document.createElement('script')
      s.src = safeSrc
      s.setAttribute('data-pjax', '')
      s.setAttribute('data-timed-src', safeSrc)
      document.body.appendChild(s)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load)
  } else {
    load()
  }
  document.addEventListener('pjax:complete', load)
})()
