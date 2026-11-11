import React, { useState, useEffect, useRef } from 'react';
import MathText from './MathText';

// Pre-configured Regulation Presets
const REGULATION_PRESETS = {
  'r24_autonomous': {
    id: 'r24_autonomous',
    name: 'R24 Autonomous Scheme',
    badge: 'R24 Active',
    cieMarks: 40,
    seeMarks: 60,
    totalMarks: 100,
    summary: `• 4 Formative Assessments (FA1, FA2, FA3, FA4) scaled to 10 Marks
• 2 Descriptive Mid Exams (Mid-1 & Mid-2, 25 Marks each)
• Final Mid Score: 80% weightage to better Mid + 20% to second Mid (scaled to 25 Marks)
• Attendance & Day-to-Day Course Engagement: 5 Marks
• Total Internal (CIE): 40 Marks | Semester End Exam (SEE): 60 Marks
• Passing Standard: >= 35% in SEE (21/60) and >= 40% aggregate (40/100)`,
    rawText: `REGULATION: R24 AUTONOMOUS ENGINEERING CURRICULUM
ASSESSMENT STRUCTURE FOR THEORY COURSES:
1. Continuous Internal Evaluation (CIE): 40 Marks
   a. Formative Assessments: 4 FAs conducted throughout the semester.
      - FA1: Unit 1 Objective test / Quiz (5 Marks)
      - FA2: Unit 2 Coding practical / Case study assignment (5 Marks)
      - FA3: Unit 3 Seminar / Problem sheet (5 Marks)
      - FA4: Unit 4 & 5 Mock test (5 Marks)
      Total 20 Marks scaled down to 10 Marks.
   b. Mid-Term Descriptive Examinations: 2 Mids conducted for 25 Marks each.
      - Mid-1: Units 1, 2, and first half of Unit 3.
      - Mid-2: Second half of Unit 3, Units 4, and 5.
      - Calculation formula: (0.8 * Higher_Mid) + (0.2 * Lower_Mid) = 25 Marks.
   c. Attendance & Class Engagement: 5 Marks (>90%: 5M, 85-89%: 4M, 80-84%: 3M, 75-79%: 2M).
2. Semester End Examination (SEE): 60 Marks (Comprehensive 3-Hour Exam).
3. Total Course Marks: 100 Marks. Minimum 35% in SEE (21 Marks) and 40% overall (40 Marks).`
  },
  'r23_university': {
    id: 'r23_university',
    name: 'R23 University Standard',
    badge: 'R23 University',
    cieMarks: 30,
    seeMarks: 70,
    totalMarks: 100,
    summary: `• 2 Mid Examinations of 30 Marks each (averaged to 25 Marks)
• 2 Subject Assignments / Objective tests (5 Marks)
• Total Internal (CIE): 30 Marks | Semester End Exam (SEE): 70 Marks
• Passing Standard: >= 35% in SEE (25/70) and >= 40% overall aggregate (40/100)`,
    rawText: `REGULATION: R23 UNIVERSITY STANDARD SCHEME
1. Continuous Internal Evaluation (CIE): 30 Marks
   - Two Mid Examinations conducted for 30 marks each. Average of Mid-1 and Mid-2 scaled to 25 Marks.
   - Assignment / Slip Tests: 5 Marks.
2. Semester End Examination (SEE): 70 Marks (Part A: 10 compulsory questions, Part B: 5 essay choices).
3. Total Course Marks: 100 Marks.`
  },
  'aicte_cbcs': {
    id: 'aicte_cbcs',
    name: 'AICTE Model CBCS Scheme',
    badge: 'AICTE CBCS',
    cieMarks: 50,
    seeMarks: 50,
    totalMarks: 100,
    summary: `• Continuous Internal Evaluation (CIE): 50 Marks (2 Tests + 2 Quizzes + 1 Term Paper)
• Semester End Exam (SEE): 50 Marks
• Outcome-Based Education (OBE) course outcome attainment threshold: 60%`,
    rawText: `REGULATION: AICTE MODEL CBCS 50:50 ASSESSMENT
1. Continuous Internal Evaluation (CIE): 50 Marks (Mid-1: 20M, Mid-2: 20M, Continuous Quizzes: 10M).
2. Semester End Examination (SEE): 50 Marks.
3. Total: 100 Marks.`
  }
};

const DEFAULT_TIMETABLE_TEXT = `WEEKLY FACULTY TEACHING TIMETABLE:
Department: Computer Science & Engineering | Semester: V (Odd Sem)
Assigned Subject: Machine Learning (L-T-P-C: 3-0-2-4)

Weekly Schedule:
• Monday: 
  - 10:00 AM - 10:50 AM : Machine Learning (Theory) [Room 304 - CSE Batch A]
  - 02:00 PM - 02:50 PM : Department Counseling / Mentoring Hour
• Tuesday: 
  - 01:30 PM - 04:30 PM : Machine Learning Practical Lab [AI/ML Lab-2 - Batch A1]
• Wednesday: 
  - 11:00 AM - 11:50 AM : Machine Learning (Theory) [Room 304 - CSE Batch A]
  - 03:00 PM - 03:50 PM : Faculty Research / Project Review
• Thursday: 
  - 09:00 AM - 09:50 AM : Machine Learning Tutorial & Problem Solving [Room 304]
  - 01:30 PM - 04:30 PM : Machine Learning Practical Lab [AI/ML Lab-2 - Batch A2]
• Friday: 
  - 10:00 AM - 10:50 AM : Machine Learning (Theory) [Room 304 - CSE Batch A]
• Saturday: 
  - 10:00 AM - 12:00 PM : Remedial Classes & Formative Assessment FA Quizzes (Alternate Weeks)

Total Weekly Workload: 16 Hours (Theory: 3h, Tutorial: 1h, Labs: 6h, Mentoring & Remedial: 6h)`;

export default function FacultyChatbot({ syllabusData, apiKey, modelName }) {
  // Persistent Chat History
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_faculty_copilot_chat');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Welcome, Professor!** I am your **Institutional Academic & Regulations Copilot**.

I am pre-configured with **R24 Autonomous Regulations** (including the **FA1–FA4 formative assessment framework, 2 Mid-term descriptive exams, and 1 Semester End Exam**) and your **Weekly Teaching Timetable**.

### What I can assist you with:
- 📋 **Exam Marks Allotment:** Detailed breakdown of Formative Assessments (FA1–FA4), Mid exams, and Semester End Exam (SEE) weightages.
- ⚖️ **Internal Calculations:** Formulas for 80:20 Mid weightage, continuous evaluation quotas, and CO attainment.
- ⏳ **Timetable & Scheduling:** Resolving lecture clashes, lab batch overlaps, and AICTE teaching workload planning.
- 💡 **Pedagogical Methodology:** Flipped classroom setups, problem-based learning (PBL), and active coding lab strategies.

You can also click **"📂 Regulations & Timetable Hub"** at the top right to upload your college's specific regulation PDF or department timetable! How can I assist your teaching today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  // Active Regulations & Timetable States
  const [selectedPreset, setSelectedPreset] = useState(() => {
    return localStorage.getItem('syllabus_faculty_copilot_preset') || 'r24_autonomous';
  });

  const [uploadedRegulation, setUploadedRegulation] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_faculty_uploaded_reg');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [timetableText, setTimetableText] = useState(() => {
    return localStorage.getItem('syllabus_faculty_timetable_text') || DEFAULT_TIMETABLE_TEXT;
  });

  const [uploadedTimetableDoc, setUploadedTimetableDoc] = useState(() => {
    try {
      const saved = localStorage.getItem('syllabus_faculty_uploaded_tt');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  // UI States
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHubModal, setShowHubModal] = useState(false);
  const [hubActiveTab, setHubActiveTab] = useState('regulations'); // 'regulations' | 'timetable'
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isDraggingReg, setIsDraggingReg] = useState(false);
  const [isDraggingTT, setIsDraggingTT] = useState(false);

  const messagesContainerRef = useRef(null);
  const regFileInputRef = useRef(null);
  const ttFileInputRef = useRef(null);

  // Sync to localStorage and Server Persistence
  useEffect(() => {
    try {
      localStorage.setItem('syllabus_faculty_copilot_chat', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_faculty_copilot_preset', selectedPreset);
      fetch('/api/faculty-copilot/hub-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPreset })
      }).catch(() => {});
    } catch (e) {}
  }, [selectedPreset]);

  useEffect(() => {
    try {
      if (uploadedRegulation) {
        localStorage.setItem('syllabus_faculty_uploaded_reg', JSON.stringify(uploadedRegulation));
      } else {
        localStorage.removeItem('syllabus_faculty_uploaded_reg');
      }
      fetch('/api/faculty-copilot/hub-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadedRegulation })
      }).catch(() => {});
    } catch (e) {}
  }, [uploadedRegulation]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_faculty_timetable_text', timetableText);
      if (uploadedTimetableDoc) {
        localStorage.setItem('syllabus_faculty_uploaded_tt', JSON.stringify(uploadedTimetableDoc));
      } else {
        localStorage.removeItem('syllabus_faculty_uploaded_tt');
      }
      fetch('/api/faculty-copilot/hub-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timetableText, uploadedTimetableDoc })
      }).catch(() => {});
    } catch (e) {}
  }, [timetableText, uploadedTimetableDoc]);

  // Restore Hub State from Server on initial mount / reload
  useEffect(() => {
    async function restoreServerHubState() {
      try {
        const res = await fetch('/api/faculty-copilot/hub-state');
        if (res.ok) {
          const serverState = await res.json();
          if (serverState) {
            if (serverState.uploadedRegulation) {
              setUploadedRegulation(prev => prev || serverState.uploadedRegulation);
              try {
                localStorage.setItem('syllabus_faculty_uploaded_reg', JSON.stringify(serverState.uploadedRegulation));
              } catch (e) {}
            }
            if (serverState.uploadedTimetableDoc) {
              setUploadedTimetableDoc(prev => prev || serverState.uploadedTimetableDoc);
              try {
                localStorage.setItem('syllabus_faculty_uploaded_tt', JSON.stringify(serverState.uploadedTimetableDoc));
              } catch (e) {}
            }
            if (serverState.timetableText && serverState.timetableText !== DEFAULT_TIMETABLE_TEXT) {
              setTimetableText(prev => (prev === DEFAULT_TIMETABLE_TEXT ? serverState.timetableText : prev));
              try {
                localStorage.setItem('syllabus_faculty_timetable_text', serverState.timetableText);
              } catch (e) {}
            }
            if (serverState.selectedPreset) {
              setSelectedPreset(prev => prev || serverState.selectedPreset);
            }
          }
        }
      } catch (err) {
        console.warn('Could not restore server faculty hub state:', err);
      }
    }
    restoreServerHubState();
  }, []);

  // Scroll chat to bottom on new message (ONLY within the messages container, never scrolling the window/ancestors)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  // Determine active regulation text
  const activeRegulationText = uploadedRegulation 
    ? uploadedRegulation.extractedText 
    : (REGULATION_PRESETS[selectedPreset]?.rawText || REGULATION_PRESETS['r24_autonomous'].rawText);

  const activeRegulationTitle = uploadedRegulation 
    ? `Custom: ${uploadedRegulation.fileName}` 
    : (REGULATION_PRESETS[selectedPreset]?.name || 'R24 Autonomous Scheme');

  // Handle Send Message
  const handleSendMessage = async (customPrompt) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history payload
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const effectiveApiKey = apiKey || localStorage.getItem('gemini_api_key') || '';

      const res = await fetch('/api/faculty-copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveApiKey ? { 'x-api-key': effectiveApiKey } : {})
        },
        body: JSON.stringify({
          message: textToSend,
          chatHistory,
          regulationContext: activeRegulationText,
          timetableContext: timetableText,
          activeSyllabus: syllabusData || { subject_name: 'Machine Learning' },
          regulationPreset: activeRegulationTitle,
          modelName: modelName || localStorage.getItem('model_name') || 'gemini-2.5-flash'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with code ${res.status}`);
      }

      const data = await res.json();
      const botMsg = {
        id: 'msg_' + Date.now() + '_bot',
        role: 'assistant',
        content: data.reply || 'No response generated.',
        modelUsed: data.modelUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Faculty Copilot Error:', err);
      const errorMsg = {
        id: 'msg_' + Date.now() + '_err',
        role: 'assistant',
        content: `⚠️ **Copilot Error:** ${err.message || 'Failed to communicate with Faculty AI service. Please verify your connection or API key.'}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Core Process File function (shared by File Input and Drag & Drop)
  const processFile = async (file, docType) => {
    if (!file) return;

    setIsUploadingDoc(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('docFile', file);
    formData.append('docType', docType);
    formData.append('modelName', modelName || localStorage.getItem('model_name') || 'gemini-2.5-flash');

    const effectiveApiKey = apiKey || localStorage.getItem('gemini_api_key') || '';

    try {
      const res = await fetch('/api/faculty-copilot/parse-document', {
        method: 'POST',
        headers: {
          ...(effectiveApiKey ? { 'x-api-key': effectiveApiKey } : {})
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to parse uploaded document.');
      }

      const result = await res.json();

      if (docType === 'regulation') {
        setUploadedRegulation(result);
        setSelectedPreset('custom');
      } else {
        setUploadedTimetableDoc(result);
        if (result.extractedText) {
          setTimetableText(result.extractedText);
        }
      }

      // Add system announcement in chat
      const sysMsg = {
        id: 'sys_' + Date.now(),
        role: 'assistant',
        content: `📁 **Uploaded ${docType === 'regulation' ? 'Regulation' : 'Timetable'} Document:** \`${result.fileName}\` (${(result.fileSize / 1024).toFixed(1)} KB)
        
**Institutional Summary:**
${result.summary || 'Document extracted and active in Copilot.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, sysMsg]);

    } catch (err) {
      console.error('Document Upload Failed:', err);
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleFileUpload = (e, docType) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, docType);
    }
    if (e.target) e.target.value = '';
  };

  const handleRegDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingReg) setIsDraggingReg(true);
  };

  const handleRegDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingReg(true);
  };

  const handleRegDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDraggingReg(false);
  };

  const handleRegDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingReg(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0], 'regulation');
    }
  };

  const handleTTDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingTT) setIsDraggingTT(true);
  };

  const handleTTDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTT(true);
  };

  const handleTTDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDraggingTT(false);
  };

  const handleTTDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTT(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0], 'timetable');
    }
  };

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear this consultation history?')) {
      setMessages([
        {
          id: 'welcome_cleared',
          role: 'assistant',
          content: `🧹 **Chat Cleared.** I am ready to advise you on **${activeRegulationTitle}**, timetable planning, or teaching strategies. How can I assist?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  // Quick Prompt Chips
  const QUICK_PROMPTS = [
    {
      label: '📋 R24 ML Marks Breakdown',
      text: 'Explain the complete R24 exam marks allotment for Machine Learning (FA1 to FA4, Mid 1 and Mid 2, and Semester End Exam).'
    },
    {
      label: '⚖️ 80:20 Mid Calculation',
      text: 'How is the final internal mid score calculated between Mid 1 and Mid 2 under R24 (80% best mid + 20% other mid formula)?'
    },
    {
      label: '🎯 Bloom & CO Attainment',
      text: 'How do I map Mid-1 questions to Course Outcomes (CO1, CO2) and compute the 60% student attainment threshold?'
    },
    {
      label: '⏳ Timetable Conflict Solver',
      text: 'I have a timetable clash: Machine Learning Lab Batch-1 overlaps with a 3rd-year Elective Theory lecture. How can I resolve it?'
    },
    {
      label: '💡 Active Teaching Method',
      text: 'Suggest an interactive flipped-classroom teaching methodology for Decision Trees and Random Forests in 50 minutes.'
    },
    {
      label: '📝 Remedial Assessment Plan',
      text: 'Give me a structured remedial action plan for students who scored below 40% in Mid 1.'
    }
  ];

  return (
    <div 
      className="glass-panel"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        width: '100%',
        minHeight: '0', 
        maxHeight: '100%',
        overflow: 'hidden', 
        position: 'relative',
        borderRadius: '12px',
        background: 'var(--color-carbon)',
        border: '1px solid var(--color-graphite)'
      }}
    >
      
      {/* Copilot Header */}
      <div style={{
        padding: '12px 18px',
        background: 'var(--color-carbon)',
        borderBottom: '1px solid var(--color-graphite)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        flexShrink: 0
      }}>
        {/* Title & Active Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(228, 242, 34, 0.1)',
            border: '1px solid rgba(228, 242, 34, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem'
          }}>
            🤖
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '510', color: 'var(--color-paper)', margin: 0 }}>
                Faculty Academic Copilot
              </h2>
              <span className="badge" style={{ backgroundColor: 'rgba(228, 242, 34, 0.12)', color: 'var(--color-acid-lime)', borderColor: 'rgba(228, 242, 34, 0.3)' }}>
                {activeRegulationTitle}
              </span>
              {syllabusData?.subject_name && (
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                  {syllabusData.subject_name}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-fog)', fontFamily: 'var(--font-mono)' }}>
              R24/R23 REGULATIONS • FA1–FA4 ALLOTMENT • MIDS & SEE • TIMETABLE ADVISOR
            </span>
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowHubModal(true)}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Upload regulations or faculty timetable"
          >
            <span>📂</span>
            <span>Regulations & Timetable Hub</span>
            {(uploadedRegulation || uploadedTimetableDoc) && (
              <span style={{ background: '#08090a', color: 'var(--color-acid-lime)', borderRadius: '999px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                {(uploadedRegulation ? 1 : 0) + (uploadedTimetableDoc ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            title="Clear current consultation history"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Suggested Quick Questions Bar */}
      <div 
        className="no-scrollbar"
        style={{
          padding: '8px 16px',
          background: 'rgba(15, 16, 17, 0.6)',
          borderBottom: '1px solid var(--color-graphite)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '0.72rem', color: 'var(--color-fog)', fontWeight: '510', flexShrink: 0 }}>
          💡 Recommended Topics:
        </span>
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(prompt.text)}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{
              padding: '3px 10px',
              fontSize: '0.72rem',
              borderRadius: '9999px',
              flexShrink: 0,
              background: 'var(--color-obsidian)',
              borderColor: 'var(--color-graphite)'
            }}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {/* Main Conversation Stream */}
      <div 
        ref={messagesContainerRef}
        style={{
          flex: '1',
          minHeight: '0',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              {/* Message Header Label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                padding: '0 4px'
              }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '600', color: isUser ? 'var(--color-acid-lime)' : 'var(--color-paper)' }}>
                  {isUser ? '👤 You (Faculty Question)' : '🤖 Academic Copilot AI'}
                </span>
                <span style={{ fontSize: '0.64rem', color: 'var(--color-fog)' }}>
                  {msg.timestamp}
                </span>
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-fog)',
                      fontSize: '0.66rem',
                      cursor: 'pointer',
                      padding: '0 4px',
                      textDecoration: 'underline'
                    }}
                  >
                    {copiedId === msg.id ? 'Copied! ✓' : 'Copy'}
                  </button>
                )}
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: isUser ? '82%' : '90%',
                  padding: '14px 18px',
                  borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: isUser ? 'rgba(228, 242, 34, 0.08)' : 'var(--color-obsidian)',
                  border: isUser ? '1px solid rgba(228, 242, 34, 0.35)' : '1px solid var(--color-graphite)',
                  color: 'var(--color-paper)',
                  fontSize: '0.88rem',
                  lineHeight: '1.6',
                  boxShadow: isUser ? '0 2px 8px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.25)',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                  <MathText text={msg.content} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-acid-lime)', fontWeight: '510' }}>
              Copilot AI Analyzing Regulations & Schedules...
            </span>
            <div style={{
              padding: '12px 18px',
              borderRadius: '14px',
              background: 'var(--color-carbon)',
              border: '1px solid var(--color-graphite)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center'
            }}>
              <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-acid-lime)', animation: 'pulse 1s infinite alternate' }} />
              <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-acid-lime)', animation: 'pulse 1s infinite alternate 0.2s' }} />
              <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-acid-lime)', animation: 'pulse 1s infinite alternate 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <div style={{
        padding: '14px 20px',
        background: 'var(--color-carbon)',
        borderTop: '1px solid var(--color-graphite)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0
      }}>
        {/* Active context badge preview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--color-fog)' }}>
          <span>
            Active Context: <strong style={{ color: 'var(--color-paper)' }}>{activeRegulationTitle}</strong> (FA1-FA4 & Mids enabled)
          </span>
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about R24 exam marks allotment, mid calculations, timetable clashes, or teaching strategies..."
            rows={2}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--color-obsidian)',
              border: '1px solid var(--color-graphite)',
              color: 'var(--color-paper)',
              fontSize: '0.86rem',
              lineHeight: '1.4',
              resize: 'none',
              fontFamily: 'var(--font-sans)',
              outline: 'none'
            }}
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="btn btn-primary"
            style={{
              height: '52px',
              padding: '0 20px',
              borderRadius: '8px',
              fontWeight: '510',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Send</span>
            <span>➤</span>
          </button>
        </div>
      </div>

      {/* Regulations & Timetable Hub Modal */}
      {showHubModal && (
        <div 
          onClick={() => setShowHubModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              background: 'var(--color-carbon)',
              border: '1px solid var(--color-graphite)',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--color-graphite)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--color-obsidian)'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '510', color: 'var(--color-paper)', margin: 0 }}>
                  Institutional Regulations & Timetable Hub
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>
                  Upload official college documents or select standard engineering regulation frameworks
                </span>
              </div>
              <button 
                onClick={() => setShowHubModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-fog)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-graphite)', background: 'var(--color-obsidian)' }}>
              <button
                type="button"
                onClick={() => setHubActiveTab('regulations')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: hubActiveTab === 'regulations' ? '2px solid var(--color-acid-lime)' : '2px solid transparent',
                  color: hubActiveTab === 'regulations' ? 'var(--color-paper)' : 'var(--color-fog)',
                  fontWeight: '510',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                📜 Academic Regulations & Exam Rules
              </button>
              <button
                type="button"
                onClick={() => setHubActiveTab('timetable')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: hubActiveTab === 'timetable' ? '2px solid var(--color-acid-lime)' : '2px solid transparent',
                  color: hubActiveTab === 'timetable' ? 'var(--color-paper)' : 'var(--color-fog)',
                  fontWeight: '510',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                🗓️ Department Timetable & Workload
              </button>
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {uploadError && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(235, 87, 87, 0.1)', border: '1px solid rgba(235, 87, 87, 0.3)', color: '#fca5a5', fontSize: '0.8rem' }}>
                  {uploadError}
                </div>
              )}

              {hubActiveTab === 'regulations' ? (
                // Regulations Configuration
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Interactive Drag & Drop Box for Academic Regulations */}
                  <div
                    onDragOver={handleRegDragOver}
                    onDragEnter={handleRegDragEnter}
                    onDragLeave={handleRegDragLeave}
                    onDrop={handleRegDrop}
                    onClick={() => !isUploadingDoc && regFileInputRef.current?.click()}
                    style={{
                      padding: '24px 20px',
                      borderRadius: '12px',
                      border: isDraggingReg 
                        ? '2px dashed var(--color-acid-lime)' 
                        : (uploadedRegulation ? '1px solid rgba(228, 242, 34, 0.4)' : '1.5px dashed var(--color-graphite)'),
                      background: isDraggingReg 
                        ? 'rgba(228, 242, 34, 0.08)' 
                        : (uploadedRegulation ? 'rgba(228, 242, 34, 0.03)' : 'var(--color-obsidian)'),
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: isUploadingDoc ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isDraggingReg ? '0 0 24px rgba(228, 242, 34, 0.25)' : 'none'
                    }}
                  >
                    <input 
                      type="file" 
                      ref={regFileInputRef} 
                      onChange={(e) => handleFileUpload(e, 'regulation')}
                      accept=".pdf,.txt,.doc,.docx,image/*" 
                      style={{ display: 'none' }} 
                    />

                    {isUploadingDoc ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(228, 242, 34, 0.2)', borderTopColor: 'var(--color-acid-lime)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: '0.84rem', color: 'var(--color-paper)', fontWeight: '510' }}>
                          Analyzing & Extracting Academic Regulation Rules...
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-fog)' }}>
                          Identifying FAs, mid weightages, SEE guidelines, and passing criteria
                        </span>
                      </div>
                    ) : isDraggingReg ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                        <div style={{ fontSize: '2.4rem', transform: 'scale(1.15)', transition: 'transform 0.2s' }}>📥</div>
                        <span style={{ fontSize: '0.92rem', color: 'var(--color-acid-lime)', fontWeight: '600' }}>
                          Drop Regulation PDF Here to Analyze
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-fog)' }}>
                          Release to extract marks allocation rules automatically
                        </span>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          background: 'rgba(228, 242, 34, 0.1)',
                          border: '1px solid rgba(228, 242, 34, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.4rem'
                        }}>
                          📜
                        </div>
                        
                        <div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--color-paper)', fontWeight: '510', display: 'block', marginBottom: '4px' }}>
                            Drag & Drop Academic Regulations Document Here
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>
                            or <span style={{ color: 'var(--color-acid-lime)', textDecoration: 'underline' }}>click to browse files</span> (.pdf, .docx, .txt, scanned circulars)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            regFileInputRef.current?.click();
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 16px', fontSize: '0.78rem', borderRadius: '6px' }}
                        >
                          Select Regulation PDF / Document
                        </button>
                      </>
                    )}

                    {uploadedRegulation && !isUploadingDoc && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                          marginTop: '8px', 
                          padding: '12px 14px', 
                          background: 'rgba(228, 242, 34, 0.08)', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(228, 242, 34, 0.3)', 
                          width: '100%', 
                          textAlign: 'left' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-paper)', fontWeight: '510', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-acid-lime)' }}>✓</span> 
                            <span>{uploadedRegulation.fileName}</span>
                            <span className="badge" style={{ fontSize: '0.64rem', padding: '1px 5px' }}>
                              {(uploadedRegulation.fileSize / 1024).toFixed(1)} KB
                            </span>
                          </span>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={() => regFileInputRef.current?.click()}
                              style={{ background: 'none', border: 'none', color: 'var(--color-acid-lime)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setUploadedRegulation(null)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-coral-red)', fontSize: '0.72rem', cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-fog)', margin: '6px 0 0', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                          {uploadedRegulation.summary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Standard Framework Presets */}
                  <div>
                    <h4 style={{ fontSize: '0.84rem', color: 'var(--color-mist)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Or Select Pre-Configured Regulation Framework:
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Object.values(REGULATION_PRESETS).map((preset) => {
                        const isSelected = selectedPreset === preset.id && !uploadedRegulation;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => {
                              setSelectedPreset(preset.id);
                              setUploadedRegulation(null);
                            }}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '8px',
                              background: isSelected ? 'rgba(228, 242, 34, 0.06)' : 'var(--color-obsidian)',
                              border: isSelected ? '1px solid var(--color-acid-lime)' : '1px solid var(--color-graphite)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              transition: 'var(--transition-fast)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: '510', color: isSelected ? 'var(--color-acid-lime)' : 'var(--color-paper)' }}>
                                {preset.name} {isSelected && '✓ (Active)'}
                              </span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span className="badge" style={{ fontSize: '0.66rem' }}>CIE: {preset.cieMarks}M</span>
                                <span className="badge" style={{ fontSize: '0.66rem' }}>SEE: {preset.seeMarks}M</span>
                                <span className="badge" style={{ fontSize: '0.66rem' }}>Total: {preset.totalMarks}M</span>
                              </div>
                            </div>
                            <pre style={{
                              margin: 0,
                              fontFamily: 'var(--font-sans)',
                              fontSize: '0.74rem',
                              color: 'var(--color-fog)',
                              lineHeight: '1.45',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {preset.summary}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ) : (
                // Timetable Configuration
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Interactive Drag & Drop Box for Department Timetable */}
                  <div
                    onDragOver={handleTTDragOver}
                    onDragEnter={handleTTDragEnter}
                    onDragLeave={handleTTDragLeave}
                    onDrop={handleTTDrop}
                    onClick={() => !isUploadingDoc && ttFileInputRef.current?.click()}
                    style={{
                      padding: '24px 20px',
                      borderRadius: '12px',
                      border: isDraggingTT 
                        ? '2px dashed var(--color-cyan-glow)' 
                        : (uploadedTimetableDoc ? '1px solid rgba(56, 189, 248, 0.4)' : '1.5px dashed var(--color-graphite)'),
                      background: isDraggingTT 
                        ? 'rgba(56, 189, 248, 0.08)' 
                        : (uploadedTimetableDoc ? 'rgba(56, 189, 248, 0.03)' : 'var(--color-obsidian)'),
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: isUploadingDoc ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isDraggingTT ? '0 0 24px rgba(56, 189, 248, 0.25)' : 'none'
                    }}
                  >
                    <input 
                      type="file" 
                      ref={ttFileInputRef} 
                      onChange={(e) => handleFileUpload(e, 'timetable')}
                      accept=".pdf,.csv,.txt,image/*" 
                      style={{ display: 'none' }} 
                    />

                    {isUploadingDoc ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: '0.84rem', color: 'var(--color-paper)', fontWeight: '510' }}>
                          Analyzing & Extracting Teaching Schedule...
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-fog)' }}>
                          Extracting periods, lab slots, and faculty weekly workload
                        </span>
                      </div>
                    ) : isDraggingTT ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                        <div style={{ fontSize: '2.4rem', transform: 'scale(1.15)', transition: 'transform 0.2s' }}>📥</div>
                        <span style={{ fontSize: '0.92rem', color: '#38bdf8', fontWeight: '600' }}>
                          Drop Timetable File Here to Analyze
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-fog)' }}>
                          Release to extract weekly period allocations automatically
                        </span>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.4rem'
                        }}>
                          📅
                        </div>

                        <div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--color-paper)', fontWeight: '510', display: 'block', marginBottom: '4px' }}>
                            Drag & Drop Institutional / Faculty Timetable Here
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>
                            or <span style={{ color: '#38bdf8', textDecoration: 'underline' }}>click to browse files</span> (.pdf, .csv spreadsheet, image)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            ttFileInputRef.current?.click();
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 16px', fontSize: '0.78rem', borderRadius: '6px' }}
                        >
                          Upload Timetable File
                        </button>
                      </>
                    )}

                    {uploadedTimetableDoc && !isUploadingDoc && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                          marginTop: '8px', 
                          padding: '12px 14px', 
                          background: 'rgba(56, 189, 248, 0.08)', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(56, 189, 248, 0.3)', 
                          width: '100%', 
                          textAlign: 'left' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-paper)', fontWeight: '510', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#38bdf8' }}>✓</span> 
                            <span>{uploadedTimetableDoc.fileName}</span>
                            <span className="badge" style={{ fontSize: '0.64rem', padding: '1px 5px' }}>
                              {(uploadedTimetableDoc.fileSize / 1024).toFixed(1)} KB
                            </span>
                          </span>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={() => ttFileInputRef.current?.click()}
                              style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setUploadedTimetableDoc(null)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-coral-red)', fontSize: '0.72rem', cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-fog)', margin: '6px 0 0', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                          {uploadedTimetableDoc.summary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manual Timetable Editor & Text Preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '510', color: 'var(--color-paper)' }}>
                        Weekly Timetable & Period Allocation Editor:
                      </span>
                      <button
                        type="button"
                        onClick={() => setTimetableText(DEFAULT_TIMETABLE_TEXT)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-acid-lime)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Reset to Sample Schedule
                      </button>
                    </div>

                    <textarea
                      value={timetableText}
                      onChange={(e) => setTimetableText(e.target.value)}
                      rows={10}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--color-obsidian)',
                        border: '1px solid var(--color-graphite)',
                        borderRadius: '8px',
                        color: 'var(--color-paper)',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: '1.45',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--color-graphite)',
              background: 'var(--color-obsidian)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-fog)' }}>
                Active Framework: <strong style={{ color: 'var(--color-paper)' }}>{activeRegulationTitle}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowHubModal(false)}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.82rem' }}
              >
                Save & Apply to Copilot
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
