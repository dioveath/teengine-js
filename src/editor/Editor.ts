import type { Engine } from "../engine/Engine.js";
import type { Entity, EntityId } from "../ecs/Entity.js";
import type { World } from "../ecs/World.js";

export type EditorOptions = {
  engine: Engine;
  world: World;
  root: HTMLElement;
};

/**
 * In-browser editor panel: entity hierarchy, inspector, play/pause.
 */
export class Editor {
  private readonly engine: Engine;
  private readonly world: World;
  private selectedId: EntityId | null = null;
  private playing = true;

  private readonly panel: HTMLElement;
  private readonly hierarchyList: HTMLElement;
  private readonly inspector: HTMLElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly statusLabel: HTMLElement;

  constructor(options: EditorOptions) {
    this.engine = options.engine;
    this.world = options.world;

    this.panel = document.createElement("aside");
    this.panel.id = "editor-panel";
    this.panel.innerHTML = `
      <header class="editor-header">
        <h1>TeEngine</h1>
        <div class="editor-toolbar">
          <button type="button" id="editor-play" aria-pressed="true">Pause</button>
          <span id="editor-status">Playing</span>
        </div>
      </header>
      <section class="editor-section">
        <h2>Hierarchy</h2>
        <ul id="editor-hierarchy" class="editor-list"></ul>
      </section>
      <section class="editor-section">
        <h2>Inspector</h2>
        <div id="editor-inspector" class="editor-inspector">
          <p class="editor-empty">Select an entity</p>
        </div>
      </section>
    `;

    options.root.insertBefore(this.panel, options.root.firstChild);

    this.hierarchyList = this.panel.querySelector("#editor-hierarchy") as HTMLElement;
    this.inspector = this.panel.querySelector("#editor-inspector") as HTMLElement;
    this.playBtn = this.panel.querySelector("#editor-play") as HTMLButtonElement;
    this.statusLabel = this.panel.querySelector("#editor-status") as HTMLElement;

    this.playBtn.addEventListener("click", () => this.togglePlay());
    this.refreshHierarchy();
  }

  get selected(): EntityId | null {
    return this.selectedId;
  }

  select(id: EntityId | null): void {
    this.selectedId = id;
    this.refreshHierarchy();
    this.refreshInspector();
  }

  /** Call each frame to keep UI in sync. */
  update(): void {
    this.refreshHierarchy();
    if (this.selectedId !== null) {
      this.syncInspectorValues();
    }
  }

  private togglePlay(): void {
    this.playing = !this.playing;
    this.engine.setPaused(!this.playing);
    this.playBtn.textContent = this.playing ? "Pause" : "Play";
    this.playBtn.setAttribute("aria-pressed", String(this.playing));
    this.statusLabel.textContent = this.playing ? "Playing" : "Paused";
  }

  private refreshHierarchy(): void {
    this.hierarchyList.replaceChildren();

    for (const entity of this.world.getAll()) {
      const item = document.createElement("li");
      item.className = "editor-list-item";
      if (entity.id === this.selectedId) {
        item.classList.add("selected");
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor-entity-btn";
      btn.textContent = entity.active ? entity.name : `${entity.name} (inactive)`;
      btn.addEventListener("click", () => this.select(entity.id));

      item.appendChild(btn);
      this.hierarchyList.appendChild(item);
    }
  }

  private refreshInspector(): void {
    this.inspector.replaceChildren();

    if (this.selectedId === null) {
      const empty = document.createElement("p");
      empty.className = "editor-empty";
      empty.textContent = "Select an entity";
      this.inspector.appendChild(empty);
      return;
    }

    const entity = this.world.get(this.selectedId);
    if (!entity) {
      this.selectedId = null;
      this.refreshInspector();
      return;
    }

    this.inspector.appendChild(this.buildInspector(entity));
  }

  private buildInspector(entity: Entity): HTMLElement {
    const form = document.createElement("div");
    form.className = "editor-form";

    form.appendChild(this.field("Name", "text", entity.name, (v) => {
      entity.name = v;
    }));

    form.appendChild(this.checkboxField("Active", entity.active, (v) => {
      entity.active = v;
    }));

    form.appendChild(this.sectionHeading("Transform"));
    form.appendChild(this.numberField("X", entity.transform.x, (v) => {
      entity.transform.x = v;
    }));
    form.appendChild(this.numberField("Y", entity.transform.y, (v) => {
      entity.transform.y = v;
    }));
    form.appendChild(this.numberField("Rotation", entity.transform.rotation, (v) => {
      entity.transform.rotation = v;
    }));
    form.appendChild(this.numberField("Scale X", entity.transform.scaleX, (v) => {
      entity.transform.scaleX = v;
    }));
    form.appendChild(this.numberField("Scale Y", entity.transform.scaleY, (v) => {
      entity.transform.scaleY = v;
    }));

    if (entity.spin) {
      form.appendChild(this.sectionHeading("Spin"));
      form.appendChild(this.numberField("Speed", entity.spin.speed, (v) => {
        entity.spin!.speed = v;
      }));
    }

    if (entity.sprite) {
      form.appendChild(this.sectionHeading("Sprite"));
      form.appendChild(this.readOnlyField("Layer", entity.sprite.layer));
    }

    if (entity.rigidBody) {
      form.appendChild(this.sectionHeading("Rigid Body"));
      form.appendChild(this.readOnlyField("Type", entity.rigidBody.type));
    }

    return form;
  }

  private syncInspectorValues(): void {
    const inputs = this.inspector.querySelectorAll<HTMLInputElement>("input[data-field]");
    const entity = this.selectedId !== null ? this.world.get(this.selectedId) : undefined;
    if (!entity) return;

    for (const input of inputs) {
      const field = input.dataset.field;
      if (!field) continue;

      switch (field) {
        case "name":
          input.value = entity.name;
          break;
        case "active":
          input.checked = entity.active;
          break;
        case "x":
          input.value = String(entity.transform.x);
          break;
        case "y":
          input.value = String(entity.transform.y);
          break;
        case "rotation":
          input.value = String(entity.transform.rotation);
          break;
        case "scaleX":
          input.value = String(entity.transform.scaleX);
          break;
        case "scaleY":
          input.value = String(entity.transform.scaleY);
          break;
        case "spinSpeed":
          if (entity.spin) input.value = String(entity.spin.speed);
          break;
      }
    }
  }

  private sectionHeading(text: string): HTMLElement {
    const h = document.createElement("h3");
    h.className = "editor-subheading";
    h.textContent = text;
    return h;
  }

  private field(
    label: string,
    type: string,
    value: string,
    onChange: (value: string) => void,
  ): HTMLElement {
    const row = document.createElement("label");
    row.className = "editor-field";
    row.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    input.dataset.field = label.toLowerCase();
    input.addEventListener("change", () => onChange(input.value));
    row.appendChild(input);
    return row;
  }

  private numberField(
    label: string,
    value: number,
    onChange: (value: number) => void,
  ): HTMLElement {
    const row = document.createElement("label");
    row.className = "editor-field";
    row.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.value = String(value);
    input.dataset.field = label.replace(/\s+/g, "").replace(/^./, (c) => c.toLowerCase());
    if (label === "X") input.dataset.field = "x";
    if (label === "Y") input.dataset.field = "y";
    if (label === "Rotation") input.dataset.field = "rotation";
    if (label === "Scale X") input.dataset.field = "scaleX";
    if (label === "Scale Y") input.dataset.field = "scaleY";
    if (label === "Speed") input.dataset.field = "spinSpeed";
    input.addEventListener("change", () => onChange(Number(input.value)));
    row.appendChild(input);
    return row;
  }

  private checkboxField(
    label: string,
    value: boolean,
    onChange: (value: boolean) => void,
  ): HTMLElement {
    const row = document.createElement("label");
    row.className = "editor-field editor-field-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value;
    input.dataset.field = "active";
    input.addEventListener("change", () => onChange(input.checked));
    row.appendChild(input);
    row.append(` ${label}`);
    return row;
  }

  private readOnlyField(label: string, value: string): HTMLElement {
    const row = document.createElement("div");
    row.className = "editor-field editor-field-readonly";
    row.innerHTML = `<span>${label}</span><span>${value}</span>`;
    return row;
  }
}
