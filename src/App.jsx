import React, { useState, useEffect, useRef } from 'react';
import { Send, Check, AlertCircle, Settings, X, Copy, RotateCcw, BookOpen, User, Volume2, Languages, Sparkles, ArrowRightLeft, Pencil, Save, StickyNote, MousePointerClick, Lightbulb } from 'lucide-react';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [customInstruction, setCustomInstruction] = useState(''); 
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState([]);
  
  // New States for AI Features
  const [tone, setTone] = useState('polite'); 
  const [chineseTranslation, setChineseTranslation] = useState(null); 
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // States for Editing Result
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [editedResultText, setEditedResultText] = useState('');

  // States for Quick Translator
  const [transInput, setTransInput] = useState('');
  const [transInstruction, setTransInstruction] = useState(''); // New: Translator instruction
  const [transResult, setTransResult] = useState(null); 
  const [transLoading, setTransLoading] = useState(false);
  const [transDirection, setTransDirection] = useState('kr2cn'); 

  // PRESET OPTIONS (Main Corrector)
  const PRESETS = [
    {
      id: 'recommend',
      label: '👍 추천 (자연스러움)',
      text: "나는 한국에 거주하는 중국인 프리랜서야. 한국어 소통에는 문제없지만 가끔 조사(은/는/이/가)나 표현이 번역투 같을 때가 있어. 내 문장을 한국 토박이가 쓴 것처럼 아주 자연스럽게 다듬어 줘."
    },
    {
      id: 'business',
      label: '💼 비즈니스 (격식)',
      text: "한국 클라이언트와 소통하는 프리랜서야. 정중하고 격식 있는 비즈니스 매너를 갖춘 문장으로 교정해 줘. 문법 오류는 엄격하게 잡아주고, 오해의 소지가 없도록 명확하고 간결하게 작성해 줘."
    },
    {
      id: 'sns',
      label: '🤸 동호회/SNS',
      text: "주짓수와 농사를 즐기는 생활인이야. 커뮤니티나 SNS에 올릴 글이니 너무 딱딱하지 않고 친근한 대화체(해요체)로 바꿔줘. 글의 분위기에 맞게 이모지를 적절히 섞어서 활기찬 느낌을 살려주면 좋겠어."
    }
  ];

  // PRESET OPTIONS (Translator)
  const TRANS_PRESETS = [
    {
      id: 'precise',
      label: '🎯 정교한 번역',
      text: "원문의 의미를 왜곡하지 않고 정확하게 번역해 줘. 전문적인 용어가 있다면 적절하게 사용해 줘."
    },
    {
      id: 'xiaohongshu',
      label: '✨ 샤오홍슈 감성',
      text: "샤오홍슈(小红书)나 인스타그램 스타일로 번역해 줘. 이모지와 해시태그를 풍부하게 사용하고, 친근하고 트렌디한 말투를 사용해 줘."
    }
  ];

  // Load API key, history, AND Custom Instructions from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedHistory = localStorage.getItem('correction_history');
    const storedInstruction = localStorage.getItem('user_custom_instruction'); 
    const storedTransInstruction = localStorage.getItem('user_trans_instruction'); // Load trans instruction
    
    if (storedKey) setApiKey(storedKey);
    if (storedHistory) setHistory(JSON.parse(storedHistory));
    if (storedInstruction) setCustomInstruction(storedInstruction);
    if (storedTransInstruction) setTransInstruction(storedTransInstruction);
  }, []);

  // Save API key
  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowSettings(false);
  };

  // Save Custom Instruction whenever it changes
  const handleInstructionChange = (e) => {
    const newVal = e.target.value;
    setCustomInstruction(newVal);
    localStorage.setItem('user_custom_instruction', newVal);
  };

  // Save Translator Instruction whenever it changes
  const handleTransInstructionChange = (e) => {
    const newVal = e.target.value;
    setTransInstruction(newVal);
    localStorage.setItem('user_trans_instruction', newVal);
  };

  // Handle Preset Click
  const applyPreset = (text) => {
    setCustomInstruction(text);
    localStorage.setItem('user_custom_instruction', text);
  };

  // Handle Trans Preset Click
  const applyTransPreset = (text) => {
    setTransInstruction(text);
    localStorage.setItem('user_trans_instruction', text);
  };

  // Clear History
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('correction_history');
  };

  // Helper to decode base64 audio
  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Mock correction
  const mockCorrection = async () => {
    await new Promise(r => setTimeout(r, 1500));
    const isPolite = tone === 'polite';
    return {
      corrected: isPolite 
        ? "저는 프리랜서입니다. 축구와 주짓수를 하고 있고, 운동을 좋아합니다." 
        : "나는 프리랜서야. 축구랑 주짓수 하고 있고, 운동 좋아해.",
      explanation: "테스트 모드입니다. API 키를 입력하면 실제 AI가 동작합니다.",
      original: inputText
    };
  };

  // Real correction using Gemini API
  const correctText = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setResult(null);
    setChineseTranslation(null);
    setIsEditingResult(false); // Reset edit mode
    
    try {
      let data;
      
      if (!apiKey) {
        if (inputText.includes("나 프리랜서다")) {
            data = await mockCorrection();
        } else {
            alert("AI 기능을 사용하려면 설정(⚙️)에서 Google Gemini API 키를 입력해주세요. \n(테스트를 위해 '나 프리랜서다'를 입력해보세요.)");
            setLoading(false);
            return;
        }
      } else {
        const toneInstruction = tone === 'polite' 
          ? "Formal/Polite (존댓말, e.g., ~습니다, ~요) suitable for business or strangers." 
          : "Casual/Friendly (반말, e.g., ~야, ~어) suitable for close friends.";

        // Injecting the persistent custom instruction into the prompt
        const prompt = `
          You are a professional Korean editor helping a native Chinese speaker.
          
          USER PROFILE & PREFERENCE:
          "${customInstruction ? customInstruction : "No specific preference provided."}"
          
          Task: Correct the following Korean text to be grammatically correct and natural.
          TONE REQUIREMENT: ${toneInstruction}
          
          Input Text: "${inputText}"

          Output Format (JSON):
          {
            "corrected": "The corrected full text matching the requested tone",
            "explanation": "Brief explanation of corrections in Korean (focus on particles and tone adjustments)"
          }
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        const json = await response.json();
        if (json.error) throw new Error(json.error.message);

        const rawText = json.candidates[0].content.parts[0].text;
        data = JSON.parse(rawText);
        data.original = inputText;
      }

      setResult(data);
      setEditedResultText(data.corrected);
      
      const newHistory = [data, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('correction_history', JSON.stringify(newHistory));

    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Translate Corrected Text (Dual Version)
  const translateToChinese = async () => {
    if (!result || !apiKey) return;
    setIsTranslating(true);
    setChineseTranslation(null);
    
    const textToTranslate = isEditingResult ? editedResultText : result.corrected;

    try {
      // Prompt for Dual Translation
      const prompt = `
        Act as a professional translator and social media editor.
        Translate the following Korean text into Simplified Chinese (Zh-CN) in two distinct styles.

        Input Text: "${textToTranslate}"

        Output Format (JSON):
        {
          "precise": "Natural, sophisticated, native-level translation. Accurate to the original meaning.",
          "creative": "Xiaohongshu (Little Red Book) style. Use plenty of emojis, hashtags, and a trendy, conversational tone suitable for a viral social media post. Make it engaging, emotional, and visually appealing text."
        }
      `;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);
      
      const parsedData = JSON.parse(json.candidates[0].content.parts[0].text);
      setChineseTranslation(parsedData);
    } catch (error) {
      console.error(error);
      alert("Translation failed or API key missing.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Text to Speech
  const generateAudio = async () => {
    if (!result || !apiKey) return;
    setIsGeneratingAudio(true);

    const textToSpeak = isEditingResult ? editedResultText : result.corrected;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: textToSpeak }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Kore"
                }
              }
            }
          }
        })
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const base64Audio = json.candidates[0].content.parts[0].inlineData.data;
      const pcmData = base64ToArrayBuffer(base64Audio);
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + pcmData.byteLength, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
      view.setUint16(32, numChannels * (bitsPerSample / 8), true);
      view.setUint16(34, bitsPerSample, true);
      writeString(view, 36, 'data');
      view.setUint32(40, pcmData.byteLength, true);

      const blob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      setTimeout(() => {
        const audio = new Audio(url);
        audio.play();
      }, 100);

    } catch (error) {
      console.error(error);
      alert("Audio generation failed: " + error.message);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Quick Translator (Dual Version) with Instruction
  const runTranslation = async () => {
    if (!transInput.trim()) return;
    if (!apiKey) {
      alert("번역 기능을 사용하려면 설정(⚙️)에서 API 키를 입력해주세요.");
      return;
    }

    setTransLoading(true);
    setTransResult(null);

    try {
      const sourceLang = transDirection === 'kr2cn' ? "Korean" : "Chinese (Simplified)";
      const targetLang = transDirection === 'kr2cn' ? "Chinese (Simplified)" : "Korean";
      
      // Prompt for Dual Translation
      const prompt = `
        Act as a professional translator.
        Translate the following text from ${sourceLang} to ${targetLang} in two styles.

        USER INSTRUCTION: "${transInstruction ? transInstruction : "None"}"

        Text: "${transInput}"

        Output Format (JSON):
        {
          "precise": "Standard, high-quality, native-level translation. Accurate nuance.",
          "creative": "Xiaohongshu (Little Red Book) style. Use plenty of emojis, hashtags, and a trendy, conversational tone. If translating to Korean, use trendy Instagram/Blog style. If translating to Chinese, use Xiaohongshu style."
        }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);
      
      const parsedData = JSON.parse(json.candidates[0].content.parts[0].text);
      setTransResult(parsedData);
    } catch (error) {
      alert(`Translation Error: ${error.message}`);
    } finally {
      setTransLoading(false);
    }
  };

  const toggleEditResult = () => {
    if (isEditingResult) {
        // Save action
        setResult(prev => ({ ...prev, corrected: editedResultText }));
        setIsEditingResult(false);
    } else {
        // Edit action
        setEditedResultText(result.corrected);
        setIsEditingResult(true);
    }
  };

  const DiffView = ({ original, corrected }) => {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
          <span className="text-xs font-bold text-red-500 block mb-1">원본 (Original)</span>
          <p className="text-gray-700">{original}</p>
        </div>
        <div className={`bg-green-50 p-3 rounded-lg border ${isEditingResult ? 'border-teal-500 ring-2 ring-teal-200' : 'border-green-100'}`}>
          <span className="text-xs font-bold text-green-600 block mb-1">
             {isEditingResult ? "교정본 수정 중 (Editing...)" : "교정본 (Corrected)"}
          </span>
          {isEditingResult ? (
            <textarea 
                value={editedResultText}
                onChange={(e) => setEditedResultText(e.target.value)}
                className="w-full bg-white p-2 border border-green-200 rounded-md focus:outline-none text-gray-800 font-medium h-32 resize-y"
            />
          ) : (
            <p className="text-gray-800 font-medium whitespace-pre-wrap">{corrected}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 text-gray-800 font-sans selection:bg-teal-100 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-teal-600" size={24} />
            <h1 className="text-xl font-bold text-stone-800">바른 한국어 <span className="text-xs font-normal text-stone-500 ml-1">AI Assistant</span></h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* API Key Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">설정 (Settings)</h2>
              <button onClick={() => setShowSettings(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Google Gemini API 키를 입력하면 AI가 문맥을 파악하여 더 정확하게 교정해줍니다.
              <br/>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-teal-600 underline text-xs">
                여기서 무료 키 발급받기
              </a>
            </p>
            <input 
              type="password" 
              placeholder="API Key 입력 (AIza...)" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 mb-4 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">닫기</button>
              <button onClick={() => saveApiKey(apiKey)} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">저장하기</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-6">
        {/* Left Column: Input */}
        <div className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-stone-500">입력 (Input)</label>
              <div className="flex bg-stone-100 rounded-lg p-1">
                <button 
                  onClick={() => setTone('polite')}
                  className={`text-xs px-3 py-1 rounded-md transition-all ${tone === 'polite' ? 'bg-white text-teal-700 shadow-sm font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  존댓말
                </button>
                <button 
                  onClick={() => setTone('casual')}
                  className={`text-xs px-3 py-1 rounded-md transition-all ${tone === 'casual' ? 'bg-white text-teal-700 shadow-sm font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  반말
                </button>
              </div>
            </div>
            <textarea 
              className="flex-1 w-full p-3 resize-none border-0 focus:ring-0 text-lg leading-relaxed placeholder:text-stone-300 outline-none"
              placeholder={tone === 'polite' ? "예: 안녕하세요. 저는 프리랜서입니다." : "예: 안녕, 나 프리랜서야."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              spellCheck="false"
            />
            
            {/* Custom Instruction Input with Presets */}
            <div className="mt-2 pt-2 border-t border-dashed border-stone-200">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <StickyNote size={14} className="text-stone-400" />
                    <label className="text-xs font-bold text-stone-500">나의 프로필 / 요청사항 (자동저장)</label>
                  </div>
               </div>
               
               {/* Preset Buttons */}
               <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                 {PRESETS.map((preset) => (
                   <button
                     key={preset.id}
                     onClick={() => applyPreset(preset.text)}
                     className="whitespace-nowrap px-2 py-1 text-[11px] bg-stone-100 text-stone-600 rounded-md border border-stone-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors flex items-center gap-1"
                   >
                     {preset.label}
                   </button>
                 ))}
               </div>

               <textarea 
                  value={customInstruction}
                  onChange={handleInstructionChange}
                  placeholder="위 버튼을 눌러 선택하거나, 직접 입력하세요."
                  className="w-full text-sm p-2 bg-yellow-50/50 rounded-lg border border-stone-200 focus:border-teal-500 focus:outline-none placeholder:text-stone-400 text-stone-700 resize-y h-20"
               />
            </div>

            <div className="mt-4 flex justify-between items-center pt-4 border-t border-stone-100">
              <span className="text-xs text-stone-400">{inputText.length}자</span>
              <button 
                onClick={correctText}
                disabled={loading || !inputText.trim()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                  loading || !inputText.trim()
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                    : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md hover:shadow-lg transform active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    교정 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    교정하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="flex flex-col gap-4">
          {result ? (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-teal-100 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-bold text-teal-700 flex items-center gap-1 mt-1">
                  <Check size={16} /> 교정 결과
                </span>
                <div className="flex gap-1">
                   {/* TTS Button */}
                   <button 
                    onClick={generateAudio}
                    disabled={isGeneratingAudio}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                    title="발음 듣기"
                  >
                    {isGeneratingAudio ? <div className="w-3 h-3 border-2 border-stone-300 border-t-teal-600 rounded-full animate-spin"/> : <Volume2 size={16} />}
                    <span className="hidden sm:inline">듣기</span>
                  </button>

                   {/* Translate Button */}
                   <button 
                    onClick={translateToChinese}
                    disabled={isTranslating}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                    title="중국어로 의미 확인"
                  >
                    {isTranslating ? <div className="w-3 h-3 border-2 border-stone-300 border-t-teal-600 rounded-full animate-spin"/> : <Languages size={16} />}
                    <span className="hidden sm:inline">의미확인</span>
                  </button>

                   {/* Edit Button */}
                   <button 
                    onClick={toggleEditResult}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${isEditingResult ? 'text-teal-700 bg-teal-100' : 'text-stone-500 hover:text-teal-600 hover:bg-teal-50'}`}
                    title={isEditingResult ? "저장하기" : "직접 수정하기"}
                  >
                    {isEditingResult ? <Save size={16} /> : <Pencil size={16} />}
                    <span className="hidden sm:inline">{isEditingResult ? "저장" : "수정"}</span>
                  </button>

                   <button 
                    onClick={() => navigator.clipboard.writeText(isEditingResult ? editedResultText : result.corrected)}
                    className="text-stone-400 hover:text-teal-600 transition-colors p-1 ml-1"
                    title="복사하기"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              
              <DiffView original={result.original} corrected={result.corrected} />

              {/* Chinese Translation Result (Dual) */}
              {chineseTranslation && (
                 <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200 animate-in fade-in space-y-3">
                    <span className="text-xs font-bold text-stone-500 block">🇨🇳 의미 확인 (Chinese Translation)</span>
                    
                    {/* Precise Version */}
                    <div className="bg-white p-3 rounded border border-stone-100 shadow-sm">
                      <div className="flex items-center gap-1 mb-1 text-teal-700">
                        <Check size={12} />
                        <span className="text-xs font-bold">정교한 번역 (Precise)</span>
                      </div>
                      <p className="text-stone-700 text-sm">{chineseTranslation.precise}</p>
                    </div>

                    {/* Creative Version */}
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-3 rounded border border-rose-100 shadow-sm">
                       <div className="flex items-center gap-1 mb-1 text-rose-600">
                        <Sparkles size={12} />
                        <span className="text-xs font-bold">샤오홍슈 감성 (Xiaohongshu Style)</span>
                      </div>
                      <p className="text-stone-800 text-sm whitespace-pre-wrap leading-relaxed">{chineseTranslation.creative}</p>
                    </div>
                 </div>
              )}

              {result.explanation && (
                <div className="mt-6 bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-1">
                    <AlertCircle size={14} /> 교정 포인트 (Tip)
                  </h3>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-stone-400 bg-stone-100/50 rounded-xl border border-dashed border-stone-300">
              <User size={48} className="mb-4 text-stone-300" />
              <p>텍스트를 입력하고 교정 버튼을 눌러보세요.</p>
              <p className="text-sm mt-2 text-center">
                아래 <b>"나의 프로필 / 요청사항"</b>에서<br/>
                상황에 맞는 버튼(추천/비즈니스/SNS)을<br/>
                선택하면 AI가 더 똑똑해집니다!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* New Feature: Quick Translator (Dual Version) */}
      <section className="max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
            <Languages size={20} className="text-teal-600" /> 
            간편 번역기 (Quick Translator)
          </h2>
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3">
               <span className={`text-sm font-bold ${transDirection === 'kr2cn' ? 'text-teal-700' : 'text-gray-400'}`}>한국어 (Korean)</span>
               <button 
                 onClick={() => setTransDirection(prev => prev === 'kr2cn' ? 'cn2kr' : 'kr2cn')}
                 className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors text-stone-600"
                 title="언어 변경"
               >
                 <ArrowRightLeft size={16} />
               </button>
               <span className={`text-sm font-bold ${transDirection === 'cn2kr' ? 'text-teal-700' : 'text-gray-400'}`}>중국어 (Chinese)</span>
             </div>

             <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <textarea
                    value={transInput}
                    onChange={(e) => setTransInput(e.target.value)}
                    placeholder={transDirection === 'kr2cn' ? "번역할 한국어를 입력하세요." : "번역할 중국어를 입력하세요."}
                    className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 min-h-[140px] resize-none text-sm"
                  />
                  
                  {/* Translator Request/Instruction */}
                  <div className="pt-2 border-t border-dashed border-stone-200">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <StickyNote size={14} className="text-stone-400" />
                          <label className="text-xs font-bold text-stone-500">번역 요청사항 / 프로필 (자동저장)</label>
                        </div>
                     </div>
                     
                     {/* Preset Buttons */}
                     <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                       {TRANS_PRESETS.map((preset) => (
                         <button
                           key={preset.id}
                           onClick={() => applyTransPreset(preset.text)}
                           className="whitespace-nowrap px-2 py-1 text-[11px] bg-stone-100 text-stone-600 rounded-md border border-stone-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors flex items-center gap-1"
                         >
                           {preset.label}
                         </button>
                       ))}
                     </div>

                     <textarea 
                        value={transInstruction}
                        onChange={handleTransInstructionChange}
                        placeholder="위 버튼을 눌러 선택하거나, 직접 입력하세요. (예: 농사 관련 용어 사용해줘)"
                        className="w-full text-sm p-2 bg-yellow-50/50 rounded-lg border border-stone-200 focus:border-teal-500 focus:outline-none placeholder:text-stone-400 text-stone-700 resize-y h-16"
                     />
                  </div>
                </div>
                
                {/* Result Area */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 min-h-[200px] relative flex flex-col gap-2">
                  {transLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-stone-300 border-t-teal-600 rounded-full animate-spin" />
                    </div>
                  ) : transResult ? (
                    <div className="flex flex-col gap-3 h-full overflow-y-auto">
                      
                      {/* Precise Result */}
                      <div className="bg-white p-3 rounded border border-stone-200 shadow-sm relative group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                            <Check size={12} /> 정교한 번역
                          </span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(transResult.precise)}
                            className="text-stone-300 hover:text-teal-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="text-stone-800 text-sm whitespace-pre-wrap">{transResult.precise}</p>
                      </div>

                      {/* Creative Result */}
                      <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-3 rounded border border-rose-100 shadow-sm relative group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                            <Sparkles size={12} /> 샤오홍슈 감성
                          </span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(transResult.creative)}
                            className="text-rose-300 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="text-stone-800 text-sm whitespace-pre-wrap leading-relaxed">{transResult.creative}</p>
                      </div>

                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                      번역 결과가 여기에 두 가지 버전으로 표시됩니다.
                    </div>
                  )}
                </div>
             </div>
             
             <div className="flex justify-end">
               <button
                 onClick={runTranslation}
                 disabled={transLoading || !transInput.trim()}
                 className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 번역하기 (Translate)
               </button>
             </div>
          </div>
        </div>
      </section>

      {/* History Section */}
      {history.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8 border-t border-stone-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-stone-700 flex items-center gap-2">
              <RotateCcw size={18} /> 최근 기록
            </h2>
            <button onClick={clearHistory} className="text-xs text-stone-400 hover:text-red-500">기록 삭제</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-stone-200 hover:border-teal-200 transition-colors cursor-pointer" onClick={() => {
                setResult(item);
                setChineseTranslation(null); // Reset translation on history load
                setEditedResultText(item.corrected);
                setIsEditingResult(false);
              }}>
                <p className="text-xs text-stone-400 mb-1 line-clamp-1">{item.original}</p>
                <p className="text-sm font-medium text-stone-700 line-clamp-2">{item.corrected}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}