type ThemeMode = "auto" | "dark" | "light";

const storedTheme = window.localStorage.getItem("theme") as ThemeMode | null;

function getPreferredTheme(): ThemeMode {
  if (storedTheme) {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme: ThemeMode): void {
  if (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }
}

function showActiveTheme(theme: ThemeMode): void {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const activeThemeIcon = document.querySelector<HTMLElement>("#lkp-theme i")!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const btnToActive = document.querySelector<HTMLButtonElement>(`[data-lkp-theme="${theme}"]`)!;
  const iconOfActiveBtn = btnToActive.dataset.lkpThemeIcon;

  document.querySelectorAll("[data-lkp-theme]").forEach((element) => {
    element.classList.remove("active");
  });

  btnToActive.classList.add("active");
  activeThemeIcon.setAttribute("class", `bi-${iconOfActiveBtn}`);
}

setTheme(getPreferredTheme());

export function useThemes(): void {
  window.addEventListener("DOMContentLoaded", () => {
    showActiveTheme(getPreferredTheme());

    document.querySelectorAll<HTMLButtonElement>("[data-lkp-theme]").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const theme = toggle.getAttribute("data-lkp-theme") as ThemeMode;
        localStorage.setItem("theme", theme);
        setTheme(theme);
        showActiveTheme(theme);
      });
    });
  });
}
