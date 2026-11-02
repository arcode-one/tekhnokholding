const mounted = new WeakMap();

/** A failed enhancement is isolated; HTML stays readable and sibling blocks still mount. */
export function mount(element, name, initialize) {
  let names = mounted.get(element);
  if (!names) mounted.set(element, (names = new Set()));
  if (names.has(name)) return;
  names.add(name);
  try {
    initialize(element);
  } catch (error) {
    // Do not re-run a partially mounted block and duplicate its event listeners.
    console.error(`Block ${name}:`, error);
  }
}

export async function loadBlocks(selector, name, load) {
  const elements = [...document.querySelectorAll(selector)];
  if (!elements.length) return;
  try {
    const { default: initialize } = await load();
    elements.forEach((element) => mount(element, name, initialize));
  } catch (error) {
    console.error(`Module ${name}:`, error);
  }
}
