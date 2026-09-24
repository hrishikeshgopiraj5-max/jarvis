/** Read available TTS voices synchronously (empty until the browser loads them). */
export function getVoicesSync(): { name: string; lang: string }[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().map(v => ({ name: v.name, lang: v.lang }));
}

/** Promise-based loader that waits for the browser's async voice list. */
export function loadVoices(): Promise<{ name: string; lang: string }[]> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve([]);
    const immediate = getVoicesSync();
    if (immediate.length > 0) return resolve(immediate);
    const done = () => resolve(getVoicesSync());
    window.speechSynthesis.onvoiceschanged = done;
    setTimeout(done, 800); // fallback if the event never fires
  });
}
