import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  Download, 
  Terminal, 
  X, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Inbox,
  Settings,
  Save,
  Globe
} from "lucide-react";
import { 
  EmailPayload, 
  downloadEMLEmail, 
  openMailClient,
  getOutlookGroupEmail,
  setOutlookGroupEmail,
  openOutlookWebClient,
  openOutlookDesktopClient
} from "../utils/emailAndDownloadService";

// Helper to format email text containing plain URLs into clickable HTML <a> elements
function renderTextWithClickableLinks(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return lines.map((line, lineIdx) => {
    const parts = line.split(urlRegex);
    return (
      <div key={lineIdx} className="min-h-[1.25rem]">
        {parts.map((part, partIdx) => {
          if (part.match(/^https?:\/\//)) {
            return (
              <a
                key={partIdx}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-bold inline-flex items-center gap-1 mx-0.5 break-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <span>{part}</span>
                <ExternalLink size={11} className="inline shrink-0" />
              </a>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </div>
    );
  });
}

export default function EmailToastAndModal() {
  const [sentEmails, setSentEmails] = useState<EmailPayload[]>([]);
  const [activeToast, setActiveToast] = useState<EmailPayload | null>(null);
  const [selectedModalEmail, setSelectedModalEmail] = useState<EmailPayload | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [groupEmailInput, setGroupEmailInput] = useState<string>(getOutlookGroupEmail());
  const [showGroupEmailSaved, setShowGroupEmailSaved] = useState<boolean>(false);

  useEffect(() => {
    setGroupEmailInput(getOutlookGroupEmail());
  }, [showHistoryModal]);

  const handleSaveGroupEmail = () => {
    setOutlookGroupEmail(groupEmailInput);
    setShowGroupEmailSaved(true);
    setTimeout(() => setShowGroupEmailSaved(false), 2000);
  };

  useEffect(() => {
    const handleEmailDispatched = (e: Event) => {
      const customEvent = e as CustomEvent<EmailPayload>;
      const payload = customEvent.detail;
      if (!payload) return;

      setSentEmails(prev => [payload, ...prev]);
      setActiveToast(payload);

      // Auto dismiss toast directly after 2.5 seconds
      const timer = setTimeout(() => {
        setActiveToast(prev => (prev?.id === payload.id ? null : prev));
      }, 2500);

      return () => clearTimeout(timer);
    };

    window.addEventListener("enterprizseat:email_dispatched", handleEmailDispatched);
    return () => {
      window.removeEventListener("enterprizseat:email_dispatched", handleEmailDispatched);
    };
  }, []);

  const handleCopyBody = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* FLOATING DIRECT AUTO-DISPATCH TOAST BADGE */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-emerald-500/40 p-3.5 space-y-2 animate-in slide-in-from-bottom-5 duration-200 font-sans">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Direct Email Dispatched
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(activeToast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 mt-0.5 truncate font-display">
                  {activeToast.subject}
                </h4>
              </div>
            </div>
            <button 
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            <span className="truncate">To: <strong className="text-blue-300">{activeToast.toEmail}</strong></span>
            <button
              onClick={() => {
                setSelectedModalEmail(activeToast);
                setShowHistoryModal(true);
                setActiveToast(null);
              }}
              className="text-blue-400 hover:text-blue-300 font-bold underline shrink-0 cursor-pointer"
            >
              Log Console
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL SMTP TERMINAL & EMAIL HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full text-slate-100 shadow-2xl space-y-5 p-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl">
                  <Terminal size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <span>Enterprise SMTP Mail Relay Console</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                      LIVE SMTP STATUS 250 OK
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspecting outbound email dispatches, credentials, and MIME headers
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Outlook Group Email Configuration Settings Bar */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span>Outlook Group Sender Email Address</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">
                      Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    System emails, approval requests & password resets trigger through this Group Email ID
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  value={groupEmailInput}
                  onChange={(e) => setGroupEmailInput(e.target.value)}
                  placeholder="e.g. workspace-admin@company.com"
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-blue-500 text-white rounded-xl text-xs font-mono w-full sm:w-64 outline-none"
                />
                <button
                  onClick={handleSaveGroupEmail}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{showGroupEmailSaved ? "Saved!" : "Save ID"}</span>
                </button>
              </div>
            </div>

            {/* Content Split view */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left Column: Email History List */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 max-h-[380px] overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                  Outbound Queue ({sentEmails.length})
                </div>
                {sentEmails.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    <Inbox className="mx-auto mb-2 opacity-50" size={24} />
                    No emails dispatched yet
                  </div>
                ) : (
                  sentEmails.map(mail => {
                    const isSelected = selectedModalEmail?.id === mail.id;
                    return (
                      <div
                        key={mail.id}
                        onClick={() => setSelectedModalEmail(mail)}
                        className={`p-2.5 rounded-xl cursor-pointer border transition-all text-xs space-y-1 ${
                          isSelected 
                            ? "bg-blue-600/20 border-blue-500 text-white" 
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex justify-between text-[10px]">
                          <span className="text-blue-400 font-mono font-bold truncate max-w-[120px]">{mail.toEmail}</span>
                          <span className="text-slate-500 font-mono">{new Date(mail.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="font-bold line-clamp-1">{mail.subject}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Active Selected Email Terminal & Preview */}
              <div className="md:col-span-2 space-y-4">
                {selectedModalEmail ? (
                  <div className="space-y-3">
                    {/* Simulated SMTP Relay Handshake Log Box */}
                    <div className="bg-black p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">SMTP Server Protocol Log</div>
                      <div>[2026-07-21] CONNECT smtp.enterprizseat.corp:587... 220 READY</div>
                      <div>EHLO relay.alpha-hq.internal... 250-SIZE 35651584</div>
                      <div>AUTH LOGIN (User: mailer-daemon@enterprizseat.corp)... 235 Authenticated</div>
                      <div>MAIL FROM:&lt;{selectedModalEmail.sender || "no-reply@enterprizseat.corp"}&gt;... 250 OK</div>
                      <div>RCPT TO:&lt;{selectedModalEmail.toEmail}&gt;... 250 Accepted</div>
                      <div>DATA... 354 Start mail input; end with &lt;CRLF&gt;.&lt;CRLF&gt;</div>
                      <div className="text-blue-400">250 2.0.0 OK Message ID: &lt;{selectedModalEmail.id}@enterprizseat.corp&gt;</div>
                    </div>

                    {/* Email Card Preview */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-[11px]">
                        <div>
                          <span className="text-slate-400">Subject: </span>
                          <strong className="text-white font-mono">{selectedModalEmail.subject}</strong>
                        </div>
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded font-mono">
                          {selectedModalEmail.category || "Notification"}
                        </span>
                      </div>

                      <div className="text-slate-300 leading-relaxed space-y-1">
                        {renderTextWithClickableLinks(selectedModalEmail.bodyText)}

                        {selectedModalEmail.tempPassword && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 font-mono text-[11px] text-amber-200">
                            <div>Corporate Account: <strong>{selectedModalEmail.toEmail}</strong></div>
                            <div>Issued Temp Password: <strong className="text-amber-400 font-bold text-sm">{selectedModalEmail.tempPassword}</strong></div>
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleCopyBody(selectedModalEmail.bodyText)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs cursor-pointer"
                        >
                          {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          <span>{copied ? "Copied!" : "Copy Text"}</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => openOutlookWebClient(selectedModalEmail.toEmail, selectedModalEmail.subject, selectedModalEmail.bodyText)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs shadow-sm cursor-pointer"
                            title="Open in Office 365 Outlook Web with prefilled To, Subject, Body and CC"
                          >
                            <ExternalLink size={13} />
                            <span>Outlook Web</span>
                          </button>

                          <button
                            onClick={() => openOutlookDesktopClient(selectedModalEmail.toEmail, selectedModalEmail.subject, selectedModalEmail.bodyText)}
                            className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs shadow-sm cursor-pointer"
                            title="Launch Outlook Desktop or default OS email client"
                          >
                            <Mail size={13} />
                            <span>Outlook App</span>
                          </button>

                          <button
                            onClick={() => downloadEMLEmail(selectedModalEmail)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs cursor-pointer"
                            title="Download formatted .EML file for Microsoft Outlook import"
                          >
                            <Download size={13} />
                            <span>.EML File</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center text-slate-500 space-y-2">
                    <Mail size={32} className="mx-auto text-slate-600" />
                    <p className="text-xs">Select an email dispatch from the queue list to inspect details.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                Server: smtp.enterprizseat.corp (Port 587 TLS)
              </span>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
