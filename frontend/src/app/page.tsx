'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  ArrowRight, ShieldCheck, BrainCircuit, Users, MessageSquare, 
  FileText, CheckCircle2, Lock, Zap, ChevronDown, BarChart3,
  AlertTriangle, FileSearch, Shield
} from 'lucide-react';
import { useState } from 'react';

// --- Components ---

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#0a0f16]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <ShieldCheck className="text-white h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Audit<span className="text-emerald-400">Pro</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/login" className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0a0f16] font-bold text-sm transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)]">
            Start Audit
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-40 pb-20 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">AI-Powered Audit Platform</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6"
          >
            Smarter audits with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
              AI & Human Validation
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Upload your documents, get instant AI analysis, and collaborate with expert auditors in real time to secure your financial future.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0a0f16] font-bold text-lg transition-all shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] flex items-center justify-center gap-2">
              Start Your Audit <ArrowRight className="h-5 w-5" />
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-lg border border-white/10 transition-all flex items-center justify-center gap-2">
              See How It Works
            </a>
          </motion.div>
        </div>

        {/* Dashboard Preview Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 relative mx-auto max-w-5xl"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-transparent to-transparent z-10" />
          <div className="rounded-2xl border border-white/10 bg-[#0f1724] p-2 shadow-2xl relative overflow-hidden">
            {/* Top Bar of mockup */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#162032] rounded-t-xl">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
            </div>
            {/* Mockup Content */}
            <div className="grid grid-cols-12 gap-4 p-4">
              {/* Left sidebar */}
              <div className="col-span-3 space-y-2 hidden md:block">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-10 rounded-lg ${i === 2 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'} w-full`} />
                ))}
              </div>
              {/* Main Content */}
              <div className="col-span-12 md:col-span-6 space-y-4">
                <div className="h-32 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 p-4 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4">
                     <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold">
                       <CheckCircle2 className="h-3 w-3" /> AI Validated
                     </span>
                   </div>
                   <h3 className="text-white font-medium mb-2">Financial Risk Score</h3>
                   <div className="flex items-end gap-2">
                     <span className="text-4xl font-bold text-emerald-400">92</span>
                     <span className="text-slate-400 text-sm mb-1">/ 100</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 rounded-xl bg-white/5 border border-white/5" />
                  <div className="h-24 rounded-xl bg-white/5 border border-white/5" />
                </div>
              </div>
              {/* Right Sidebar - Chat */}
              <div className="col-span-12 md:col-span-3 rounded-xl bg-[#162032] border border-white/5 hidden lg:block p-4 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#162032] z-10 pointer-events-none" />
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><Users className="h-4 w-4 text-white" /></div>
                  <div>
                     <p className="text-xs text-white font-medium">Auditor Chat</p>
                     <p className="text-[10px] text-emerald-400">Online</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-emerald-500/20 text-emerald-100 text-xs p-2 rounded-lg rounded-tr-none ml-4 border border-emerald-500/30">
                    Documents look good. AI flagged one anomaly.
                  </div>
                  <div className="bg-white/10 text-slate-300 text-xs p-2 rounded-lg rounded-tl-none mr-4">
                    I will upload the missing invoice right away.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="py-24 bg-[#06090e] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
            Your financial data may hide <span className="text-red-400">critical risks</span>.
          </h2>
          <div className="space-y-4 mb-8">
            {[
              "Undetected financial inconsistencies",
              "Slow, manual, and error-prone audit processes",
              "Lack of real-time visibility on enterprise risks",
              "Poor, disconnected collaboration with auditors"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <AlertTriangle className="h-5 w-5 text-red-500/80 flex-shrink-0" />
                <span className="text-lg">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/10 blur-[80px] rounded-full" />
          <div className="relative bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
            <h3 className="text-6xl font-bold text-red-400 mb-4">70%</h3>
            <p className="text-xl text-white font-medium mb-2">of mid-sized companies</p>
            <p className="text-slate-400">have hidden financial inconsistencies that traditional manual audits miss during the first pass.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  const features = [
    {
      title: "AI Analysis", desc: "Automatic document parsing, anomaly detection, and instant risk scoring.",
      icon: BrainCircuit, color: "text-blue-400", bg: "bg-blue-400/10"
    },
    {
      title: "Human Validation", desc: "Expert review and correction of AI results using professional judgment.",
      icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400/10"
    },
    {
      title: "Real-Time Collaboration", desc: "Integrated chat, secure file sharing, and instant document requests.",
      icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-400/10"
    },
    {
      title: "Secure Infrastructure", desc: "End-to-end encrypted data, role-based access, and isolated storage.",
      icon: Lock, color: "text-amber-400", bg: "bg-amber-400/10"
    }
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            How our platform <span className="text-emerald-400">solves it</span>
          </h2>
          <p className="text-slate-400 text-lg">
            We combine the speed of artificial intelligence with the precision of human expertise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-8 hover:bg-slate-800/40 transition-colors group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${f.bg}`}>
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { title: "Upload Docs", icon: FileText },
    { title: "AI Analyzes", icon: BrainCircuit },
    { title: "Auditor Validates", icon: ShieldCheck },
    { title: "Collaborate", icon: MessageSquare },
    { title: "Get Report", icon: BarChart3 }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#06090e] border-y border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">How it works</h2>
          <p className="text-slate-400 text-lg">A seamless pipeline from upload to final report.</p>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-800 via-emerald-500/50 to-slate-800 -translate-y-1/2 hidden md:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[#0a0f16] border-2 border-emerald-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                  <step.icon className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="text-white font-medium text-center">{step.title}</h3>
                <span className="text-sm text-slate-500 mt-1">Step {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HighlightSections() {
  return (
    <section className="py-24 space-y-32">
      {/* Collaboration Feature */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1 relative">
          <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full" />
          <div className="relative bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="border-b border-white/5 pb-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center"><Users className="text-white h-5 w-5"/></div>
                 <div><p className="text-white text-sm font-bold">Auditor Sarah</p><p className="text-emerald-400 text-xs">Online</p></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-800 text-slate-200 text-sm p-3 rounded-xl rounded-tl-none w-[80%] border border-white/5">
                I've reviewed the AI analysis. Could you provide the Q3 expense receipts?
              </div>
              <div className="bg-emerald-500/20 text-emerald-100 text-sm p-3 rounded-xl rounded-tr-none w-[80%] ml-auto border border-emerald-500/30 text-right">
                Sure, I am uploading them right now to the secure bucket.
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Collaborate directly with your auditor
          </h2>
          <p className="text-slate-400 text-lg mb-6">
            Stop losing context in long email threads. Our built-in real-time chat connects you directly with the expert validating your AI results.
          </p>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Real-time messaging</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Secure file uploads in chat</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Integrated document requests</li>
          </ul>
        </div>
      </div>

      {/* Reports Feature */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Clear and actionable audit reports
          </h2>
          <p className="text-slate-400 text-lg mb-6">
            Get comprehensive PDF reports generated from AI insights and human annotations. Understand your risks instantly.
          </p>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Visual risk scoring</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Prioritized anomalies list</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Expert recommendations</li>
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full" />
          <div className="relative bg-[#162032] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <h4 className="text-white font-bold">Executive Summary</h4>
              <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                LOW RISK
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-slate-800 rounded-full w-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 w-[15%]" />
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <AlertTriangle className="h-4 w-4" /> <span className="text-sm font-bold">Medium Anomaly</span>
                </div>
                <p className="text-xs text-slate-400">Mismatch in Q2 reported VAT vs calculated VAT. Auditor note: Reviewed and justified by deferred payment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="security" className="py-24 bg-[#06090e] border-y border-white/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <Shield className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
          Your data is fully secured
        </h2>
        <p className="text-slate-400 text-lg mb-12">
          Enterprise-grade security built into the core. We protect your financial data with the highest industry standards.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "E2E Encryption", d: "Data encrypted in transit & at rest." },
            { t: "Role-Based Access", d: "Strict boundaries between clients & auditors." },
            { t: "Audit Logs", d: "Every action is traced and immutable." }
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl">
              <h4 className="text-white font-bold mb-2">{item.t}</h4>
              <p className="text-sm text-slate-400">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "How long does an audit take?", a: "AI analysis takes seconds. Human validation typically takes 24-48 hours depending on document complexity." },
    { q: "Is my data secure?", a: "Absolutely. We use self-hosted MinIO object storage with strict role-based access controls and full data encryption." },
    { q: "How does AI work in this platform?", a: "We use advanced LLMs (Mistral/OpenAI) to extract context, calculate risk scores, and detect anomalies in financial reports structure." },
    { q: "Can I interact with the auditor?", a: "Yes! Our platform features integrated real-time WebSockets chat linked directly to your active audit." },
    { q: "What documents are required?", a: "Standard financial statements, tax returns, and corporate legal documents. PDF and Excel files up to 50MB." }
  ];

  return (
    <section id="faq" className="py-24 max-w-3xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details key={i} className="group bg-slate-900/40 border border-white/5 rounded-2xl [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between p-6 cursor-pointer text-white font-medium">
              {faq.q}
              <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-6 text-slate-400 leading-relaxed border-t border-white/5 pt-4">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f16] to-[#06090e] z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
          Ready to transform your audit experience?
        </h2>
        <p className="text-xl text-slate-400 mb-10">
          Join modern enterprises securing their compliance with AI and human expertise.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0a0f16] font-bold text-xl transition-all shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_50px_rgba(52,211,153,0.5)] hover:-translate-y-1">
          Get Started Now <ArrowRight className="h-6 w-6" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#06090e] py-12 text-center text-slate-500 text-sm">
      <p>&copy; {new Date().getFullYear()} AuditPro SaaS. High-Security Platform.</p>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f16] text-slate-50 font-sans selection:bg-emerald-500/30 selection:text-emerald-100 overflow-x-hidden">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <Workflow />
      <HighlightSections />
      <SecuritySection />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
