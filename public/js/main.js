const tabButtons = Array.from(document.querySelectorAll("[data-command-tab]"));
const tabPanels = Array.from(document.querySelectorAll("[data-command-panel]"));
const copyButtons = Array.from(document.querySelectorAll("[data-copy-target]"));
const revealNodes = Array.from(document.querySelectorAll(".reveal"));
const yearNode = document.getElementById("currentYear");
const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.getElementById("site-nav");
const mobileNavBreakpoint = 720;

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const activateTab = (name) => {
  for (const button of tabButtons) {
    const isActive = button.dataset.commandTab === name;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }

  for (const panel of tabPanels) {
    const isActive = panel.dataset.commandPanel === name;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  }
};

for (const button of tabButtons) {
  button.addEventListener("click", () => activateTab(button.dataset.commandTab));
}

const copyText = async (targetId, button) => {
  const node = document.getElementById(targetId);
  if (!node) {
    return;
  }

  try {
    await navigator.clipboard.writeText(node.innerText.trim());
    const original = button.textContent;
    button.textContent = "Copied";
    button.classList.add("is-done");

    window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove("is-done");
    }, 1400);
  } catch (_error) {
    button.textContent = "Copy failed";
  }
};

for (const button of copyButtons) {
  button.addEventListener("click", () => {
    copyText(button.dataset.copyTarget, button);
  });
}

const closeMobileNav = () => {
  if (!navToggle || !siteNav) {
    return;
  }

  navToggle.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("is-open");
  document.body.classList.remove("menu-open");
};

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isExpanded));
    siteNav.classList.toggle("is-open", !isExpanded);
    document.body.classList.toggle("menu-open", !isExpanded);
  });

  for (const link of siteNav.querySelectorAll("a")) {
    link.addEventListener("click", () => {
      closeMobileNav();
    });
  }

  document.addEventListener("click", (event) => {
    if (window.innerWidth > mobileNavBreakpoint) {
      return;
    }

    if (!siteNav.classList.contains("is-open")) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !siteNav.contains(target) && !navToggle.contains(target)) {
      closeMobileNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > mobileNavBreakpoint) {
      closeMobileNav();
    }
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  for (const node of revealNodes) {
    observer.observe(node);
  }
} else {
  for (const node of revealNodes) {
    node.classList.add("is-visible");
  }
}
