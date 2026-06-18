import { create } from "zustand";
import type { Doc, SceneObject } from "../models/Doc";

interface DocState {
  doc: Doc | null;
  history: Doc[];
  historyIndex: number;

  // Actions
  loadDoc: (doc: Doc) => void;
  updateObject: (pageIndex: number, objectId: string, updates: Partial<SceneObject>) => void;
  addObject: (pageIndex: number, object: SceneObject) => void;
  deleteObject: (pageIndex: number, objectId: string) => void;

  undo: () => void;
  redo: () => void;
}

export const useDocStore = create<DocState>((set) => ({
  doc: null,
  history: [],
  historyIndex: -1,

  loadDoc: (doc) =>
    set({
      doc,
      history: [doc],
      historyIndex: 0,
    }),

  updateObject: (pageIndex, objectId, updates) =>
    set((state) => {
      if (!state.doc) return state;

      const newPages = state.doc.pages.map((page, i) => {
        if (i !== pageIndex) return page;
        return {
          ...page,
          objects: page.objects.map((obj) =>
            obj.id === objectId ? { ...obj, ...updates } as SceneObject : obj
          ),
        };
      });

      const newDoc = { ...state.doc, pages: newPages };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDoc);

      return {
        doc: newDoc,
        history: newHistory,
        historyIndex: state.historyIndex + 1,
      };
    }),

  addObject: (pageIndex, object) =>
    set((state) => {
      if (!state.doc) return state;

      const newPages = state.doc.pages.map((page, i) => {
        if (i !== pageIndex) return page;
        return {
          ...page,
          objects: [...page.objects, object],
        };
      });

      const newDoc = { ...state.doc, pages: newPages };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDoc);

      return {
        doc: newDoc,
        history: newHistory,
        historyIndex: state.historyIndex + 1,
      };
    }),

  deleteObject: (pageIndex, objectId) =>
    set((state) => {
      if (!state.doc) return state;

      const newPages = state.doc.pages.map((page, i) => {
        if (i !== pageIndex) return page;
        return {
          ...page,
          objects: page.objects.filter((obj) => obj.id !== objectId),
        };
      });

      const newDoc = { ...state.doc, pages: newPages };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newDoc);

      return {
        doc: newDoc,
        history: newHistory,
        historyIndex: state.historyIndex + 1,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        return {
          doc: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        return {
          doc: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    }),
}));
