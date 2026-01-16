
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface AnalysisResult {
  imagingType: string;
  organName: string;
  findings: string;
  professionalDetails: string[];
}

enum AppState {
  IDLE = 'IDLE',
  CAMERA = 'CAMERA',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

// --- AI Service ---
const performAIAnalysis = async (base64Image: string): Promise<AnalysisResult> => {
  // ملاحظة: يتم استخدام المفتاح الموفر تلقائياً عبر البيئة البرمجية
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const model = 'gemini-3-flash-preview';

  const prompt = `
    أنت خبير أشعة عالمي في نظام "X-Ray with Blue". حلل هذه الصورة بدقة طبية عالية.
    يجب أن يكون الرد باللغة العربية حصراً وبصيغة JSON.
    التفاصيل المطلوبة:
    1. نوع التصوير (مثال: أشعة سينية لليد، أشعة مقطعية للصدر).
    2. اسم العضو المصور.
    3. النتائج والملاحظات الطبية الأساسية.
    4. قائمة بتفاصيل احترافية دقيقة يراها المختصون.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          imagingType: { type: Type.STRING },
          organName: { type: Type.STRING },
          findings: { type: Type.STRING },
          professionalDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['imagingType', 'organName', 'findings', 'professionalDetails'],
      }
    }
  });

  return JSON.parse(response.text) as AnalysisResult;
};

// --- Camera Component ---
const CameraInterface: React.FC<{ onCapture: (b64: string) => void, onCancel: () => void }> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
    }).then(s => {
      stream = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    }).catch(() => alert("يرجى تفعيل صلاحيات الكاميرا للمتابعة"));

    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const handleSnap = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      onCapture(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="p-6 flex justify-between items-center text-white bg-black/40 backdrop-blur-md absolute top-0 w-full z-10">
        <h2 className="font-bold">كاميرا X-Ray with Blue</h2>
        <button onClick={onCancel} className="bg-red-500/20 text-red-400 px-4 py-1 rounded-full text-sm font-bold border border-red-500/30">إغلاق</button>
      </div>
      <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
      <div className="p-10 bg-zinc-950 flex justify-center items-center gap-10">
        <button 
          onClick={handleSnap} 
          className="w-20 h-20 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center active:scale-90 transition-transform"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-full"></div>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// --- Main App ---
const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const startProcessing = async (base64: string) => {
    setImagePreview(`data:image/jpeg;base64,${base64}`);
    setState(AppState.ANALYZING);
    try {
      const data = await performAIAnalysis(base64);
      setResult(data);
      setState(AppState.RESULT);
    } catch (err) {
      setErrorMsg("عذراً، لم نتمكن من تحليل الصورة. تأكد من وضوح الأشعة وحاول مجدداً.");
      setState(AppState.ERROR);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        startProcessing(b64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="medical-blue text-white p-6 shadow-2xl sticky top-0 z-50">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-lg">
               <svg className="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.243 14.243a1 1 0 101.414-1.414l-.707-.707a1 1 0 10-1.414 1.414l.707.707zM4.343 14.243a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">X-Ray with Blue</h1>
              <p className="text-[9px] opacity-80 font-bold uppercase tracking-widest">التشخيص الذكي المتطور</p>
            </div>
          </div>
          {state !== AppState.IDLE && (
            <button onClick={() => setState(AppState.IDLE)} className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black border border-white/20">الرئيسية</button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto p-5 pt-8">
        {state === AppState.IDLE && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-40"></div>
               <h2 className="text-3xl font-black text-slate-800 mb-2 relative z-10">حلل أشعتك الآن</h2>
               <p className="text-slate-500 font-medium relative z-10 mb-8">اختر الطريقة المناسبة للبدء بالفحص</p>

               <div 
                onClick={() => uploadInputRef.current?.click()}
                className="bg-blue-50 border-4 border-dashed border-blue-200 rounded-3xl p-10 cursor-pointer hover:bg-blue-100 transition-all group mb-4"
               >
                 <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 </div>
                 <span className="text-lg font-bold text-blue-800 block">رفع صورة الأشعة</span>
                 <span className="text-xs text-blue-400 font-medium">من الاستوديو أو الملفات</span>
                 <input type="file" ref={uploadInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
               </div>

               <button 
                onClick={() => setState(AppState.CAMERA)}
                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
               >
                 <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 فتح الكاميرا للتصوير المباشر
               </button>
            </div>

            <div className="bg-amber-50 border-r-4 border-amber-500 p-5 rounded-2xl text-amber-900 shadow-sm">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                <p className="text-xs font-medium leading-relaxed italic">
                  تنبيه: تطبيق X-Ray with Blue هو أداة تقنية مساعدة وليس بديلاً عن التشخيص الطبي المتخصص. يجب مراجعة الطبيب المختص قبل اتخاذ أي قرار صحي.
                </p>
              </div>
            </div>
          </div>
        )}

        {state === AppState.CAMERA && <CameraInterface onCapture={startProcessing} onCancel={() => setState(AppState.IDLE)} />}

        {state === AppState.ANALYZING && (
          <div className="py-24 text-center space-y-8 animate-pulse">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-8 border-blue-100 rounded-full"></div>
              <div className="absolute top-0 w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800">جاري معالجة البيانات</h3>
              <p className="text-slate-500 font-bold italic tracking-wider">Blue is thinking...</p>
            </div>
          </div>
        )}

        {state === AppState.RESULT && result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 overflow-hidden">
               <div className="flex flex-col gap-6">
                 <div className="relative group overflow-hidden rounded-3xl border-4 border-slate-50">
                   <img src={imagePreview!} className="w-full h-56 object-cover" />
                   <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-blue-600 border border-blue-100 shadow-sm">Blue Scan #001</div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-4 rounded-2xl border-r-4 border-blue-600">
                     <p className="text-[10px] text-slate-400 font-black uppercase">نوع الفحص</p>
                     <p className="text-sm font-black text-slate-800">{result.imagingType}</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl border-r-4 border-emerald-500">
                     <p className="text-[10px] text-slate-400 font-black uppercase">العضو المكتشف</p>
                     <p className="text-sm font-black text-slate-800">{result.organName}</p>
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-slate-50">
              <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-full animate-ping"></span> الخلاصة الطبية
              </h3>
              <p className="text-slate-700 leading-relaxed font-medium bg-blue-50/30 p-4 rounded-2xl border border-blue-50">{result.findings}</p>
            </div>

            <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-2xl">
              <h3 className="text-blue-400 font-bold mb-4 italic flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04a11.357 11.357 0 00-1.573 5.791c0 3.839 1.89 7.238 4.765 9.29L12 21l.426-.426a11.957 11.957 0 004.765-9.29c0-2.108-.566-4.125-1.572-5.791z" /></svg>
                تفاصيل احترافية (Professional)
              </h3>
              <ul className="space-y-3">
                {result.professionalDetails.map((item, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-3 leading-relaxed">
                    <span className="text-blue-500 font-black">▶</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-4 no-print pb-8">
              <button onClick={() => setState(AppState.IDLE)} className="flex-1 bg-white border-2 border-slate-200 py-5 rounded-2xl font-black text-slate-600 shadow-sm active:scale-95 transition-all">إلغاء وفحص جديد</button>
              <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all">تصدير التقرير</button>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="text-center py-20 animate-in zoom-in duration-300">
            <div className="bg-white p-10 rounded-[2.5rem] border border-red-50 shadow-xl">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-red-600 font-bold mb-8">{errorMsg}</p>
              <button onClick={() => setState(AppState.IDLE)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold active:scale-95 transition-all">الرجوع للبداية</button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-10 opacity-20 text-[9px] font-black uppercase tracking-[0.5em] safe-area-bottom">
        X-Ray with Blue System • Professional v3.0
      </footer>
    </div>
  );
};

export default App;
