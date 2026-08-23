/* Copying, from wherever the page happens to be served.

   `navigator.clipboard` only exists in a secure context — HTTPS, or localhost.
   The dev server here is reachable over the tailnet by IP and by MagicDNS
   name, which is neither, so on the machine most likely to be *using* these
   copy buttons the modern API is simply not there. Written as
   `navigator.clipboard?.writeText(...)`, that is a button that does nothing
   and says nothing, which is exactly what it looked like.

   So: the real API where it exists, the old `execCommand` where it does not,
   and an honest `false` if neither worked, so the caller can put the text on
   screen and let a human copy it. Never fails silently. */

export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* denied, or no permission — fall through to the old way */
    }
  }

  /* Deprecated, synchronous, and works on plain http. It has to run inside the
     gesture that asked for it, which is why nothing above is awaited unless
     the modern API is actually present. */
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
    document.body.append(field)
    field.select()
    field.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  } catch {
    return false
  }
}
