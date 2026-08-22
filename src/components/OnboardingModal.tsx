import React from 'react';
import { ShieldCheck, KeyRound, Sparkles, ArrowRight, X, ExternalLink } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  language: Language;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  language,
}) => {
  const t = translations[language].onboarding;

  if (!isOpen) return null;

  const steps = [
    {
      step: '01',
      title: t.step1Title,
      desc: t.step1Desc,
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      step: '02',
      title: t.step2Title,
      desc: t.step2Desc,
      icon: KeyRound,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      step: '03',
      title: t.step3Title,
      desc: t.step3Desc,
      icon: Sparkles,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              MDEdit
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              Bảo mật 100% Cục bộ
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div className="text-center my-4">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.welcomeTitle}
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            {t.welcomeSubtitle}
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${s.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mb-1">
                    {s.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold"
          >
            <span>Nhận Gemini API Key miễn phí</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cài đặt API Key
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>{t.getStarted}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
