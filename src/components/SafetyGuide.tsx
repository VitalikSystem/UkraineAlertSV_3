import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Flame,
  AlertOctagon,
  HeartPulse,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const SafetyGuide: React.FC = () => {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const emergencyContacts = [
    { number: '101', name: 'ДСНС України', desc: 'Пожежно-рятувальна служба, ліквідація наслідків обстрілів, розмінування' },
    { number: '102', name: 'Національна поліція', desc: 'Фіксація руйнувань, виявлення підозрілих предметів та осіб' },
    { number: '103', name: 'Екстрена медична допомога', desc: 'Невідкладна медична допомога постраждалим' },
    { number: '112', name: 'Єдиний номер допомоги', desc: 'Універсальний номер екстрених служб (аналог 911)' },
  ];

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedPhone(num);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const steps = [
    {
      title: '1. Спокійний вихід з укриття',
      desc: 'Не біжіть та не створюйте тисняву у дверях сховища. Пропустіть вперед людей похилого віку, вагітних та батьків з маленькими дітьми. Перевірте, чи не забули ви особисті речі та документи.',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: '2. Перевірка приміщень та комунікацій',
      desc: 'Повернувшись додому або на робоче місце, огляньте вікна та стіни на наявність пошкоджень. Перевірте, чи немає витоку побутового газу, запаху диму або обривів електромережі. За наявності запаху газу — негайно перекрийте вентиль і провітріть.',
      icon: <Flame className="w-5 h-5 text-amber-400" />,
    },
    {
      title: '3. Мінна безпека: Правило трьох "НЕ"',
      desc: 'Якщо ви помітили підозрілий предмет, уламки збитої ракети чи безпілотника: 1) НЕ підходьте; 2) НЕ торкайтеся; 3) Відійдіть на безпечну відстань (не менше 100 метрів) і негайно телефонуйте за номером 101 або 102. Не знімайте та не публікуйте фото в соцмережах.',
      icon: <AlertOctagon className="w-5 h-5 text-red-400" />,
    },
    {
      title: '4. Зв’язок з рідними без перевантаження мережі',
      desc: 'Надішліть рідним коротке повідомлення "Все гаразд" у месенджерах або через SMS. Уникайте довгих телефонних розмов, щоб не перевантажувати базові станції мобільного зв’язку.',
      icon: <HeartPulse className="w-5 h-5 text-blue-400" />,
    },
  ];

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950 rounded-xl border border-emerald-800 text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Алгоритм дій після сигналу «Відбій повітряної тривоги»
            </h3>
            <p className="text-xs text-slate-400">
              Офіційні рекомендації Державної служби України з надзвичайних ситуацій (ДСНС)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
        >
          <span>{isExpanded ? 'Згорнути' : 'Розгорнути'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* 4 Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  {step.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight">{step.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Emergency Contacts Strip */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 mb-2.5">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Екстрені служби порятунку України:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.number}
                  className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {contact.number}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(contact.number)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all"
                        title="Скопіювати номер"
                      >
                        {copiedPhone === contact.number ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] font-bold text-slate-200 mt-0.5">
                      {contact.name}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                    {contact.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
