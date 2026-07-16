"use client";
import { Edit, Menu, TextAlignStart, X } from "lucide-react";
import ChatComponent from "./chat";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import FileUpload from "./file-upload";
import { useAppStore } from "../store/useAppStore";
import toast from "react-hot-toast";

interface oneHistoryMsg {
  content: string;
  createdAt: string;
  id: string;
  role: "assistant" | "user";
  sessionId: "string";
  sources: string;
  userId: string;
  followUps: string;
}
interface Session {
  id: string;
  user_id: string;
  title: string;
}

export default function Main() {
  const { getToken } = useAuth();
  const {
    currSessionDocs,
    setCurrSessionDocs,
    sessions,
    setSessions,
    currSessionId,
    setCurrSessionId,
    setMessages,
    removeDoc,
    showSummary,
    setShowSummary,
  } = useAppStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [specificSummary, setSpecificSummary] = useState<string>("");
  const [showSpecificSummary, setShowSpecificSummary] =
    useState<boolean>(false);

  const fetchSessDocs = async (currSessionId: string) => {
    const token = await getToken();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/sessions/docs/${currSessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) {
      const data = await response.json();
      const errorMessage = data.error;
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.docs;
  };

  const fetchSessions = async (attempt = 0) => {
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/sessions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      const errorMessage = data.error;
      throw new Error(errorMessage);
    }
    const data = await res.json();
    if (data.sessions.length === 0 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500));
      return fetchSessions(attempt + 1); // retry up to 3 times
    }
    setSessions(data.sessions);
    const saved = localStorage.getItem("currSessionId");
    const savedExists = data.sessions.some((s: Session) => s.id === saved);
    const nextId = savedExists ? saved : (data.sessions[0]?.id ?? null);
    setCurrSessionId(nextId);
    if (nextId) localStorage.setItem("currSessionId", nextId);
  };

  const fetchChat = async (currSessionId: string) => {
    const token = await getToken();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/sessions/${currSessionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) {
      const data = await response.json();
      const errorMessage = data.error;
      throw new Error(errorMessage);
    }
    const data = await response.json();
    const history = data.messages;
    const messages = history.map((h: oneHistoryMsg) => ({
      role: h.role,
      content: h.content,
      sources: JSON.parse(h.sources),
      followUps: JSON.parse(h.followUps),
    }));
    setMessages(messages);
  };

  useEffect(() => {
    fetchSessions().catch((e) => toast.error(e.message));
    setShowSummary(false);
  }, []);

  useEffect(() => {
    if (currSessionId === null) return;
    fetchChat(currSessionId).catch((e) => toast.error(e.message));
    fetchSessDocs(currSessionId)
      .then((docs) => {
        setCurrSessionDocs(docs);
      })
      .catch((e) => toast.error(e.message));
    setShowSummary(false);
  }, [currSessionId, getToken]); // on a page refresh, component mounts with current sessionId.

  const handleTitleClick = async (sessionId: string) => {
    const toastId = toast.loading("Fetching chat messages...");
    setCurrSessionId(sessionId);
    localStorage.setItem("currSessionId", sessionId);
    try {
      await fetchChat(sessionId);
      setShowSidebar(false);
      toast.success("Here you go!", { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couln't load chat: ${msg}`, { id: toastId });
    }
  };

  const handleNewChatClick = async () => {
    try {
      const title = prompt("Enter a name for your new chat session:");
      if (title === null) return;
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/sessions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title === "" ? `Convo ${sessions.length + 1}` : title,
          }),
        },
      );
      const data = await response.json();
      const sessId = data.session[0].id;
      setCurrSessionId(sessId);
      localStorage.setItem("currSessionId", sessId);
      await fetchSessions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Something went wrong: ${msg}`);
    }
  };

  const handleDeletePDFPerSession = async (
    currSessionId: string,
    docId: string,
  ) => {
    const toastId = toast.loading("Deleting PDF...");
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/upload/pdf`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: currSessionId, docId }),
        },
      );
      const data = await response.json();
      const id = data.idOfDeletedDoc;
      removeDoc(id);
      toast.success("PDF Deleted", { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't delete PDF: ${msg}`, { id: toastId });
    }
  };

  const handleEditTitle = async (sessionId: string) => {
    let newTitle = prompt("Type in the new title");
    if (newTitle === null) return;
    while (newTitle === "")
      newTitle = prompt("Title can't be empty, type in the new title");
    const toastId = toast.loading("Updating the title...");
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/sessions/${sessionId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newTitle }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error;
        toast.error(errorMessage, { id: toastId });
        return;
      }
      const S = JSON.parse(JSON.stringify(sessions));
      for (let i = 0; i < S.length; i += 1)
        if (S[i].id === sessionId) S[i].title = newTitle;
      setSessions(S);
      toast.success("Title updated", { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Something went wrong: ${msg}`, { id: toastId });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    let userConfirmation = prompt(
      `Type "delete" to confirm delete of this chat session`,
    );
    if (userConfirmation === null) return;
    while (
      userConfirmation !== null &&
      userConfirmation !== "delete" &&
      (userConfirmation === "" || userConfirmation)
    )
      userConfirmation = prompt(
        `Type exactly "delete" to confirm delete of this chat session`,
      );

    const toastId = toast.loading("Deleting session...");
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/sessions/${sessionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error;
        toast.error(errorMessage, { id: toastId });
        return;
      }
      let _sessions = JSON.parse(JSON.stringify(sessions));
      _sessions = _sessions.filter((s: Session) => s.id != sessionId);
      setSessions(_sessions);
      setCurrSessionId(_sessions[0].id);
      localStorage.setItem("currSessionId", _sessions[0].id);
      toast.success("Chat deleted", { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Something went wrong: ${msg}`, { id: toastId });
    }
  };
  return (
    <div>
      {showSummary && (
        <div className="fixed z-50 flex justify-center items-center inset-0">
          <div className="w-[70vw] h-[50vh] md:w-[40vw] md:h-[40vh] bg-gray-900/80 overflow-y-auto flex flex-col gap-2 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-100">Summary of the uploaded PDF</h3>
              <Button
                onClick={() => setShowSummary(false)}
                className="text-white bg-red-600 cursor-pointer hover:bg-red-500"
              >
                <X />
              </Button>
            </div>

            <p className="text-white">
              {currSessionDocs[currSessionDocs.length - 1].summary ??
                "No summary"}
            </p>
          </div>
        </div>
      )}
      {showSpecificSummary && (
        <div className="fixed z-50 flex justify-center items-center inset-0">
          <div className="w-[70vw] h-[50vh] md:w-[40vw] md:h-[40vh] bg-gray-900/80 overflow-y-auto flex flex-col gap-2 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-100">Summary of the PDF</h3>
              <Button
                onClick={() => setShowSpecificSummary(false)}
                className="text-white bg-red-600 cursor-pointer hover:bg-red-500"
              >
                <X />
              </Button>
            </div>

            <p className="text-white">{specificSummary}</p>
          </div>
        </div>
      )}
      {showSidebar && (
        <div className="w-[50vw] md:w-[30vw] lg:w-[35vw] bg-gray-900 fixed z-40 top-16 bottom-2 left-2 p-5 flex flex-col rounded-2xl">
          <div className="flex justify-end">
            <X
              className="hover:cursor-pointer hover:bg-blue-100 rounded-2xl text-white hover:text-gray-900"
              onClick={() => setShowSidebar(false)}
            />
          </div>
          <div className="flex flex-col justify-between h-full mt-2">
            <div>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="cursor-pointer mb-2"
                  onClick={() => handleTitleClick(session.id)}
                >
                  <div
                    className={`p-1 rounded-sm ${session.id === currSessionId ? "bg-blue-50 text-black" : "text-white hover:bg-blue-50 hover:text-black"} flex justify-between items-center`}
                  >
                    <p className="text-xs md:text-sm lg:text-lg">
                      {session.title}
                    </p>
                    <div>
                      <Button
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTitle(session.id);
                        }}
                      >
                        <Edit />
                      </Button>
                      {sessions.length > 1 && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <div>
                <Button
                  onClick={handleNewChatClick}
                  className="mt-3 bg-white text-black cursor-pointer hover:text-white"
                >
                  New Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDocs && (
        <div className="w-[60vw] md:w-[30vw] lg:w-[35vw] bg-gray-900 fixed z-40 top-16 bottom-2 right-2 p-5 flex flex-col rounded-2xl">
          <div className="flex justify-start">
            <X
              className="hover:cursor-pointer hover:bg-blue-100 rounded-2xl text-white hover:text-gray-900"
              onClick={() => setShowDocs(false)}
            />
          </div>
          <div className="flex flex-col h-full justify-between">
            <div>
              {currSessionDocs.length > 0 &&
                currSessionDocs.map((cSD, idx) => (
                  <div
                    key={cSD.pdfId ? cSD.pdfId : idx}
                    className="flex justify-between items-center bg-blue-50 rounded-sm p-1 mt-2"
                  >
                    <p className="text-black text-xs md:text-sm lg:text-lg">
                      {cSD.pdfName}
                    </p>
                    <div className="flex justify-center items-center">
                      <Button
                        title="summary"
                        className="cursor-pointer"
                        onClick={() => {
                          setSpecificSummary(cSD.summary);
                          setShowSpecificSummary(true);
                        }}
                      >
                        <TextAlignStart />
                      </Button>
                      <Button
                        title="delete this PDF"
                        className="cursor-pointer"
                        onClick={() =>
                          handleDeletePDFPerSession(currSessionId!, cSD.pdfId)
                        }
                      >
                        X
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
            <FileUpload sessionId={currSessionId} />
          </div>
        </div>
      )}
      <div
        className="pl-4 flex flex-col"
        style={{ height: "calc(100vh - 64px)" }}
      >
        <div className="flex justify-between shrink-0 mt-1">
          <div>
            <Menu
              size={30}
              className="cursor-pointer text-violet-600 hover:bg-violet-100 hover:rounded-md transition p-1"
              onClick={() => {
                setShowDocs(false);
                setShowSidebar(true);
              }}
            />
          </div>

          <div className="pr-2">
            <Button
              className="bg-violet-600 text-white border-none cursor-pointer hover:bg-violet-700 transition"
              onClick={() => {
                setShowDocs(true);
                setShowSidebar(false);
              }}
            >
              <Menu />
              PDFs
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {/* flex-1 tells whatever's left after the menu and pdfs div, take up that space */}
          <ChatComponent key={currSessionId} />
        </div>
      </div>
    </div>
  );
}
