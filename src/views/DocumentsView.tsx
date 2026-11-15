import React, { useMemo, useState } from 'react';
import { Download, FileText, X } from 'lucide-react';
import { MARITIME_DOCUMENTS } from '../data/documents';
import { SectionHeader } from '../components/common/SectionHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { DocumentCategory, MaritimeDocument } from '../types/maritime';

export const DocumentsView: React.FC = () => {
  const { t } = useLanguage();
  const [category, setCategory] = useState<'all' | DocumentCategory>('all');
  const [activeDoc, setActiveDoc] = useState<MaritimeDocument | null>(null);

  const filteredDocs = useMemo(() => {
    if (category === 'all') return MARITIME_DOCUMENTS;
    return MARITIME_DOCUMENTS.filter((d) => d.category === category);
  }, [category]);

  const categories: ('all' | DocumentCategory)[] = [
    'all',
    'clearance',
    'navigation',
    'safety',
    'compliance',
  ];

  const handleDownload = (doc: MaritimeDocument) => {
    const lines = [
      `WORLD MARINE GLOBAL — MARITIME DOCUMENT`,
      `Document Code: ${doc.code}`,
      `Title: ${doc.title}`,
      `Authority: ${doc.authority}`,
      `Updated: ${doc.updatedDate}`,
      ``,
      doc.summary,
      ``,
      ...doc.sections.flatMap((sec) => [
        `## ${sec.heading}`,
        ...sec.items.map((item) => `- ${item}`),
        ``,
      ]),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.code.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t.documents.title} subtitle={t.documents.subtitle} />

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-sky-400/20 bg-[#0A1628] p-1.5 w-fit">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              category === cat
                ? 'bg-sky-500/20 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.documents.categories[cat]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-col justify-between rounded-xl border border-sky-400/20 bg-[#0A1628] p-5"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <span className="font-mono text-sky-300">{doc.code}</span>
                <span>
                  {t.documents.categories[doc.category]} · {t.documents.updated} {doc.updatedDate}
                </span>
              </div>
              <h2 className="mt-2 font-display text-lg font-semibold text-slate-50">
                {doc.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{doc.summary}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-sky-400/15 pt-4">
              <span className="text-xs text-slate-400">{doc.authority}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400/50 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t.documents.downloadSummary}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDoc(doc)}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 whitespace-nowrap"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{t.documents.openDocument}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Document Reader Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-sky-400/25 bg-[#0A1628] p-6">
            <div className="flex items-start justify-between gap-4 border-b border-sky-400/15 pb-4">
              <div>
                <div className="font-mono text-xs text-sky-300">
                  {activeDoc.code} · {activeDoc.authority}
                </div>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-50">
                  {activeDoc.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                aria-label={t.common.close}
                className="rounded-md p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">{activeDoc.summary}</p>

            <div className="mt-5 space-y-5">
              {activeDoc.sections.map((section) => (
                <div key={section.heading} className="rounded-lg bg-[#040B16] p-4">
                  <h3 className="font-display text-sm font-semibold text-sky-300">
                    {section.heading}
                  </h3>
                  <ul className="mt-2.5 space-y-2 text-sm text-slate-200">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-sky-400/15 pt-4">
              <button
                type="button"
                onClick={() => handleDownload(activeDoc)}
                className="flex items-center gap-1.5 rounded-lg border border-sky-400/25 px-4 py-2 text-xs font-medium text-sky-300 hover:border-sky-400/50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.documents.downloadSummary}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
