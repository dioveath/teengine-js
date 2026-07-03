const searchInput = document.getElementById("search");
const library = document.getElementById("library");
const countEl = document.getElementById("count");
const filterButtons = document.querySelectorAll<HTMLButtonElement>(".nav button[data-filter]");

let activeFilter = "all";

function applyFilters(): void {
  if (!library) return;

  const query = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";
  const cards = library.querySelectorAll<HTMLElement>(".game-card");
  let visible = 0;

  for (const card of cards) {
    const title = card.dataset.title ?? "";
    const tags = card.dataset.tags ?? "";
    const matchesFilter = activeFilter === "all" || tags.includes(activeFilter);
    const matchesSearch = query === "" || title.includes(query) || tags.includes(query);
    const show = matchesFilter && matchesSearch;
    card.classList.toggle("hidden", !show);
    if (show) visible++;
  }

  if (countEl) {
    countEl.textContent = `${visible} title${visible === 1 ? "" : "s"}`;
  }
}

if (searchInput instanceof HTMLInputElement) {
  searchInput.addEventListener("input", applyFilters);
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    for (const b of filterButtons) {
      b.classList.remove("active");
    }
    button.classList.add("active");
    activeFilter = button.dataset.filter ?? "all";
    applyFilters();
  });
}

applyFilters();
