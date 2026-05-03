(() => {
  const rules = window.__timedInjectRules__ || []
  const EMPTY_RULE_WEIGHT = 0.2
  const ACTIVE_SCRIPT_KEY = '__timedInjectActiveScript__'
  const RESOLVED_KEY = '__timedInjectResolved__'
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

  const normalizeProbability = (value) => {
    if (value === undefined || value === null || value === '') return 1
    const probability = Number(value)
    if (!Number.isFinite(probability)) return 1
    if (probability <= 0) return 0
    if (probability >= 1) return 1
    return probability
  }

  const appendScriptItems = (list, value) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach((item) => appendScriptItems(list, item))
      return
    }
    list.push(value)
  }

  const normalizeScriptItem = (value) => {
    if (!value) return null
    if (typeof value === 'string') {
      return {
        src: extractScriptSrc(value),
        probability: 1
      }
    }
    if (typeof value === 'object') {
      return {
        src: extractScriptSrc(value),
        probability: normalizeProbability(value.probability)
      }
    }
    return null
  }

  const isUniverseScript = (src) => /(?:^|\/)universe\.js(?:$|\?)/i.test(src || '')

  const ensureDarkMode = () => {
    if (document.documentElement.getAttribute('data-theme') === 'dark') return

    const darkmodeButton = document.getElementById('darkmode')
    if (darkmodeButton) {
      darkmodeButton.click()
      return
    }

    if (window.btf && typeof window.btf.activateDarkMode === 'function') {
      window.btf.activateDarkMode()
      if (window.btf.saveToLocal && typeof window.btf.saveToLocal.set === 'function') {
        window.btf.saveToLocal.set('theme', 'dark', 2)
      }
    }
  }

  const pickWeightedItem = (items, getWeight) => {
    if (!Array.isArray(items) || !items.length) return null

    const normalizedItems = items
      .map((item) => ({
        item,
        weight: normalizeProbability(getWeight(item))
      }))
      .filter((entry) => entry.weight > 0)

    if (!normalizedItems.length) return null

    const totalWeight = normalizedItems.reduce((sum, entry) => sum + entry.weight, 0)
    if (totalWeight <= 0) return null

    let random = Math.random() * totalWeight
    for (const entry of normalizedItems) {
      random -= entry.weight
      if (random < 0) return entry.item
    }

    return normalizedItems[normalizedItems.length - 1].item
  }

  const pickRule = (items) => {
    const candidates = [...items, { __empty: true, probability: EMPTY_RULE_WEIGHT }]
    return pickWeightedItem(candidates, (item) => item && item.probability)
  }

  const pickScript = (items) => {
    const normalizedItems = items
      .map((item) => normalizeScriptItem(item))
      .filter((item) => item && item.src)

    if (!normalizedItems.length) return null
    if (normalizedItems.length === 1) {
      const onlyItem = normalizedItems[0]
      return Math.random() < onlyItem.probability ? onlyItem : null
    }

    return pickWeightedItem(normalizedItems, (item) => item && item.probability)
  }

  const getInjectedScript = (src) => document.querySelector(`script[data-timed-src="${src}"]`)

  const load = () => {
    if (window[RESOLVED_KEY]) {
      const activeScript = window[ACTIVE_SCRIPT_KEY]
      const existingScript = activeScript ? getInjectedScript(activeScript) : null
      if (existingScript && existingScript.hasAttribute('data-pjax')) {
        existingScript.removeAttribute('data-pjax')
      }
      if (activeScript && isUniverseScript(activeScript)) ensureDarkMode()
      return
    }

    const now = new Date()
    const today = {
      month: now.getMonth() + 1,
      day: now.getDate()
    }

    const matchedRules = rules.filter((rule) => {
      const start = normalizePoint(rule && rule.start)
      const end = normalizePoint(rule && rule.end)
      if (!start || !end) return false
      return inDateRange(today, start, end)
    })
    const matched = pickRule(matchedRules)
    if (!matched) {
      window[RESOLVED_KEY] = true
      window[ACTIVE_SCRIPT_KEY] = ''
      return
    }
    if (matched.__empty) {
      window[RESOLVED_KEY] = true
      window[ACTIVE_SCRIPT_KEY] = ''
      return
    }

    const scriptList = []
    appendScriptItems(scriptList, matched.scripts)
    appendScriptItems(scriptList, matched.script)

    const selectedScript = pickScript(scriptList)
    if (!selectedScript) {
      window[RESOLVED_KEY] = true
      window[ACTIVE_SCRIPT_KEY] = ''
      return
    }

    const abs = toAbsoluteSrc(selectedScript.src)
    if (!abs) {
      window[RESOLVED_KEY] = true
      window[ACTIVE_SCRIPT_KEY] = ''
      return
    }
    const safeSrc = abs.replace(/%22/gi, '').replace(/["']/g, '')
    const shouldEnableDarkMode = isUniverseScript(safeSrc)
    window[RESOLVED_KEY] = true
    window[ACTIVE_SCRIPT_KEY] = safeSrc
    const existingScript = getInjectedScript(safeSrc)
    if (existingScript) {
      if (existingScript.hasAttribute('data-pjax')) {
        existingScript.removeAttribute('data-pjax')
      }
      if (shouldEnableDarkMode) ensureDarkMode()
      return
    }

    const s = document.createElement('script')
    s.src = safeSrc
    s.setAttribute('data-timed-src', safeSrc)
    if (shouldEnableDarkMode) {
      s.addEventListener('load', ensureDarkMode, { once: true })
    }
    document.body.appendChild(s)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load)
  } else {
    load()
  }
  document.addEventListener('pjax:complete', load)
})()
