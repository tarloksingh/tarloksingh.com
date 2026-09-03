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
     the modern API is actually present.

     The field is real: on screen, in the viewport, not `opacity: 0` and not
     `pointer-events: none`. Browsers decline to copy a selection out of
     something they consider invisible, and the invisible version of this is a
     copy that reports success and puts nothing on the clipboard. One pixel in
     the corner is invisible enough. */
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.cssText =
      'position:fixed;left:0;bottom:0;width:1px;height:1px;padding:0;border:0;margin:0;' +
      'font-size:16px;color:transparent;background:transparent;z-index:-1'
    document.body.append(field)
    field.focus()
    field.select()
    field.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  } catch {
    return false
  }
}
