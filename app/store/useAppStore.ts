import { create } from "zustand";

interface Session {
  id: string;
  user_id: string;
  title: string;
}

interface Source {
  PDF: string;
  page: string;
}

interface chatMessage {
  role: "assistant" | "user";
  content: string;
  sources: Source[] | [];
  followUps: string[] | [];
}

interface Doc {
  pdfName: string;
  pdfId: string;
  summary: string;
}

interface AppStore {
  currSessionId: string | null;
  sessions: Session[];
  messages: chatMessage[];
  currSessionDocs: Doc[];
  showSummary: boolean;

  setCurrSessionId: (id: string | null) => void;
  setSessions: (sessions: Session[]) => void;
  setMessages: (messages: chatMessage[]) => void;
  addMessage: (message: chatMessage) => void;
  setCurrSessionDocs: (docs: Doc[]) => void;
  addDoc: (doc: Doc) => void;
  removeDoc: (id: string) => void;
  setShowSummary: (val: boolean) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  currSessionId: null,
  sessions: [],
  messages: [],
  currSessionDocs: [],
  showSummary: false,

  setCurrSessionId: (id) => set({ currSessionId: id }),
  setSessions: (sessions) => set({ sessions }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message: chatMessage) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setCurrSessionDocs: (docs) => set({ currSessionDocs: docs }),
  addDoc: (doc) =>
    set((state) => ({ currSessionDocs: [...state.currSessionDocs, doc] })),
  removeDoc: (id) =>
    set((state) => ({
      currSessionDocs: state.currSessionDocs.filter((doc) => doc.pdfId !== id),
    })),
  setShowSummary: (val) => set({ showSummary: val }),
}));
