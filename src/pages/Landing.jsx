import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Compass, Crosshair, GraduationCap, Briefcase, FileText, Mic,
  Landmark, Building2, ShieldCheck, Rocket, Map, FlaskConical, Users, BarChart3, Check,
  Zap, BrainCircuit, BookOpen, Trophy, Clock, Target, Play, Globe2, Lock, Eye,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../store/AppStore';
import { Button, Card, Badge, Accordion, SectionHeading, DemoTag, Meter } from '../components/ui/primitives';
import { cn, useRevealGroup, useCountUp, useMediaQuery } from '../lib/utils';
import { AIParticles, GlowOrb } from '../components/Background';

const STEPS = [
  { n: '01', icon: Users, key: 'land.how.s1t', desc: 'land.how.s1d' },
  { n: '02', icon: Crosshair, key: 'land.how.s2t', desc: 'land.how.s2d' },
  { n: '03', icon: Compass, key: 'land.how.s3t', desc: 'land.how.s3d' },
  { n: '04', icon: Rocket, key: 'land.how.s4t', desc: 'land.how.s4d' },
  { n: '05', icon: Briefcase, key: 'land.how.s5t', desc: 'land.how.s5d' },
];

const WHY = [
  { icon: Target, t: ['Clarity, not guesswork', 'अनुमान नहीं, स्पष्टता'], d: ['Students see ranked career matches with the reasoning, required skills and the exact gap between where they are and where the role expects them to be.', 'छात्र रैंक किए गए करियर मैच देखते हैं — कारण, आवश्यक कौशल और उनकी वर्तमान स्थिति व अपेक्षा के बीच का अंतर।'] },
  { icon: Zap, t: ['Guidance that scales', 'बड़े पैमाने पर मार्गदर्शन'], d: ['One counsellor cannot personalise for 800 students. CareerX gives every student their own mentor, in their own language, available at 2 a.m. before a deadline.', 'एक काउंसलर 800 छात्रों को व्यक्तिगत मार्गदर्शन नहीं दे सकते। CareerX हर छात्र को अपना मेंटर देता है — उनकी भाषा में, रात 2 बजे भी।'] },
  { icon: ShieldCheck, t: ['Honest about its limits', 'अपनी सीमाओं के प्रति ईमानदार'], d: ['Every score shows how it was calculated, and every listing is labelled sample data. No fake deadlines, no invented AI predictions, no guaranteed-outcome claims.', 'हर स्कोर अपनी गणना दिखाता है और हर सूची नमूना डेटा कहलाती है। न नकली तारीख़ें, न बनावटी दावे।'] },
  { icon: Globe2, t: ['Bilingual from day one', 'पहले दिन से द्विभाषी'], d: ['The whole product — navigation, AI feedback, interview questions, admin analytics — switches between English and हिंदी instantly.', 'पूरा प्रोडक्ट — नेविगेशन, AI फ़ीडबैक, इंटरव्यू प्रश्न, एडमिन एनालिटिक्स — English और हिंदी में तुरंत बदलता है।'] },
  { icon: Map, t: ['Plans you can actually follow', 'व्यवहारिक योजनाएँ'], d: ['A six-month roadmap plus a 30-60-90 day challenge with tickable tasks, so motivation turns into completed actions.', 'छह महीने का रोडमैप और 30-60-90 दिन की चुनौती — टिक करने योग्य कार्यों के साथ।'] },
  { icon: Building2, t: ['Built for institutions too', 'संस्थानों के लिए भी'], d: ['Placement cells get cohort readiness, common skill gaps and intervention signals instead of chasing spreadsheets.', 'प्लेसमेंट सेल को कोहोर्ट तैयारी, आम स्किल गैप और हस्तक्षेप संकेत मिलते हैं, स्प्रेडशीट का पीछा नहीं।'] },
];

const AI_CARDS = [
  { icon: Users, key: 'land.ai.c1t', desc: 'land.ai.c1d' },
  { icon: Eye, key: 'land.ai.c2t', desc: 'land.ai.c2d' },
  { icon: Rocket, key: 'land.ai.c3t', desc: 'land.ai.c3d' },
  { icon: Globe2, key: 'land.ai.c4t', desc: 'land.ai.c4d' },
];

const FAQ = [
  {
    q: ['Is CareerX free for students?', 'क्या CareerX छात्रों के लिए मुफ़्त है?'],
    a: ['In this hackathon build, yes — everything runs in your browser with local demo data. A production version would keep the student tier free and charge institutions for cohort analytics.', 'इस हैकाथॉन बिल्ड में हाँ — सब कुछ आपके ब्राउज़र में लोकल डेमो डेटा से चलता है। उत्पादन संस्करण में छात्र टियर मुफ़्त रहेगा और संस्थानों से कोहोर्ट एनालिटिक्स के लिए शुल्क लिया जाएगा।'],
  },
  {
    q: ['Is the AI a real language model?', 'क्या यह वास्तविक AI भाषा मॉडल है?'],
    a: ['No, and the app says so everywhere. Recommendations come from a transparent rule-based engine running on your own profile data. The service layer (src/services/aiService.js) is written so a real model API can be connected without changing any screen.', 'नहीं, और ऐप हर जगह यही कहता है। सुझाव आपके अपने प्रोफ़ाइल डेटा पर चलने वाले पारदर्शी नियम-आधारित इंजन से आते हैं। सेवा परत इस तरह लिखी गई है कि वास्तविक मॉडल API जोड़ने पर कोई स्क्रीन नहीं बदलनी पड़ेगी।'],
  },
  {
    q: ['Are the jobs, internships and government listings real?', 'क्या नौकरियाँ, इंटर्नशिप और सरकारी सूचियाँ वास्तविक हैं?'],
    a: ['They are clearly-labelled sample data with fictional employers. Government entries link to real official portals but never show invented deadlines — you must verify dates yourself.', 'ये स्पष्ट रूप से चिह्नित नमूना डेटा हैं जिनमें काल्पनिक नियोक्ता हैं। सरकारी प्रविष्टियाँ वास्तविक आधिकारिक पोर्टल से जुड़ती हैं पर काल्पनिक तिथियाँ नहीं दिखातीं — तिथियाँ आपको स्वयं सत्यापित करनी होंगी।'],
  },
  {
    q: ['Does the match percentage predict that I will get the job?', 'क्या मैच प्रतिशत बताता है कि मुझे नौकरी मिलेगी?'],
    a: ['No. It measures overlap between your current skills and what that role typically requires, plus your stated interests. It is guidance for where to invest effort next — never a guarantee or an employment probability.', 'नहीं। यह आपके वर्तमान कौशल और उस भूमिका की सामान्य आवश्यकताओं, साथ ही आपकी रुचियों की समानता मापता है। यह मार्गदर्शन है — गारंटी या रोज़गार संभावना नहीं।'],
  },
  {
    q: ['Does voice input work everywhere?', 'क्या वॉइस इनपुट हर जगह काम करता है?'],
    a: ['Voice uses the browser Web Speech API, so it works where the browser supports it (Chrome, Edge, Safari). If it is unsupported or permission is denied, CareerX tells you plainly and text input keeps working.', 'वॉइस ब्राउज़र वेब स्पीच API उपयोग करता है, इसलिए जहाँ ब्राउज़र समर्थित है वहीं काम करता है। असमर्थित होने या अनुमति न मिलने पर CareerX साफ़ बताता है और टेक्स्ट इनपुट चलता रहता है।'],
  },
  {
    q: ['What happens to my data?', 'मेरे डेटा का क्या होता है?'],
    a: ['Account, profile and progress data sync to the local MySQL API and are cached in this browser. You can delete your account from Profile → Data controls. Bundled career reference catalogs are sample data.', 'खाता, प्रोफ़ाइल और प्रगति का डेटा लोकल MySQL API से sync होता है और इस ब्राउज़र में cache रहता है। Profile → Data controls से खाता हटाया जा सकता है। करियर reference catalogs नमूना डेटा हैं।'],
  },
  {
    q: ['Can our college use this for a whole batch?', 'क्या हमारा कॉलेज इसे पूरे बैच के लिए उपयोग कर सकता है?'],
    a: ['That is exactly what the Institution Dashboard is for: cohort readiness, common gaps, participation and intervention signals. Connect a real backend and student accounts, then roll it out branch by branch.', 'इंस्टिट्यूशन डैशबोर्ड इसी के लिए है: कोहोर्ट तैयारी, आम गैप, भागीदारी और हस्तक्षेप संकेत। वास्तविक बैकएंड और छात्र खाते जोड़ें, फिर ब्रांच-दर-ब्रांच लागू करें।'],
  },
];

const JOURNEY = [
  { day: ['Day 1', 'दिन 1'], t: ['Profile + first intelligence report', 'प्रोफ़ाइल + पहली इंटेलिजेंस रिपोर्ट'], d: ['Nine minutes from signup to a ranked list of careers with reasons.', 'साइनअप से कारण सहित रैंक किए गए करियर तक नौ मिनट।'] },
  { day: ['Week 2', 'सप्ताह 2'], t: ['First gap closed', 'पहला गैप भरा'], d: ['SQL basics finished, skill level raised, readiness score moves up.', 'SQL बुनियाद पूरी, कौशल स्तर बढ़ा, रेडीनेस स्कोर ऊपर गया।'] },
  { day: ['Day 30', 'दिन 30'], t: ['First project shipped', 'पहला प्रोजेक्ट शिप हुआ'], d: ['A repo with a real README, published from the Project Lab checklist.', 'वास्तविक README वाला repo, प्रोजेक्ट लैब चेकलिस्ट से प्रकाशित।'] },
  { day: ['Day 60', 'दिन 60'], t: ['Resume crosses 75', 'रिज़्यूमे 75 पार'], d: ['ATS keyword coverage fixed and bullets rewritten with impact.', 'ATS कीवर्ड कवरेज ठीक हुई और बुलेट प्रभाव के साथ फिर लिखे गए।'] },
  { day: ['Day 90', 'दिन 90'], t: ['Interviews + applications', 'इंटरव्यू + आवेदन'], d: ['Three mock interviews attempted and ten matched applications submitted.', 'तीन मॉक इंटरव्यू दिए और दस मैच्ड आवेदन जमा किए।'] },
];

const GOV_CATS = [
  { icon: Landmark, t: ['Central Government', 'केंद्र सरकार'], n: 'UPSC · SSC · IBPS' },
  { icon: Building2, t: ['State Government', 'राज्य सरकार'], n: ['State PSCs · Revenue · Police', 'राज्य PSC · राजस्व · पुलिस'] },
  { icon: Zap, t: ['Public Sector', 'सार्वजनिक क्षेत्र'], n: ['PSU · Energy · Defence R&D', 'PSU · ऊर्जा · रक्षा अनुसंधान'] },
  { icon: FileText, t: ['Competitive Exams', 'प्रतियोगी परीक्षाएँ'], n: 'GATE · CAT · UGC NET' },
  { icon: GraduationCap, t: ['Apprenticeships', 'अप्रेंटिसशिप'], n: ['Skill India · NAPS', 'स्किल इंडिया · NAPS'] },
];

export default function Landing() {
  const { t, L, lang } = useI18n();
  const { user } = useApp();
  const groupRef = useRevealGroup([]);
  const isMobile = useMediaQuery('(max-width: 640px)');

  const stats = [
    { icon: Map, k: 'land.stats.roadmaps', value: 5, suffix: '+', sub: L(['Career paths mapped per student', 'प्रति छात्र मैप किए गए करियर पथ']) },
    { icon: Crosshair, k: 'land.stats.gap', value: 36, suffix: '', sub: L(['Skills analysed across 4 categories', '4 श्रेणियों में विश्लेषित कौशल']) },
    { icon: Briefcase, k: 'land.stats.match', value: 28, suffix: '', sub: L(['Sample opportunities matched', 'मैच किए गए नमूना अवसर']) },
    { icon: FileText, k: 'land.stats.resume', value: 12, suffix: '', sub: L(['ATS-style resume checks', 'ATS-शैली रिज़्यूमे जाँच']) },
    { icon: Mic, k: 'land.stats.interview', value: 45, suffix: '', sub: L(['Interview questions across 5 tracks', '5 ट्रैक में इंटरव्यू प्रश्न']) },
  ];

  return (
    <div ref={groupRef} className="relative">
      {/* ============================== HERO ============================== */}
      <section id="top" className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:pb-24 lg:pt-36">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] opacity-70"><AIParticles count={isMobile ? 0 : 30} /></div>
        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div>
            <span className="chip chip-brand reveal in" data-reveal data-reveal-index="0">
              <Sparkles className="h-3 w-3" aria-hidden />{t('land.hero.eyebrow')}
            </span>
            <h1 className="h-display mt-5 text-[2.4rem] leading-[1.05] text-balance sm:text-6xl lg:text-[4.1rem]">
              <span className="block">{t('land.hero.title1')}</span>
              <span className="gradient-text block">{t('land.hero.title2')}</span>
            </h1>
            <p className="muted mt-5 max-w-xl text-[15px] leading-relaxed sm:text-base">{t('land.hero.sub')}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button to={user ? '/app/dashboard' : '/signup'} size="lg" icon={Rocket} iconRight={ArrowRight}>
                {t('land.hero.cta1')}
              </Button>
              <Button href="#how" variant="ghost" size="lg" icon={Play}>{t('land.hero.cta2')}</Button>
            </div>
            <p className="muted mt-3.5 text-xs">{t('land.hero.note')}</p>

            <dl className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((s, i) => <HeroStat key={s.k} {...s} label={t(s.k)} index={i} />)}
            </dl>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* ============================== WHY ============================== */}
      <section id="why" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading eyebrow={L(['The problem we solve', 'हम जिस समस्या का समाधान करते हैं'])} title={t('land.why.title')} sub={t('land.why.sub')} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w, i) => (
            <Card key={w.t[0]} hover className="reveal" data-reveal data-reveal-index={i}>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><w.icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-4 font-display text-[15px] font-bold">{L(w.t)}</h3>
              <p className="muted mt-2 text-[13px] leading-relaxed">{L(w.d)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section id="how" className="relative border-y border-line bg-surface/40 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <SectionHeading eyebrow={L(['Five steps', 'पाँच चरण'])} title={t('land.how.title')} sub={t('land.how.sub')} align="center" />
          <ol className="relative mt-10 grid gap-5 md:grid-cols-5">
            <span className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent md:block" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.n} className="reveal relative" data-reveal data-reveal-index={i}>
                <Card hover className="relative h-full text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-brand/35 bg-surface text-brand shadow-glow">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="gradient-text mt-3 font-display text-2xl font-extrabold tabular-nums">{s.n}</div>
                  <h3 className="mt-1 font-display text-[15px] font-bold">{t(s.key)}</h3>
                  <p className="muted mt-2 text-[12.5px] leading-relaxed">{t(s.desc)}</p>
                </Card>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex justify-center">
            <Button to={user ? '/app/dashboard' : '/signup'} iconRight={ArrowRight}>{t('land.hero.cta1')}</Button>
          </div>
        </div>
      </section>

      {/* ============================ AI INTELLIGENCE ============================ */}
      <section id="ai" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow={<span className="inline-flex items-center gap-1.5"><BrainCircuit className="h-3 w-3" aria-hidden />{L(['The engine', 'इंजन'])}</span>} title={t('land.ai.title')} sub={t('land.ai.sub')} />
            <div className="grid gap-3 sm:grid-cols-2">
              {AI_CARDS.map((c, i) => (
                <Card key={c.key} hover className="reveal" data-reveal data-reveal-index={i}>
                  <c.icon className="h-4 w-4 text-accent" aria-hidden />
                  <h3 className="mt-2.5 font-display text-sm font-bold">{t(c.key)}</h3>
                  <p className="muted mt-1.5 text-[12.5px] leading-relaxed">{t(c.desc)}</p>
                </Card>
              ))}
            </div>
            <p className="muted mt-5 flex items-start gap-2 rounded-xl border border-line bg-surface2/60 p-3 text-[12px] leading-relaxed">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              {t('common.disclaimer')} {t('common.methodNote')}
            </p>
          </div>
          <IntelligenceVisual />
        </div>
      </section>

      {/* ============================ SKILL GAP ============================ */}
      <section className="border-y border-line bg-surface/40 py-16 lg:py-24">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading eyebrow={<span className="inline-flex items-center gap-1.5"><Crosshair className="h-3 w-3" aria-hidden />{L(['Diagnosis', 'निदान'])}</span>} title={t('land.gap.title')} sub={t('land.gap.sub')} />
            <ul className="mt-4 space-y-2.5">
              {[
                ['Four categories: technical, soft skills, tools, industry', 'चार श्रेणियाँ: तकनीकी, सॉफ्ट स्किल्स, टूल्स, इंडस्ट्री'],
                ['Each gap shows why it matters, difficulty and hours needed', 'हर गैप बताता है क्यों ज़रूरी है, कठिनाई और आवश्यक घंटे'],
                ['“Close this skill gap” adds the course to your plan instantly', '“यह स्किल गैप भरें” तुरंत कोर्स आपकी योजना में जोड़ देता है'],
              ].map((x, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{L(x)}
                </li>
              ))}
            </ul>
          </div>
          <Card grad className="reveal p-5 sm:p-6" data-reveal>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-bold">{L(['Skill gap — Software Developer', 'स्किल गैप — सॉफ्टवेयर डेवलपर'])}</h3>
                <p className="muted text-[11.5px]">{L(['Sample student profile', 'नमूना छात्र प्रोफ़ाइल'])}</p>
              </div>
              <DemoTag />
            </div>
            <div className="space-y-3.5">
              {[
                { n: ['Python', 'पाइथन'], v: 75, tone: 'ok' },
                { n: ['Git & GitHub', 'गिट और गिटहब'], v: 70, tone: 'ok' },
                { n: ['Communication', 'संचार'], v: 55, tone: 'warn' },
                { n: ['SQL', 'एसक्यूएल'], v: 30, tone: 'bad' },
                { n: ['Data Structures', 'डेटा स्ट्रक्चर'], v: 45, tone: 'warn' },
              ].map((s) => (
                <div key={s.n[0]}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-ink">{L(s.n)}</span>
                    <span className="muted tabular-nums">{s.v}%</span>
                  </div>
                  <Meter value={s.v} tone={s.tone} showTrack size="sm" />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" icon={Crosshair}>{L(['Close SQL gap', 'SQL गैप भरें'])}</Button>
              <Button size="sm" variant="ghost" icon={BookOpen}>{L(['See courses', 'कोर्सेस देखें'])}</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* ==================== COURSES / JOBS / RESUME / INTERVIEW / GOV ==================== */}
      <section id="features" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading eyebrow={L(['Feature tour', 'फ़ीचर टूर'])} title={L(['Everything between campus and offer letter', 'कैंपस और ऑफ़र लेटर के बीच सब कुछ'])} sub={L(['Nine connected surfaces, one profile, one score that moves as you do.', 'नौ जुड़े हुए क्षेत्र, एक प्रोफ़ाइल, एक स्कोर जो आपके साथ बढ़ता है।'])} align="center" />
        <div className="grid gap-4 lg:grid-cols-3">
          <FeatureCard id="courses" icon={BookOpen} index={0} title={t('land.course.title')} sub={t('land.course.sub')}
            cta={{ label: L(['Sample course cards', 'नमूना कोर्स कार्ड']), to: '#courses' }}>
            <ul className="space-y-2.5">
              {[
                { t: ['SQL Fundamentals: queries to joins', 'SQL बुनियाद: क्वेरी से join तक'], p: 'NPTEL (sample)', w: 4, free: true, cert: true, tag: L(['Closes your top gap', 'आपका मुख्य गैप भरता है']) },
                { t: ['Data Structures & Algorithms for Interviews', 'इंटरव्यू के लिए DSA'], p: 'Sample catalog', w: 12, free: true, cert: false, tag: L(['Interview rounds', 'इंटरव्यू राउंड']) },
                { t: ['Git & GitHub in practice', 'व्यावहारिक गिट और गिटहब'], p: 'Sample catalog', w: 2, free: true, cert: true, tag: L(['Visible proof of work', 'काम का दिखने वाला प्रमाण']) },
              ].map((c, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface2/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-semibold leading-snug text-ink">{L(c.t)}</span>
                    <Badge tone={c.free ? 'ok' : 'warn'}>{c.free ? t('common.free') : t('common.paid')}</Badge>
                  </div>
                  <div className="muted mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px]">
                    <span>{c.p}</span><span aria-hidden>·</span><span>{c.w} {t('common.weeks')}</span>
                    {c.cert ? <><span aria-hidden>·</span><span>{t('common.certificate')}</span></> : null}
                  </div>
                  <div className="mt-2"><Badge tone="brand">{c.tag}</Badge></div>
                </li>
              ))}
            </ul>
          </FeatureCard>

          <FeatureCard id="jobs" icon={Briefcase} index={1} title={t('land.job.title')} sub={t('land.job.sub')} cta={{ label: L(['Sample match cards', 'नमूना मैच कार्ड']), to: '#jobs' }}>
            <ul className="space-y-2.5">
              {[
                { t: ['Junior Software Engineer', 'जूनियर सॉफ्टवेयर इंजीनियर'], co: 'Nimbus Labs (sample)', loc: ['Bengaluru · Hybrid', 'बेंगलुरु · हाइब्रिड'], m: 88, skills: 'DSA · SQL · Git' },
                { t: ['Data Analytics Intern', 'डेटा एनालिटिक्स इंटर्न'], co: 'Quantica Analytics (sample)', loc: ['Remote (India)', 'रिमोट (भारत)'], m: 81, skills: 'SQL · Excel · Power BI' },
                { t: ['Cloud Support Engineer', 'क्लाउड सपोर्ट इंजीनियर'], co: 'Vertex Cloud (sample)', loc: ['Hyderabad · On-site', 'हैदराबाद · ऑन-साइट'], m: 64, skills: 'Linux · Docker · Cloud' },
              ].map((j, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface2/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold text-ink">{L(j.t)}</div>
                      <div className="muted mt-0.5 truncate text-[10.5px]">{j.co}</div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-brand/[0.12] px-2 py-1 font-display text-[11px] font-bold tabular-nums text-brand">{j.m}%</span>
                  </div>
                  <div className="muted mt-1.5 text-[10.5px]">{L(j.loc)} · {j.skills}</div>
                </li>
              ))}
            </ul>
            <p className="muted mt-2.5 text-[10.5px] leading-snug">{L(['Fictional employers · sample data · no live job API connected.', 'काल्पनिक नियोक्ता · नमूना डेटा · कोई लाइव जॉब API नहीं।'])}</p>
          </FeatureCard>

          <FeatureCard id="resume" icon={FileText} index={2} title={t('land.resume.title')} sub={t('land.resume.sub')} cta={{ label: L(['See the ATS panel', 'ATS पैनल देखें']), to: '#resume' }}>
            <div className="rounded-xl border border-line bg-surface2/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-ink">{L(['Resume readiness', 'रिज़्यूमे तैयारी'])}</span>
                <span className="font-display text-lg font-bold tabular-nums text-brand">72<span className="muted text-[11px]">/100</span></span>
              </div>
              <Meter value={72} className="mt-2" />
              <ul className="mt-3 space-y-1.5">
                {[
                  [true, 'Contact + links present', 'संपर्क और लिंक मौजूद'],
                  [true, 'Action-verb bullets', 'क्रिया-आधारित बुलेट'],
                  [false, 'Keyword coverage 54% → needs SQL, Docker', 'कीवर्ड कवरेज 54% → SQL, Docker चाहिए'],
                  [false, 'Only 1 of 5 bullets has a number', '5 में से केवल 1 बुलेट में संख्या'],
                ].map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11.5px] leading-snug">
                    {r[0] ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden /> : <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />}
                    <span className={r[0] ? 'text-muted' : 'text-ink'}>{L([r[1], r[2]])}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['Modern', 'Professional', 'Minimal'].map((x) => <Badge key={x} tone="muted">{x}</Badge>)}
            </div>
          </FeatureCard>

          <FeatureCard id="interview" icon={Mic} index={3} title={t('land.interview.title')} sub={t('land.interview.sub')} cta={{ label: L(['5 tracks · 3 levels', '5 ट्रैक · 3 स्तर']), to: '#interview' }}>
            <div className="rounded-xl border border-line bg-surface2/50 p-3">
              <p className="text-[12px] font-medium leading-relaxed text-ink">“{L(['Tell me about yourself and a project you are proud of.', 'अपने बारे में और किसी प्रोजेक्ट के बारे में बताएँ जिस पर आपको गर्व है।'])}”</p>
              <div className="mt-3 space-y-2">
                {[
                  [L(['Communication', 'संचार']), 68, 'warn'], [L(['Technical Knowledge', 'तकनीकी ज्ञान']), 81, 'ok'],
                  [L(['Confidence', 'आत्मविश्वास']), 74, 'ok'], [L(['Structure', 'संरचना']), 58, 'bad'],
                ].map((d, i) => (
                  <div key={i}>
                    <div className="mb-1 flex justify-between text-[10.5px] font-semibold"><span className="text-ink">{d[0]}</span><span className="muted tabular-nums">{d[1]}</span></div>
                    <Meter value={d[1]} tone={d[2]} size="xs" />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone="brand"><Mic className="h-3 w-3" />{L(['Voice answers', 'वॉइस उत्तर'])}</Badge>
                <Badge tone="warn">{t('common.aiDemo')}</Badge>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard id="government" icon={Landmark} index={4} title={t('land.gov.title')} sub={t('land.gov.sub')} cta={{ label: L(['Eligibility at a glance', 'पात्रता एक नज़र में']), to: '#government' }}>
            <ul className="space-y-2">
              {GOV_CATS.map((g) => (
                <li key={g.t[0]} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface2/50 px-2.5 py-2">
                  <g.icon className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink">{L(g.t)}</span>
                    <span className="muted block truncate text-[10.5px]">{Array.isArray(g.n) ? L(g.n) : g.n}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted mt-2.5 text-[10.5px] leading-snug">{L(['Sample entries. Dates are never invented — verify on the official portal.', 'नमूना प्रविष्टियाँ। तिथियाँ कभी नहीं गढ़ी जातीं — आधिकारिक पोर्टल पर सत्यापित करें।'])}</p>
          </FeatureCard>

          <FeatureCard id="simulator" icon={FlaskConical} index={5} title={L(['Project Lab, Simulator & 90-day challenge', 'प्रोजेक्ट लैब, सिम्युलेटर और 90-दिन चुनौती'])}
            sub={L(['Stop wondering what to build. CareerX recommends projects from your gaps, lets you compare careers side by side, and turns 90 days into tickable tasks.', 'यह सोचना बंद करें कि क्या बनाएँ। CareerX आपके गैप से प्रोजेक्ट सुझाता है, करियर की तुलना कराता है और 90 दिनों को टिक करने योग्य कार्यों में बदलता है।'])}
            cta={{ label: L(['Three ways to build momentum', 'गति बनाने के तीन तरीके']), to: '#features' }}>
            <ul className="space-y-2">
              {[
                ['Project Lab', 'प्रोजेक्ट लैब', L(['Problem statement, stack, outcome and a GitHub checklist.', 'समस्या कथन, स्टैक, परिणाम और GitHub चेकलिस्ट।'])],
                ['Career Simulator', 'करियर सिम्युलेटर', L(['Compare three paths: difficulty, roadmap, projects, interview focus.', 'तीन पथों की तुलना: कठिनाई, रोडमैप, प्रोजेक्ट, इंटरव्यू फ़ोकस।'])],
                ['30-60-90', '30-60-90', L(['Fundamentals → projects → applications, tracked daily.', 'बुनियाद → प्रोजेक्ट → आवेदन, रोज़ ट्रैक।'])],
              ].map((x, i) => (
                <li key={i} className="rounded-lg border border-line bg-surface2/50 px-2.5 py-2">
                  <div className="text-[12px] font-semibold text-ink">{L([x[0], x[1]])}</div>
                  <div className="muted mt-0.5 text-[10.5px] leading-snug">{x[2]}</div>
                </li>
              ))}
            </ul>
          </FeatureCard>
        </div>
      </section>

      {/* ======================= STUDENT SUCCESS JOURNEY ======================= */}
      <section className="border-y border-line bg-surface/40 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <SectionHeading eyebrow={<span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" aria-hidden />{L(['90 days', '90 दिन'])}</span>} title={t('land.journey.title')} sub={t('land.journey.sub')} align="center" />
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {JOURNEY.map((j, i) => (
              <li key={i} className="reveal relative" data-reveal data-reveal-index={i}>
                <Card hover className="h-full">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={i === JOURNEY.length - 1 ? 'ok' : 'brand'}>{L(j.day)}</Badge>
                    <span className="muted font-display text-xs font-bold tabular-nums">{i + 1}/5</span>
                  </div>
                  <h3 className="mt-3 font-display text-[13.5px] font-bold leading-snug">{L(j.t)}</h3>
                  <p className="muted mt-1.5 text-[12px] leading-relaxed">{L(j.d)}</p>
                  <div className="mt-3"><Meter value={(i + 1) * 20} size="xs" tone={i === JOURNEY.length - 1 ? 'ok' : 'brand'} /></div>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ======================= INSTITUTION DASHBOARD ======================= */}
      <section className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <InstitutionVisual />
          <div>
            <SectionHeading eyebrow={<span className="inline-flex items-center gap-1.5"><Building2 className="h-3 w-3" aria-hidden />{L(['For colleges', 'कॉलेजों के लिए'])}</span>} title={t('land.inst.title')} sub={t('land.inst.sub')} />
            <ul className="mt-2 space-y-2.5">
              {[
                ['Cohort readiness, branch mix and participation at a glance', 'कोहोर्ट तैयारी, ब्रांच वितरण और भागीदारी एक नज़र में'],
                ['Most common skill gaps, ranked with evidence counts', 'सबसे आम स्किल गैप, प्रमाण संख्या के साथ रैंक किए गए'],
                ['AI institutional insights generated from the cohort dataset', 'कोहोर्ट डेटासेट से बने AI संस्थागत इनसाइट्स'],
                ['Student-level drill-down: profile, gaps, path, activity history', 'छात्र-स्तरीय विवरण: प्रोफ़ाइल, गैप, पथ, गतिविधि इतिहास'],
                ['Exportable activity log for placement reports', 'प्लेसमेंट रिपोर्ट के लिए निर्यात योग्य गतिविधि लॉग'],
              ].map((x, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />{L(x)}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button to="/login" icon={Building2}>{L(['Open the admin demo', 'एडमिन डेमो खोलें'])}</Button>
              <Button to="/signup" variant="ghost">{t('land.hero.cta1')}</Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== TRUST ============================== */}
      <section id="trust" className="border-y border-line bg-surface/40 py-16 lg:py-20">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading eyebrow={<span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" aria-hidden />{L(['Trust', 'भरोसा'])}</span>}
              title={L(['Responsible by design', 'डिज़ाइन से जिम्मेदार'])}
              sub={L(['A career tool that exaggerates is worse than no tool at all.', 'अतिशयोक्ति करने वाला करियर टूल न होने से भी बुरा है।'])} />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [L(['Scores are explainable', 'स्कोर समझाए जाते हैं']), L(['Every component, weight and gap is visible on screen — nothing is a black box.', 'हर घटक, भार और गैप स्क्रीन पर दिखता है — कुछ भी ब्लैक बॉक्स नहीं।'])],
                [L(['Sample data is labelled', 'नमूना डेटा चिह्नित है']), L(['Jobs, internships, government listings and cohort students all carry demo markers.', 'नौकरियाँ, इंटर्नशिप, सरकारी सूचियाँ और कोहोर्ट छात्र — सब पर डेमो मार्कर।'])],
                [L(['You own your data', 'आपका डेटा आपका']), L(['Delete everything from Profile → Data controls. This demo stores data in your browser only.', 'Profile → Data controls से सब हटाएँ। यह डेमो डेटा केवल आपके ब्राउज़र में रखता है।'])],
                [L(['No guaranteed outcomes', 'परिणाम की गारंटी नहीं']), L(['Recommendations are guidance for where to invest effort next — never a promise of a job.', 'सुझाव मार्गदर्शन हैं कि आगे कहाँ प्रयास करें — नौकरी का वादा कभी नहीं।'])],
              ].map((x, i) => (
                <Card key={i} hover className="reveal" data-reveal data-reveal-index={i}>
                  <h3 className="font-display text-[13.5px] font-bold">{x[0]}</h3>
                  <p className="muted mt-1.5 text-[12.5px] leading-relaxed">{x[1]}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============================== FAQ =============================== */}
      <section id="faq" className="mx-auto w-full max-w-[900px] px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading eyebrow={L(['Questions', 'प्रश्न'])} title={t('land.faq.title')} align="center" />
        <Accordion items={FAQ.map((f) => ({ q: L(f.q), a: L(f.a) }))} />
      </section>

      {/* ============================ FINAL CTA ============================ */}
      <section id="contact" className="relative overflow-hidden px-4 pb-20 sm:px-6">
        <div className="mx-auto w-full max-w-[1240px]">
          <Card grad className="relative overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16">
            <GlowOrb className="-left-16 -top-16 h-64 w-64" tone="brand" />
            <GlowOrb className="-bottom-20 -right-10 h-64 w-64" tone="accent" />
            <div className="relative">
              <span className="eyebrow justify-center"><Sparkles className="h-3 w-3" aria-hidden />{t('brand.tagline2')}</span>
              <h2 className="h-display mx-auto mt-3 max-w-2xl text-3xl text-balance sm:text-[2.6rem]">{t('land.cta.title')}</h2>
              <p className="muted mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-[15px]">{t('land.cta.sub')}</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button to={user ? '/app/dashboard' : '/signup'} size="lg" icon={Rocket} iconRight={ArrowRight}>{t('land.cta.btn')}</Button>
                <Button to="/login" size="lg" variant="ghost" icon={Play}>{t('land.cta.btn2')}</Button>
              </div>
              <p className="muted mt-4 text-[11.5px]">{L(['Free demo · English & हिंदी · Light & dark mode · Works on mobile', 'मुफ़्त डेमो · English और हिंदी · लाइट और डार्क मोड · मोबाइल पर काम करता है'])}</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------- pieces ------------------------------- */

function HeroStat({ icon: Icon, value, suffix, label, sub, index }) {
  const n = useCountUp(value, 900);
  return (
    <div className="reveal rounded-xl border border-line bg-surface/60 p-3 backdrop-blur" data-reveal data-reveal-index={index}>
      <Icon className="h-3.5 w-3.5 text-brand" aria-hidden />
      <div className="mt-1.5 font-display text-lg font-bold tabular-nums leading-none">{n}{suffix}</div>
      <div className="muted mt-1 text-[10.5px] font-semibold leading-tight">{label}</div>
      <div className="muted mt-0.5 hidden text-[9.5px] leading-tight opacity-80 sm:block">{sub}</div>
    </div>
  );
}

function FeatureCard({ id, icon: Icon, title, sub, children, cta, index = 0 }) {
  return (
    <Card id={id} hover className="reveal flex h-full flex-col" data-reveal data-reveal-index={index}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand"><Icon className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold leading-snug">{title}</h3>
          <p className="muted mt-1.5 text-[12.5px] leading-relaxed">{sub}</p>
        </div>
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {cta ? <div className="muted mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-brand"><ArrowRight className="h-3 w-3" aria-hidden />{cta.label}</div> : null}
    </Card>
  );
}

/** Interactive hero visual — an "AI analysing a profile" panel that cycles matches. */
function HeroVisual() {
  const { L } = useI18n();
  const [step, setStep] = useState(0);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');

  const matches = useMemo(() => ([
    { n: ['Software Developer', 'सॉफ्टवेयर डेवलपर'], v: 86 },
    { n: ['Data Analyst', 'डेटा एनालिस्ट'], v: 74 },
    { n: ['Cloud Engineer', 'क्लाउड इंजीनियर'], v: 61 },
    { n: ['AI / ML Engineer', 'AI / ML इंजीनियर'], v: 54 },
  ]), []);
  const phases = [
    L(['Reading profile…', 'प्रोफ़ाइल पढ़ी जा रही है…']),
    L(['Mapping skills…', 'कौशल मैप किए जा रहे हैं…']),
    L(['Ranking careers…', 'करियर रैंक हो रहे हैं…']),
    L(['Building roadmap…', 'रोडमैप बन रहा है…']),
  ];

  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 2200);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative">
      <GlowOrb className="-right-8 -top-10 h-72 w-72" tone="violet" />
      <Card grad className="relative overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative h-2 w-2 rounded-full bg-ok" /></span>
            <span className="font-display text-xs font-bold">{L(['Live AI analysis', 'लाइव AI विश्लेषण'])}</span>
          </div>
          <Badge tone="warn">{L(['Demo visual', 'डेमो दृश्य'])}</Badge>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* profile chips */}
          <div>
            <div className="muted mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em]">
              <span className={cn('h-1.5 w-1.5 rounded-full bg-brand', !reduce && 'animate-blink')} aria-hidden />
              {phases[step]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['B.Tech CSE', 'CGPA 8.2', 'Python', 'React', 'Git', L(['Bhopal', 'भोपाल'])].map((c) => (
                <span key={c} className="chip">{c}</span>
              ))}
            </div>
          </div>

          {/* match bars */}
          <div className="space-y-2.5">
            {matches.map((m, i) => {
              const active = i <= step;
              return (
                <div key={m.n[0]}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold text-ink">{L(m.n)}</span>
                    <span className={cn('font-display text-[12px] font-bold tabular-nums transition-colors', i === 0 ? 'text-brand' : 'text-muted')}>{active ? m.v : 0}%</span>
                  </div>
                  <Meter value={active ? m.v : 0} tone={i === 0 ? 'brand' : 'accent'} size="sm" />
                </div>
              );
            })}
          </div>

          {/* insight line */}
          <div className="rounded-xl border border-brand/25 bg-brand/[0.07] p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              <p className="text-[11.5px] leading-relaxed text-ink">
                {L([
                  'Your Python and Git are strong. SQL is the highest-priority gap — closing it raises your readiness by an estimated 8 points.',
                  'आपका पाइथन और गिट मज़बूत है। SQL सबसे प्राथमिक गैप है — इसे भरने से तैयारी लगभग 8 अंक बढ़ेगी।',
                ])}
              </p>
            </div>
          </div>

          {/* mini radar */}
          <MiniRadar step={step} />

          <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
            <span className="muted text-[10px]">{L(['AI / demo recommendation — not a validated prediction', 'AI / डेमो सुझाव — सत्यापित भविष्यवाणी नहीं'])}</span>
            <Trophy className="h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
          </div>
        </div>
      </Card>

      <div className="pointer-events-none absolute -bottom-5 -left-4 hidden sm:block">
        <Card className="animate-float px-3 py-2.5 shadow-lift">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ok/15 text-ok"><Check className="h-3.5 w-3.5" aria-hidden /></span>
            <div>
              <div className="font-display text-[11px] font-bold">{L(['Employability', 'रोज़गार-योग्यता'])}</div>
              <div className="muted text-[10px]">68/100 · {L(['demo', 'डेमो'])}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniRadar({ step }) {
  const { L } = useI18n();
  const axes = [
    [L(['Technical', 'तकनीकी']), 72], [L(['Problem Solving', 'समस्या समाधान']), 66],
    [L(['Communication', 'संचार']), 48], [L(['Leadership', 'नेतृत्व']), 40],
    [L(['Creativity', 'रचनात्मकता']), 58], [L(['Adaptability', 'अनुकूलन']), 64],
  ];
  const cx = 90; const cy = 78; const R = 54;
  const pt = (i, scale = 1) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const r = R * scale;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = axes.map((a, i) => pt(i, Math.max(0.18, (a[1] / 100) * (0.6 + step * 0.12))).join(' '));
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface2/50 p-2.5">
      <svg width="180" height="156" viewBox="0 0 180 156" className="shrink-0" role="img" aria-label={L(['Skill DNA preview', 'स्किल DNA झलक'])}>
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <polygon key={s} points={axes.map((_, i) => pt(i, s).join(' ')).join(' ')} fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.8" />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(var(--c-line))" strokeWidth="0.8" />;
        })}
        <polygon points={poly} fill="rgb(var(--c-brand) / 0.3)" stroke="rgb(var(--c-brand))" strokeWidth="1.6" style={{ transition: 'all .8s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="min-w-0">
        <div className="font-display text-[11.5px] font-bold">{L(['Skill DNA', 'स्किल DNA'])}</div>
        <p className="muted mt-1 text-[10.5px] leading-snug">{L(['Seven axes that change as you complete tasks, projects and interviews.', 'सात धुरी जो आपके कार्यों, प्रोजेक्ट और इंटरव्यू के साथ बदलती हैं।'])}</p>
      </div>
    </div>
  );
}

function IntelligenceVisual() {
  const { L } = useI18n();
  const rows = [
    { t: ['Next best action', 'अगला सर्वोत्तम कदम'], v: L(['Complete SQL Fundamentals', 'SQL बुनियाद पूरी करें']), tone: 'brand' },
    { t: ['Top gap', 'मुख्य गैप'], v: L(['SQL — level 30%', 'SQL — स्तर 30%']), tone: 'bad' },
    { t: ['Roadmap focus', 'रोडमैप फ़ोकस'], v: L(['Month 2 · SQL + DBMS', 'महीना 2 · SQL + DBMS']), tone: 'accent' },
    { t: ['Best match', 'सर्वोत्तम मैच'], v: L(['Software Developer 86%', 'सॉफ्टवेयर डेवलपर 86%']), tone: 'ok' },
  ];
  return (
    <div className="relative">
      <GlowOrb className="-left-10 top-10 h-64 w-64" tone="brand" />
      <Card grad className="relative p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-brand" aria-hidden />
            <h3 className="font-display text-sm font-bold">{L(['Career Command Center', 'करियर कमांड सेंटर'])}</h3>
          </div>
          <DemoTag />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.t[0]} className="rounded-xl border border-line bg-surface2/50 p-3">
              <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{L(r.t)}</div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-ink">{r.v}</div>
              <div className="mt-2"><Badge tone={r.tone}>{L(['demo', 'डेमो'])}</Badge></div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-brand/25 bg-brand/[0.07] p-3">
          <div className="muted text-[10px] font-bold uppercase tracking-[0.14em]">{L(['Why', 'कारण'])}</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink">
            {L(['SQL carries weight 3 for your target role and you are at 30%. Completing a 20-hour course moves your readiness score by roughly 8 points — the largest single gain available to you right now.',
              'SQL का भार आपके लक्षित रोल के लिए 3 है और आप 30% पर हैं। 20 घंटे का कोर्स पूरा करने से आपका रेडीनेस स्कोर लगभग 8 अंक बढ़ेगा — अभी उपलब्ध सबसे बड़ा एकल लाभ।'])}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/signup" className="btn btn-primary btn-sm">{L(['Try it with your profile', 'अपनी प्रोफ़ाइल से आज़माएँ'])}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
          <Link to="/login" className="btn btn-ghost btn-sm">{L(['Open the demo student', 'डेमो छात्र खोलें'])}</Link>
        </div>
      </Card>
      <div className="pointer-events-none absolute -right-3 -top-4 hidden sm:block">
        <Card className="animate-float px-3 py-2 shadow-lift" style={{ animationDelay: '1.2s' }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-accent" aria-hidden />
            <span className="text-[11px] font-semibold">{L(['Readiness 78/100', 'तैयारी 78/100'])}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InstitutionVisual() {
  const { L } = useI18n();
  const bars = [
    { n: ['Computer Science', 'कंप्यूटर साइंस'], v: 74 },
    { n: ['AI & Data Science', 'AI और डेटा साइंस'], v: 71 },
    { n: ['Information Technology', 'सूचना प्रौद्योगिकी'], v: 66 },
    { n: ['Electronics', 'इलेक्ट्रॉनिक्स'], v: 52 },
    { n: ['Mechanical', 'मैकेनिकल'], v: 41 },
  ];
  return (
    <div className="relative">
      <GlowOrb className="-right-6 -top-8 h-64 w-64" tone="accent" />
      <Card grad className="relative p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" aria-hidden />
            <h3 className="font-display text-sm font-bold">{L(['Institution Command Center', 'संस्थान कमांड सेंटर'])}</h3>
          </div>
          <DemoTag />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
              [L(['Students', 'छात्र']), '46'], [L(['Avg readiness', 'औसत तैयारी']), '61'],
              [L(['Resumes 75+', 'रिज़्यूमे 75+']), '19'], [L(['Interviews', 'इंटरव्यू']), '38'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-surface2/50 p-2.5">
              <div className="muted text-[10px] font-semibold uppercase tracking-wider">{k}</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums text-ink">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2.5">
          {bars.map((b) => (
            <div key={b.n[0]}>
              <div className="mb-1 flex justify-between text-[11px]"><span className="font-semibold text-ink">{L(b.n)}</span><span className="muted tabular-nums">{b.v}</span></div>
              <Meter value={b.v} tone={b.v > 65 ? 'ok' : b.v > 50 ? 'warn' : 'bad'} size="xs" />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-accent/25 bg-accent/[0.07] p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            <p className="text-[11.5px] leading-relaxed text-ink">
              {L(['“SQL and communication are the most common gaps (63% and 48% of students). Interview participation trails profile completion by 27 points.”',
                '“SQL और संचार सबसे आम गैप हैं (63% और 48% छात्र)। इंटरव्यू भागीदारी प्रोफ़ाइल पूर्णता से 27 अंक पीछे है।”'])}
            </p>
          </div>
          <div className="muted mt-1.5 text-[10px]">{L(['Derived from the demo cohort dataset', 'डेमो कोहोर्ट डेटासेट से व्युत्पन्न'])}</div>
        </div>
      </Card>
    </div>
  );
}
