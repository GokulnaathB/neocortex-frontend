"use client";
import { Upload } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useAppStore } from "../store/useAppStore";
import toast from "react-hot-toast";

export default function FileUpload({
  sessionId,
}: {
  sessionId: string | null;
}) {
  const { getToken } = useAuth();
  const { addDoc, setCurrSessionDocs, setShowSummary } = useAppStore();

  const poll = async (docId: string, toastId: string, attempts: number) => {
    if (attempts == 10) {
      toast.error(
        "Couldn't process PDF completely. Try deleting and re-uploading.",
        {
          id: toastId,
        },
      );
      return;
    }
    const token = await getToken();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/sessions/${docId}/summary`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = await response.json();
    if (!response.ok) {
      toast.error(
        "Couldn't process PDF completely. Try deleting and re-uploading.",
        {
          id: toastId,
        },
      );
      return;
    }
    const summary = data.summary;
    if (summary !== "") {
      const cSD = JSON.parse(
        JSON.stringify(useAppStore.getState().currSessionDocs),
      );
      for (let i = 0; i < cSD.length; i += 1)
        if (cSD[i].pdfId === docId) cSD[i].summary = summary;

      setCurrSessionDocs(cSD);

      toast.success("PDF Ready!", { id: toastId });
      setShowSummary(true);
      return;
    }
    setTimeout(() => poll(docId, toastId, attempts + 1), 2000);
  };
  const handleFileUpload = async () => {
    let toastId: string;
    try {
      const token = await getToken();
      const el = document.createElement("input");
      el.setAttribute("type", "file");
      el.setAttribute("accept", "application/pdf");
      el.addEventListener("change", async () => {
        if (el.files && el.files.length > 0) {
          toastId = toast.loading("Uploading and processing the PDF...");
          const file = el.files.item(0);
          const formData = new FormData();
          formData.append("pdf", file!);
          formData.append("sessionId", sessionId ?? "");
          formData.append("id", crypto.randomUUID());
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/upload/pdf`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            },
          );
          const data = await response.json();
          if (!response.ok) {
            if (data.message === "File already uploaded") {
              toast.success("File already exists in session.", { id: toastId });
              return;
            } else {
              const errorMessage = data.error;
              toast.error(`${errorMessage}`, { id: toastId });
              return;
            }
          }
          const docName = data.docName;
          const docId = data.documentId;
          const summary = data.docSummary;
          addDoc({ pdfName: docName, pdfId: docId, summary });
          toast.loading("PDF Uploaded, processing in the background...", {
            id: toastId,
          });

          poll(docId, toastId, 1);
        }
      });
      el.click();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // toast.error(`Couldn't upload the PDF: ${msg}`, { id: toastId });
      alert(`Couldn't upload the PDF: ${msg}`);
    }
  };
  return (
    <div
      className="bg-slate-900 text-white shadow-2xl flex justify-center items-center p-1 rounded-lg cursor-pointer hover:bg-amber-50 hover:text-blue-950 hover:border-blue-950 hover:border-[0.2px] text-sm"
      onClick={handleFileUpload}
    >
      <div className="flex justify-center items-center">
        <h3>Upload a PDF</h3>
        <Upload />
      </div>
    </div>
  );
}
