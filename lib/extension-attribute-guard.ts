/**
 * Browser extensions can modify the server rendered HTML before React hydrates.
 * The "Bis" skin extension family injects private attributes such as
 * `bis_skin_checked` and `bis_register` into every element it inspects, which
 * makes React report:
 *
 *   "A tree hydrated but some attributes of the server rendered HTML didn't match"
 *
 * Those attributes are never rendered by this application, so they are removed
 * from the document before hydration and whenever they are injected afterwards.
 * The script stays inert when no extension is present.
 */
export const EXTENSION_ATTRIBUTE_NAMES = ['bis_skin_checked', 'bis_register'] as const;

export const extensionAttributeGuard = `
(function () {
  var names = ${JSON.stringify([...EXTENSION_ATTRIBUTE_NAMES])};
  var selector = names.map(function (name) { return "[" + name + "]"; }).join(",");

  function clean(node) {
    if (!node || node.nodeType !== 1) return;
    for (var i = 0; i < names.length; i += 1) {
      if (node.hasAttribute(names[i])) node.removeAttribute(names[i]);
    }
  }

  function sweep(root) {
    var scope = root && root.nodeType === 1 ? root : document.documentElement;
    if (!scope || !scope.querySelectorAll) return;
    clean(scope);
    var hits = scope.querySelectorAll(selector);
    for (var i = 0; i < hits.length; i += 1) clean(hits[i]);
  }

  function watch() {
    var root = document.documentElement;
    if (!root) return false;
    sweep(root);
    if (typeof MutationObserver !== "function") return true;
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i += 1) {
        var record = records[i];
        if (record.type === "attributes") clean(record.target);
        else {
          for (var j = 0; j < record.addedNodes.length; j += 1) {
            if (record.addedNodes[j].nodeType === 1) sweep(record.addedNodes[j]);
          }
        }
      }
    }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: names });
    return true;
  }

  if (watch()) {
    // Catch attributes injected while the document was still being parsed.
    document.addEventListener("DOMContentLoaded", function () { sweep(document); }, { once: true });
  } else {
    document.addEventListener("DOMContentLoaded", function () { watch(); }, { once: true });
  }

  window.addEventListener("error", function (event) {
    if (typeof event.filename === "string" && event.filename.indexOf("chrome-extension://") === 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var stack = reason && typeof reason.stack === "string" ? reason.stack : "";
    if (stack.indexOf("chrome-extension://") !== -1) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
`;
