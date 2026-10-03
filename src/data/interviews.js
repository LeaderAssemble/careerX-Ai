/**
 * Mock interview question bank + evaluation vocabulary.
 *
 * The evaluation engine in src/services/interviewService.js scores an answer with
 * transparent, explainable heuristics (length, structure markers, domain vocabulary,
 * specificity signals). It is a DEMO engine — connect a real speech/LLM API there.
 */

export const TRACKS = [
  { id: 'software', n: ['Software Development', 'सॉफ्टवेयर डेवलपमेंट'], icon: 'Code2', vocab: ['array', 'string', 'hash', 'complexity', 'o(n', 'api', 'endpoint', 'database', 'query', 'join', 'index', 'git', 'branch', 'test', 'deploy', 'cache', 'recursion', 'stack', 'queue', 'tree', 'object', 'class', 'exception', 'एरे', 'क्वेरी', 'डेटाबेस', 'टेस्ट'] },
  { id: 'data-analyst', n: ['Data Analyst', 'डेटा एनालिस्ट'], icon: 'BarChart3', vocab: ['sql', 'join', 'group by', 'aggregate', 'dashboard', 'kpi', 'metric', 'trend', 'cohort', 'funnel', 'null', 'clean', 'pivot', 'correlation', 'hypothesis', 'stakeholder', 'insight', 'डेटा', 'मेट्रिक', 'डैशबोर्ड'] },
  { id: 'ai-ml', n: ['AI / ML', 'AI / ML'], icon: 'BrainCircuit', vocab: ['model', 'training', 'dataset', 'feature', 'accuracy', 'precision', 'recall', 'f1', 'overfit', 'regularisation', 'bias', 'variance', 'pipeline', 'deploy', 'evaluation', 'loss', 'epoch', 'embedding', 'मॉडल', 'डेटासेट'] },
  { id: 'hr', n: ['HR / Behavioural', 'HR / व्यवहारिक'], icon: 'Users', vocab: ['team', 'conflict', 'feedback', 'deadline', 'ownership', 'learned', 'improved', 'manager', 'collaborate', 'priority', 'situation', 'result', 'टीम', 'समय', 'सीखा'] },
  { id: 'general', n: ['General / Mixed', 'सामान्य / मिश्रित'], icon: 'Sparkles', vocab: ['project', 'skill', 'goal', 'learn', 'strength', 'improve', 'team', 'problem', 'result', 'plan', 'प्रोजेक्ट', 'लक्ष्य', 'कौशल'] },
];

export const LEVELS = [
  { id: 'beginner', n: ['Beginner', 'शुरुआती'], desc: ['Campus-style screening questions.', 'कैंपस-शैली स्क्रीनिंग प्रश्न।'] },
  { id: 'intermediate', n: ['Intermediate', 'मध्यम'], desc: ['What most fresher interviews actually ask.', 'जो ज्यादातर फ्रेशर इंटरव्यू में पूछा जाता है।'] },
  { id: 'advanced', n: ['Advanced', 'उन्नत'], desc: ['Depth, trade-offs and scenario judgement.', 'गहराई, ट्रेड-ऑफ़ और परिदृश्य निर्णय।'] },
];

/** q: question · type: question family · kw: concepts a strong answer mentions · tip: model-answer guidance */
export const QUESTIONS = {
  software: {
    beginner: [
      { type: 'intro', q: ['Tell me about yourself and a project you are proud of.', 'अपने बारे में बताएँ और किसी ऐसे प्रोजेक्ट के बारे में जिस पर आपको गर्व है।'], kw: ['project', 'built', 'learned', 'result'], tip: ['Name, branch, one project with your specific role, the tech used and one measurable outcome.', 'नाम, ब्रांच, आपकी विशिष्ट भूमिका वाला एक प्रोजेक्ट, उपयोग की गई तकनीक और एक मापने योग्य परिणाम।'] },
      { type: 'technical', q: ['What is the difference between an array and a linked list?', 'एरे और लिंक्ड लिस्ट में क्या अंतर है?'], kw: ['memory', 'contiguous', 'index', 'insertion', 'deletion', 'pointer'], tip: ['Contiguous memory and O(1) index access versus node pointers with O(1) insertion at the head.', 'सतत मेमोरी और O(1) इंडेक्स एक्सेस बनाम नोड पॉइंटर जो हेड पर O(1) इंसरशन देते हैं।'] },
      { type: 'technical', q: ['Why do we use version control like Git?', 'हम गिट जैसे वर्ज़न कंट्रोल का उपयोग क्यों करते हैं?'], kw: ['history', 'branch', 'collaborate', 'rollback', 'review'], tip: ['History, parallel branches, safe rollback and code review as a team practice.', 'इतिहास, समानांतर ब्रांच, सुरक्षित रोलबैक और टीम प्रथा के रूप में कोड रिव्यू।'] },
    ],
    intermediate: [
      { type: 'coding', q: ['Given an array of integers, find two numbers that add up to a target. Explain your approach and complexity.', 'पूर्णांकों के एरे में, दो संख्याएँ खोजें जिनका योग लक्ष्य के बराबर हो। अपना तरीका और जटिलता बताएँ।'], kw: ['hash', 'map', 'o(n)', 'single pass', 'trade-off'], tip: ['One pass with a hash map storing complements: O(n) time, O(n) space — and say the trade-off aloud.', 'कंप्लीमेंट सेव करने वाले हैश मैप के साथ एक पास: O(n) समय, O(n) स्पेस — और ट्रेड-ऑफ़ बोलकर बताएँ।'] },
      { type: 'technical', q: ['Explain normalization in a database and when you would denormalize.', 'डेटाबेस में नॉर्मलाइज़ेशन समझाएँ और कब डीनॉर्मलाइज़ करेंगे।'], kw: ['redundancy', 'anomalies', 'third normal', 'read', 'performance'], tip: ['Removing redundancy and update anomalies; denormalize selectively for read-heavy reporting.', 'अतिरेक और अपडेट विसंगतियाँ हटाना; रीड-हेवी रिपोर्टिंग के लिए चुनिंदा डीनॉर्मलाइज़ेशन।'] },
      { type: 'situational', q: ['Your feature breaks in production. Walk me through what you do in the first hour.', 'आपका फ़ीचर प्रोडक्शन में टूट जाता है। पहले घंटे में आप क्या करेंगे, बताएँ।'], kw: ['impact', 'rollback', 'logs', 'communicate', 'root cause'], tip: ['Assess impact, roll back or disable, communicate, gather logs, then fix and write a post-mortem.', 'प्रभाव आँकें, रोलबैक या बंद करें, सूचित करें, लॉग लें, फिर ठीक करें और पोस्ट-मॉर्टम लिखें।'] },
    ],
    advanced: [
      { type: 'design', q: ['Design a URL shortener that handles 10 million links and heavy read traffic.', 'एक URL शॉर्टनर डिज़ाइन करें जो 1 करोड़ लिंक और अधिक रीड ट्रैफ़िक संभाले।'], kw: ['hashing', 'collision', 'cache', 'database', 'sharding', 'analytics'], tip: ['Unique key generation and collision handling, cache layer for reads, storage choice, and how you would scale.', 'यूनिक की जनरेशन और कॉलिज़न हैंडलिंग, रीड के लिए कैश लेयर, स्टोरेज चयन, और स्केलिंग तरीका।'] },
      { type: 'technical', q: ['How would you reduce the response time of a slow API endpoint?', 'धीमे API एंडपॉइंट का रिस्पॉन्स टाइम कैसे घटाएँगे?'], kw: ['profile', 'index', 'n+1', 'cache', 'payload', 'async'], tip: ['Measure first, then indexes and query shape, caching, payload size and async work — in that order.', 'पहले मापें, फिर इंडेक्स और क्वेरी, कैशिंग, पेलोड साइज़ और async कार्य — इसी क्रम में।'] },
      { type: 'behavioural', q: ['Describe a technical disagreement with a teammate and how you resolved it.', 'किसी सहकर्मी के साथ तकनीकी मतभेद और उसे कैसे सुलझाया, बताएँ।'], kw: ['data', 'trade-off', 'listen', 'decision', 'outcome'], tip: ['Situation, both viewpoints, the criteria you used to decide, and what changed afterwards.', 'स्थिति, दोनों पक्ष, निर्णय के मापदंड, और बाद में क्या बदला।'] },
    ],
  },
  'data-analyst': {
    beginner: [
      { type: 'intro', q: ['Why data analytics, and what have you analysed so far?', 'डेटा एनालिटिक्स क्यों, और अब तक आपने क्या विश्लेषण किया है?'], kw: ['dataset', 'question', 'insight', 'tool'], tip: ['One concrete dataset, the business question you asked and the insight you found.', 'एक ठोस डेटासेट, आपका व्यवसाय प्रश्न और आपकी खोजी गई अंतर्दृष्टि।'] },
      { type: 'technical', q: ['What is the difference between WHERE and HAVING in SQL?', 'SQL में WHERE और HAVING में क्या अंतर है?'], kw: ['filter', 'aggregate', 'group by', 'rows', 'groups'], tip: ['WHERE filters rows before aggregation; HAVING filters groups after aggregation.', 'WHERE एग्रीगेशन से पहले पंक्तियाँ फ़िल्टर करता है; HAVING बाद में समूह फ़िल्टर करता है।'] },
      { type: 'technical', q: ['Which chart would you use to show a trend over time, and why?', 'समय के साथ प्रवृत्ति दिखाने के लिए कौन सा चार्ट उपयोग करेंगे, क्यों?'], kw: ['line', 'time', 'continuity', 'comparison'], tip: ['A line chart for continuous time series; bars for discrete category comparison.', 'सतत समय श्रृंखला के लिए लाइन चार्ट; असतत श्रेणी तुलना के लिए बार।'] },
    ],
    intermediate: [
      { type: 'coding', q: ['Write the logic to find the top 3 products by revenue per region.', 'प्रति क्षेत्र राजस्व के हिसाब से शीर्ष 3 प्रोडक्ट खोजने का लॉजिक लिखें।'], kw: ['window', 'rank', 'partition', 'group', 'join'], tip: ['Aggregate revenue, then a window function partitioned by region ordered by revenue, filter rank <= 3.', 'राजस्व एग्रीगेट करें, फिर क्षेत्र से विभाजित विंडो फंक्शन, rank <= 3 फ़िल्टर करें।'] },
      { type: 'case', q: ['Weekly active users dropped 18% last week. How would you investigate?', 'पिछले सप्ताह साप्ताहिक सक्रिय उपयोगकर्ता 18% गिरे। आप कैसे जाँच करेंगे?'], kw: ['segment', 'definition', 'tracking', 'release', 'seasonality'], tip: ['Verify the metric definition and tracking first, then segment by cohort, platform, region and recent releases.', 'पहले मेट्रिक परिभाषा और ट्रैकिंग सत्यापित करें, फिर कोहोर्ट, प्लेटफ़ॉर्म, क्षेत्र और नई रिलीज़ से विभाजित करें।'] },
      { type: 'situational', q: ['A stakeholder disagrees with your analysis. What do you do?', 'कोई हितधारक आपके विश्लेषण से असहमत है। आप क्या करेंगे?'], kw: ['assumption', 'data', 'listen', 'validate', 'document'], tip: ['Surface assumptions, validate against the data together, document the final definition.', 'धारणाएँ सामने लाएँ, डेटा पर साथ सत्यापित करें, अंतिम परिभाषा दस्तावेज़ीकृत करें।'] },
    ],
    advanced: [
      { type: 'case', q: ['How would you measure whether a new checkout flow actually improved conversion?', 'आप कैसे मापेंगे कि नया चेकआउट फ़्लो वास्तव में कन्वर्ज़न सुधारा या नहीं?'], kw: ['experiment', 'control', 'significance', 'metric', 'guardrail'], tip: ['Define the primary metric, run a controlled experiment, check significance and guardrail metrics.', 'मुख्य मेट्रिक तय करें, नियंत्रित प्रयोग चलाएँ, सार्थकता और गार्डरेल मेट्रिक जाँचें।'] },
      { type: 'technical', q: ['Explain Simpson’s paradox with a business example.', 'व्यवसायिक उदाहरण के साथ सिम्पसन का विरोधाभास समझाएँ।'], kw: ['segment', 'confounding', 'aggregate', 'direction'], tip: ['A trend in aggregates reverses within segments because of a confounding variable.', 'एक भ्रमित करने वाले चर के कारण एग्रीगेट में दिखी प्रवृत्ति सेगमेंट में उलट जाती है।'] },
      { type: 'design', q: ['Design the reporting layer for a company with 12 teams and messy source data.', '12 टीमों और बिखरे स्रोत डेटा वाली कंपनी के लिए रिपोर्टिंग लेयर डिज़ाइन करें।'], kw: ['pipeline', 'model', 'definitions', 'ownership', 'quality'], tip: ['Ingestion, a clean semantic layer with owned metric definitions, then self-serve dashboards and quality checks.', 'इनजेस्टशन, स्वामित्व वाली मेट्रिक परिभाषाओं के साथ साफ़ सीमांटिक लेयर, फिर सेल्फ-सर्व डैशबोर्ड और गुणवत्ता जाँच।'] },
    ],
  },
  'ai-ml': {
    beginner: [
      { type: 'intro', q: ['Which ML project have you built, and what did the data look like?', 'आपने कौन सा ML प्रोजेक्ट बनाया है, और डेटा कैसा था?'], kw: ['dataset', 'features', 'model', 'accuracy', 'improve'], tip: ['Data source and size, features, model choice, metric and one improvement you tried.', 'डेटा स्रोत और आकार, फ़ीचर, मॉडल चयन, मेट्रिक और एक सुधार जो आपने आज़माया।'] },
      { type: 'technical', q: ['What is overfitting and how do you detect it?', 'ओवरफ़िटिंग क्या है और इसे कैसे पहचानते हैं?'], kw: ['train', 'validation', 'gap', 'regularisation', 'cross-validation'], tip: ['A large gap between training and validation performance; address with regularisation, more data or simpler models.', 'ट्रेनिंग और वैलिडेशन प्रदर्शन में बड़ा अंतर; रेगुलराइज़ेशन, अधिक डेटा या सरल मॉडल से सुधारें।'] },
      { type: 'technical', q: ['When would you use precision instead of accuracy?', 'सटीकता (accuracy) के बजाय precision कब उपयोग करेंगे?'], kw: ['imbalance', 'false positive', 'recall', 'cost'], tip: ['Imbalanced classes or when a false positive is costly; often reported together with recall or F1.', 'असंतुलित क्लास या जब फ़ॉल्स पॉज़िटिव महँगा हो; प्रायः recall या F1 के साथ रिपोर्ट करें।'] },
    ],
    intermediate: [
      { type: 'technical', q: ['Explain bias–variance trade-off and how it guides model selection.', 'बायस–वेरिएंस ट्रेड-ऑफ़ समझाएँ और यह मॉडल चयन में कैसे मदद करता है।'], kw: ['underfit', 'overfit', 'complexity', 'validation', 'regularisation'], tip: ['High bias underfits, high variance overfits; validation curves guide complexity and regularisation.', 'उच्च बायस अंडरफ़िट, उच्च वेरिएंस ओवरफ़िट; वैलिडेशन कर्व जटिलता और रेगुलराइज़ेशन तय करते हैं।'] },
      { type: 'design', q: ['How would you build a system to classify support tickets into categories?', 'सपोर्ट टिकट को श्रेणियों में वर्गीकृत करने वाला सिस्टम कैसे बनाएँगे?'], kw: ['labelling', 'features', 'embedding', 'evaluation', 'monitoring'], tip: ['Labelling strategy, feature/embedding choice, evaluation per class, then monitoring for drift.', 'लेबलिंग रणनीति, फ़ीचर/एम्बेडिंग चयन, प्रति-क्लास मूल्यांकन, फिर ड्रिफ्ट मॉनिटरिंग।'] },
      { type: 'situational', q: ['Your model performs well offline but poorly in production. What do you check?', 'आपका मॉडल ऑफ़लाइन अच्छा पर प्रोडक्शन में खराब प्रदर्शन करता है। क्या जाँचेंगे?'], kw: ['leakage', 'distribution', 'serving', 'latency', 'features'], tip: ['Training-serving skew, data leakage, distribution shift, feature computation differences and latency constraints.', 'ट्रेनिंग-सर्विंग अंतर, डेटा लीकेज, वितरण बदलाव, फ़ीचर गणना अंतर और लेटेंसी सीमाएँ।'] },
    ],
    advanced: [
      { type: 'design', q: ['Design an ML feature that must respond in under 200ms at scale.', 'एक ML फ़ीचर डिज़ाइन करें जिसे बड़े पैमाने पर 200ms से कम में उत्तर देना हो।'], kw: ['cache', 'batch', 'precompute', 'model size', 'monitoring'], tip: ['Precompute or cache features, choose a smaller/faster model, and monitor latency plus quality together.', 'फ़ीचर प्रीकंप्यूट या कैश करें, छोटा/तेज़ मॉडल चुनें, लेटेंसी और गुणवत्ता दोनों मॉनिटर करें।'] },
      { type: 'technical', q: ['How do you evaluate a generative model where there is no single correct output?', 'जनरेटिव मॉडल का मूल्यांकन कैसे करेंगे जहाँ एक सही उत्तर नहीं होता?'], kw: ['rubric', 'human eval', 'automatic', 'pairwise', 'safety'], tip: ['Combine rubric-based human evaluation, automatic proxy metrics and pairwise preference tests, with safety checks.', 'रूब्रिक-आधारित मानवीय मूल्यांकन, स्वचालित प्रॉक्सी मेट्रिक और जोड़ी-तुलना परीक्षण, सुरक्षा जाँच के साथ।'] },
      { type: 'behavioural', q: ['Tell me about a time your experiment failed. What did you do next?', 'किसी ऐसे समय के बारे में बताएँ जब आपका प्रयोग विफल हुआ। आगे क्या किया?'], kw: ['hypothesis', 'analysis', 'iterate', 'decision', 'learning'], tip: ['State the hypothesis, how you proved it failed, the smallest next experiment and the decision you made.', 'हाइपोथिसिस बताएँ, विफलता कैसे सिद्ध हुई, अगला छोटा प्रयोग और आपका निर्णय।'] },
    ],
  },
  hr: {
    beginner: [
      { type: 'intro', q: ['Walk me through your background and why you chose this field.', 'अपनी पृष्ठभूमि बताएँ और यह क्षेत्र क्यों चुना।'], kw: ['interest', 'project', 'goal', 'learn'], tip: ['A short arc: what drew you in, what you have done about it, and where you want to be.', 'एक छोटी कहानी: क्या आकर्षित किया, आपने क्या किया, और आगे कहाँ जाना है।'] },
      { type: 'behavioural', q: ['What is your biggest strength, and give an example of it in action.', 'आपकी सबसे बड़ी शक्ति क्या है, और उसका एक उदाहरण दें।'], kw: ['example', 'result', 'consistent'], tip: ['One strength plus a specific story with a result — avoid listing three adjectives.', 'एक शक्ति और परिणाम वाली विशिष्ट कहानी — तीन विशेषण गिनाने से बचें।'] },
      { type: 'behavioural', q: ['Where do you see yourself in three years?', 'तीन साल में आप स्वयं को कहाँ देखते हैं?'], kw: ['skill', 'ownership', 'grow', 'contribute'], tip: ['Depth in the role, ownership of a larger area, and contribution to the team’s goals.', 'भूमिका में गहराई, बड़े क्षेत्र की जिम्मेदारी, और टीम लक्ष्यों में योगदान।'] },
    ],
    intermediate: [
      { type: 'behavioural', q: ['Describe a conflict inside a team project and how it was resolved.', 'टीम प्रोजेक्ट के भीतर के संघर्ष और उसके समाधान का वर्णन करें।'], kw: ['listen', 'criteria', 'decision', 'outcome', 'respect'], tip: ['STAR structure, focus on the process you used rather than blaming a person.', 'STAR संरचना, किसी व्यक्ति को दोष देने के बजाय आपकी प्रक्रिया पर ध्यान।'] },
      { type: 'behavioural', q: ['Tell me about a deadline you missed or nearly missed. What changed after that?', 'किसी चूकी या लगभग चूकी डेडलाइन के बारे में बताएँ। उसके बाद क्या बदला?'], kw: ['plan', 'priority', 'communicate', 'improve'], tip: ['Honest account, the early warning you ignored, and the system you now use.', 'ईमानदार विवरण, आपने कौन सा संकेत नज़रअंदाज़ किया, और अब कौन सी पद्धति उपयोग करते हैं।'] },
      { type: 'situational', q: ['You are given a task you do not know how to do, with two days left. What do you do?', 'आपको ऐसा कार्य दिया गया जो आपको नहीं आता, दो दिन बचे हैं। आप क्या करेंगे?'], kw: ['scope', 'ask', 'learn', 'update', 'deliver'], tip: ['Clarify scope, find the fastest learning path, ask a focused question early, and update progress.', 'दायरा स्पष्ट करें, सबसे तेज़ सीखने का रास्ता खोजें, जल्दी विशिष्ट प्रश्न पूछें, प्रगति बताते रहें।'] },
    ],
    advanced: [
      { type: 'behavioural', q: ['Give an example of leading without formal authority.', 'बिना औपचारिक अधिकार के नेतृत्व का उदाहरण दें।'], kw: ['influence', 'evidence', 'alignment', 'result'], tip: ['How you built trust, aligned people on evidence, and what shipped because of it.', 'आपने भरोसा कैसे बनाया, प्रमाण से लोगों को कैसे जोड़ा, और उससे क्या बना।'] },
      { type: 'situational', q: ['Your manager and a senior engineer disagree with your plan. How do you proceed?', 'आपके मैनेजर और एक वरिष्ठ इंजीनियर आपकी योजना से असहमत हैं। आप कैसे आगे बढ़ेंगे?'], kw: ['criteria', 'data', 'trade-off', 'commit'], tip: ['Surface the decision criteria, compare trade-offs openly, and commit clearly once decided.', 'निर्णय मापदंड सामने रखें, ट्रेड-ऑफ़ खुलकर तुलना करें, तय होने पर स्पष्ट रूप से प्रतिबद्ध हों।'] },
      { type: 'behavioural', q: ['What feedback have you received that was hardest to hear, and what did you change?', 'आपको कौन सी फ़ीडबैक सुनना सबसे कठिन लगा, और आपने क्या बदला?'], kw: ['reflect', 'action', 'measure', 'improved'], tip: ['A real piece of feedback, the specific behaviour you changed, and evidence it worked.', 'वास्तविक फ़ीडबैक, आपका बदला व्यवहार, और उसके काम करने का प्रमाण।'] },
    ],
  },
  general: {
    beginner: [
      { type: 'intro', q: ['Introduce yourself in ninety seconds, focusing on what makes you hireable.', 'नब्बे सेकंड में अपना परिचय दें, इस पर ध्यान देते हुए कि आप भर्ती योग्य क्यों हैं।'], kw: ['skill', 'project', 'goal', 'result'], tip: ['Who you are, your strongest skill evidence, and the role you are aiming at.', 'आप कौन हैं, आपका सबसे मज़बूत कौशल प्रमाण, और आपका लक्षित रोल।'] },
      { type: 'behavioural', q: ['What do you do when you have to learn something completely new?', 'जब कुछ बिल्कुल नया सीखना हो तो आप क्या करते हैं?'], kw: ['plan', 'practice', 'resource', 'example'], tip: ['Your learning method plus one concrete recent example with an outcome.', 'आपकी सीखने की विधि और हाल का एक ठोस उदाहरण परिणाम सहित।'] },
      { type: 'general', q: ['Why should we hire you over another graduate from your college?', 'आपके कॉलेज के दूसरे स्नातक के बजाय हम आपको क्यों भर्ती करें?'], kw: ['evidence', 'project', 'skill', 'fit'], tip: ['Evidence, not adjectives: one project, one skill gap you closed, one result.', 'विशेषण नहीं प्रमाण: एक प्रोजेक्ट, एक भरा गया गैप, एक परिणाम।'] },
    ],
    intermediate: [
      { type: 'situational', q: ['You are handling three priorities at once and one will slip. How do you decide?', 'आप एक साथ तीन प्राथमिकताएँ संभाल रहे हैं और एक छूटेगी। कैसे तय करेंगे?'], kw: ['impact', 'stakeholder', 'communicate', 'plan'], tip: ['Rank by impact and reversibility, tell stakeholders early, and renegotiate scope explicitly.', 'प्रभाव और पलटने की क्षमता से क्रम, हितधारकों को पहले बताएँ, दायरा स्पष्ट रूप से तय करें।'] },
      { type: 'behavioural', q: ['Describe a time you received critical feedback. What did you do?', 'किसी समय की आलोचनात्मक फ़ीडबैक बताएँ। आपने क्या किया?'], kw: ['listen', 'change', 'follow-up'], tip: ['The feedback, the change you made, and how you verified improvement.', 'फ़ीडबैक, आपका बदलाव, और सुधार कैसे सत्यापित किया।'] },
      { type: 'general', q: ['What skill are you actively improving right now, and how?', 'अभी आप कौन सा कौशल सक्रिय रूप से सुधार रहे हैं, और कैसे?'], kw: ['practice', 'schedule', 'measure', 'resource'], tip: ['Name the skill, your weekly practice plan, and how you measure progress.', 'कौशल बताएँ, साप्ताहिक अभ्यास योजना, और प्रगति कैसे मापते हैं।'] },
    ],
    advanced: [
      { type: 'situational', q: ['You notice a teammate consistently missing quality checks. What do you do?', 'आप देखते हैं कि एक सहकर्मी लगातार गुणवत्ता जाँच चूक रहा है। आप क्या करेंगे?'], kw: ['private', 'support', 'process', 'escalate'], tip: ['Private conversation first, offer support, fix the process gap, escalate only if needed.', 'पहले निजी बात, सहायता दें, प्रक्रिया सुधारें, आवश्यक हो तभी एस्केलेट करें।'] },
      { type: 'behavioural', q: ['Tell me about a decision you made with incomplete information.', 'अपूर्ण जानकारी के साथ लिए गए किसी निर्णय के बारे में बताएँ।'], kw: ['assumption', 'risk', 'review', 'outcome'], tip: ['Your assumptions, how you limited downside, and how you reviewed the outcome.', 'आपकी धारणाएँ, नुकसान कैसे सीमित किया, और परिणाम की समीक्षा कैसे की।'] },
      { type: 'general', q: ['Where do you want your career to be in five years, and what is the plan?', 'पाँच साल में आपका करियर कहाँ होना चाहिए, और योजना क्या है?'], kw: ['depth', 'milestone', 'skill', 'contribution'], tip: ['Direction plus two concrete milestones you can start this quarter.', 'दिशा और दो ठोस माइलस्टोन जो आप इस तिमाही शुरू कर सकते हैं।'] },
    ],
  },
};

export const STRUCTURE_MARKERS = ['situation', 'task', 'action', 'result', 'first', 'then', 'finally', 'because', 'for example', 'स्थिति', 'कार्य', 'परिणाम', 'पहले', 'फिर', 'क्योंकि'];
export const QUANTIFIER_RE = /\b\d+(\.\d+)?\s*(%|percent|hrs|hours|days|weeks|months|users|x|k|lakh|cr|l|minutes|मिनट|घंटे|दिन|प्रतिशत)?\b/i;
export const WEAK_OPENERS = ['i think', 'maybe', 'basically', 'kind of', 'sort of', 'mujhe lagta', 'shayad'];
export const CONFIDENT_MARKERS = ['i led', 'i built', 'i owned', 'we shipped', 'i decided', 'मेने बनाया', 'मैंने नेतृत्व', 'मैंने तय'];

export const INTERVIEW_SESSION_LENGTH = 5;

export default QUESTIONS;
