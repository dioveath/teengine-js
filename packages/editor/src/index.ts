import type { Project } from "@teengine/core";

export type EditorHooks = {
  play(): void;
  stop(): void;
};

export function mountEditor(host: HTMLElement, project: Project, hooks: EditorHooks): () => void {
  const root = document.createElement("div");
  root.style.cssText = "font:13px/1.4 ui-sans-serif,system-ui;display:flex;flex-direction:column;gap:8px;padding:12px;min-width:240px";

  const title = document.createElement("strong");
  const list = document.createElement("ul");
  list.style.cssText = "margin:0;padding-left:16px";
  const play = document.createElement("button");
  play.textContent = "Play";
  play.onclick = () => hooks.play();
  const stop = document.createElement("button");
  stop.textContent = "Stop";
  stop.onclick = () => hooks.stop();
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px";
  actions.append(play, stop);

  const render = (): void => {
    const doc = project.document;
    title.textContent = doc.meta.title;
    list.replaceChildren();
    const scene = doc.scenes.find((s) => s.id === doc.startScene) ?? doc.scenes[0];
    for (const entity of scene?.entities ?? []) {
      const item = document.createElement("li");
      item.textContent = `${entity.id} (${entity.transform?.x ?? 0}, ${entity.transform?.y ?? 0})`;
      list.append(item);
    }
  };

  render();
  const unsub = project.subscribe(render);
  root.append(title, actions, list);
  host.append(root);
  return () => {
    unsub();
    root.remove();
  };
}
