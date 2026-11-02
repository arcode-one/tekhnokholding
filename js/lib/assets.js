const pending = new Map();

/** Shared by repeated map instances; each third-party resource is requested once. */
export function loadAsset(url, type) {
  if (!pending.has(url)) {
    pending.set(
      url,
      new Promise((resolve, reject) => {
        const element = document.createElement(type === 'css' ? 'link' : 'script');
        if (type === 'css') {
          element.rel = 'stylesheet';
          element.href = url;
        } else element.src = url;
        element.onload = resolve;
        element.onerror = () => {
          pending.delete(url);
          element.remove();
          reject(new Error(`Cannot load ${url}`));
        };
        document.head.append(element);
      }),
    );
  }
  return pending.get(url);
}
