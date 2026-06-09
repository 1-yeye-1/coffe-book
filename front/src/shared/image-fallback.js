const FALLBACK_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#f7f4ee" offset="0"/>
      <stop stop-color="#eadfce" offset="1"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#6f4a2f" offset="0"/>
      <stop stop-color="#d6a354" offset="1"/>
    </linearGradient>
  </defs>
  <rect width="960" height="640" rx="42" fill="url(#bg)"/>
  <circle cx="480" cy="272" r="82" fill="url(#mark)" opacity="0.9"/>
  <path d="M428 284c0 42 34 76 76 76h12c48 0 86-38 86-86v-6h-44v6c0 24-19 42-42 42h-12c-18 0-32-14-32-32v-82h-44v82z" fill="#fff" opacity="0.94"/>
  <rect x="320" y="430" width="320" height="14" rx="7" fill="#6f4a2f" opacity="0.2"/>
  <rect x="380" y="462" width="200" height="10" rx="5" fill="#6f4a2f" opacity="0.16"/>
</svg>`);

export const fallbackImageSrc = `data:image/svg+xml;charset=utf-8,${FALLBACK_SVG}`;

const REMOTE_IMAGE_PATTERN = /^https?:\/\/(?:images|source)\.unsplash\.com\//i;
let installed = false;

function sanitizeImageUrl(value) {
  const nextValue = String(value || "");
  return REMOTE_IMAGE_PATTERN.test(nextValue) ? fallbackImageSrc : nextValue;
}

function patchImageAssignment(root) {
  const imagePrototype = root.HTMLImageElement?.prototype;
  if (!imagePrototype || imagePrototype.datasetFallbackPatched) return;

  const srcDescriptor = Object.getOwnPropertyDescriptor(imagePrototype, "src");
  if (srcDescriptor?.set && srcDescriptor?.get) {
    Object.defineProperty(imagePrototype, "src", {
      configurable: true,
      enumerable: srcDescriptor.enumerable,
      get() {
        return srcDescriptor.get.call(this);
      },
      set(value) {
        srcDescriptor.set.call(this, sanitizeImageUrl(value));
      }
    });
  }

  const originalSetAttribute = imagePrototype.setAttribute;
  imagePrototype.setAttribute = function setImageAttribute(name, value) {
    if (String(name).toLowerCase() === "src") {
      return originalSetAttribute.call(this, name, sanitizeImageUrl(value));
    }
    if (String(name).toLowerCase() === "srcset" && REMOTE_IMAGE_PATTERN.test(String(value || ""))) {
      return originalSetAttribute.call(this, name, "");
    }
    return originalSetAttribute.call(this, name, value);
  };

  Object.defineProperty(imagePrototype, "datasetFallbackPatched", {
    value: "true",
    configurable: false
  });
}

function applyFallback(target) {
  if (!(target instanceof HTMLImageElement)) return;
  if (target.dataset.fallbackApplied === "true") return;
  target.dataset.fallbackApplied = "true";
  target.classList.add("image-placeholder-active");
  target.removeAttribute("srcset");
  target.src = fallbackImageSrc;
}

function shouldUseFallback(target) {
  const src = target.getAttribute("src") || "";
  const currentSrc = target.currentSrc || src;
  return !src || REMOTE_IMAGE_PATTERN.test(src) || REMOTE_IMAGE_PATTERN.test(currentSrc);
}

function scanImages(root) {
  const scope = root?.document || root;
  if (!scope?.querySelectorAll) return;
  scope.querySelectorAll("img").forEach((image) => {
    if (shouldUseFallback(image)) applyFallback(image);
  });
}

export function installImageFallback(root = window) {
  if (installed || !root?.document) return;
  installed = true;
  patchImageAssignment(root);

  root.addEventListener("error", (event) => {
    const target = event.target;
    applyFallback(target);
  }, true);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLImageElement) {
        if (shouldUseFallback(mutation.target)) applyFallback(mutation.target);
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement && shouldUseFallback(node)) applyFallback(node);
        if (node.querySelectorAll) scanImages(node);
      });
    });
  });

  observer.observe(root.document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"]
  });

  scanImages(root);
  root.requestAnimationFrame(() => scanImages(root));
}
