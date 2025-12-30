import React from 'react';
import { TOOLS } from '../constants';
import { ToolId } from '../types';
import { Mail, Github, Twitter, Linkedin, Dribbble } from 'lucide-react';

interface FooterProps {
  getToolPath: (toolId: ToolId) => string;
}

const Footer: React.FC<FooterProps> = ({ getToolPath }) => {
  const pdfTools = TOOLS.filter(t => ['pdf_editor', 'pdf_to_word', 'pdf_splitter', 'pdf_watermark', 'pdf', 'pdf_resizer', 'pdf_merge', 'text_to_pdf', 'text_to_ppt', 'pdf_to_ppt', 'pdf_to_excel'].includes(t.id));
  const imageTools = TOOLS.filter(t => ['resize', 'edit', 'bg_remover', 'compress', 'filters', 'converter', 'watermark', 'text', 'drawing', 'social', 'bulk'].includes(t.id));

  const getCompanyPath = (item: string) => {
    const itemLower = item.toLowerCase().trim();
    const map: Record<string, string> = {
      'about ilovpdf': '/seo/about.html',
      'privacy policy': '/seo/privacy.html',
      'terms of use': '/seo/terms.html',
      'contact': '/seo/contact.html',
      'faq': '/#faq'
    };
    return map[itemLower] || '#';
  };

  return (
    <footer className="bg-slate-50 dark:bg-[#030308] border-t border-slate-200 dark:border-white/5 pt-20 pb-10 px-6 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
        <div className="col-span-2 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg">i</div>
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">ilovpdf</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
            The first 100% client-side, privacy-first document and image studio.
            Process your sensitive files securely without ever uploading them to any server.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500 hover:text-purple-500 transition-colors"><Twitter size={18} /></a>
            <a href="#" className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500 hover:text-purple-500 transition-colors"><Github size={18} /></a>
            <a href="#" className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500 hover:text-purple-500 transition-colors"><Linkedin size={18} /></a>
            <a href="#" className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500 hover:text-purple-500 transition-colors"><Dribbble size={18} /></a>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">PDF Tools</h4>
          <ul className="space-y-3">
            {pdfTools.map(tool => (
              <li key={tool.id}>
                <a
                  href={getToolPath(tool.id as ToolId)}
                  className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {tool.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Image Tools</h4>
          <ul className="space-y-3">
            {imageTools.map(tool => (
              <li key={tool.id}>
                <a
                  href={getToolPath(tool.id as ToolId)}
                  className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {tool.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Company</h4>
          <ul className="space-y-3">
            {['About ilovpdf', 'Privacy Policy', 'Terms of Use', 'Contact', 'FAQ'].map(item => (
              <li key={item}>
                <a
                  href={getCompanyPath(item)}
                  className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          © {new Date().getFullYear()} ILOVPDF STUDIO • BROWSER-POWERED COMPUTING
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">All Systems Operational</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
