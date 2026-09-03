import { useEffect } from 'react'

const STORAGE_KEY = 'intro-effects-controls'

type Group = Record<string, unknown>

function read(): Record<string, Group> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

let cache = read()

// Schemas are built once per group and handed back by identity thereafter. Leva
// reads the schema on every render, so returning a fresh object each time risks
// feeding it a stale value mid-drag and fighting the slider.
const built = new Map<string, unknown>()

/**
 * Patches saved values back into a Leva schema as its defaults. The shape is
 * unchanged, so Leva's inference still sees the literal and `useControls` keeps
 * returning a precisely-typed object.
 */
export function restoreSchema<T extends Record<string, unknown>>(group: string, schema: T): T {
  const memo = built.get(group)
  if (memo) return memo as T

  const saved = cache[group] ?? {}
  const restored: Record<string, unknown> = {}

  for (const [key, definition] of Object.entries(schema)) {
    const value = saved[key]

    if (value === undefined) {
      restored[key] = definition
    } else if (definition !== null && typeof definition === 'object') {
      // Objects with a `value` are normal inputs; anything else (a button) is
      // a special input with nothing to restore.
      restored[key] = 'value' in definition ? { ...definition, value } : definition
    } else {
      // A bare primitive default, e.g. `starColor: '#ffb347'`.
      restored[key] = value
    }
  }

  built.set(group, restored)
  return restored as T
}

/** Writes a control group back to storage whenever it changes. */
export function usePersistControls(group: string, values: Record<string, unknown>) {
  const serialised = JSON.stringify(values)

  useEffect(() => {
    cache = { ...cache, [group]: JSON.parse(serialised) }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch {
      // storage full or blocked — controls still work, they just won't stick
    }
  }, [group, serialised])
}

/**
 * Saved settings as one JSON blob, for copying out. Pass group names to export
 * only those; omit for everything.
 */
export function exportPersistedControls(groups?: string[]) {
  if (!groups) return JSON.stringify(cache, null, 2)
  const subset: Record<string, Group> = {}
  for (const group of groups) {
    if (cache[group]) subset[group] = cache[group]
  }
  return JSON.stringify(subset, null, 2)
}

export function clearPersistedControls() {
  cache = {}
  built.clear()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to do
  }
}
