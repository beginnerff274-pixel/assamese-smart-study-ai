const $=id=>document.getElementById(id);let subject='Political Education',mode='simple',currentQuestion='',currentAnswer='',photoText='',photoUrl='',recognition=null,speaking=false;const KEY='assameseSmartStudyHistoryV1',SAVED='assameseSmartStudySavedV1';let history=JSON.parse(localStorage.getItem(KEY)||'[]');
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2400)}function saveHistory(){localStorage.setItem(KEY,JSON.stringify(history.slice(0,80)))}function setSubject(s){subject=s;$('selectedSubject').textContent=s;document.querySelectorAll('.subject-card').forEach(c=>c.classList.toggle('active',c.dataset.subject===s))}document.querySelectorAll('.subject-card').forEach(c=>c.onclick=()=>setSubject(c.dataset.subject));document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x===b))});
function language(){return $('language').value}async function ask(q,follow=false){q=(q||$('question').value).trim();if(!q)return toast('Please type or speak a question first.');currentQuestion=q;$('question').value=q;$('welcomeEmpty').classList.add('hidden');$('answerArea').classList.remove('hidden');$('answerQuestion').textContent=q;$('answerText').innerHTML='<p class="muted">✦ Thinking through your question…</p>';$('askBtn').disabled=true;$('askBtn').innerHTML='Thinking…';try{const res=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,subject,language:language(),mode,history:follow?history.slice(0,6).reverse().map(x=>({role:'user',text:x.question})).concat([{role:'model',text:currentAnswer}]):[]})});const data=await res.json();if(!res.ok)throw new Error(data.error||'AI service unavailable.');currentAnswer=data.answer;$('answerText').innerHTML=DOMPurify.sanitize(marked.parse(currentAnswer));$('answerNote').textContent='AI-generated study help · Verify textbook-specific details with your teacher.';history.unshift({id:Date.now(),question:q,answer:currentAnswer,subject,language:language(),date:new Date().toLocaleString()});saveHistory();renderHistory();}catch(e){$('answerText').innerHTML=`<p>⚠ ${escapeHtml(e.message)}</p><p class="muted">Check your internet connection and make sure the server API key is configured.</p>`;}finally{$('askBtn').disabled=false;$('askBtn').innerHTML='Ask question <span>→</span>';}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}$('askBtn').onclick=()=>ask();$('question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}});$('followupBtn').onclick=()=>{const q=$('followupInput').value.trim();if(q){$('followupInput').value='';ask(q,true)}};$('followupInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('followupBtn').click()});document.querySelectorAll('.quick-card').forEach(b=>b.onclick=()=>{$('question').value=b.dataset.prompt;$('question').focus()});
$('photoInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/'))return toast('Please choose an image file.');if(f.size>10*1024*1024)return toast('Image must be smaller than 10 MB.');photoUrl=URL.createObjectURL(f);$('previewImg').src=photoUrl;$('previewWrap').classList.remove('hidden');$('scanStatus').textContent='Scanning…';$('ocrText').textContent='Recognising Assamese / English text…';try{const result=await Tesseract.recognize(f,'eng+asm+hin',{logger:m=>{if(m.status==='recognizing text')$('scanStatus').textContent=Math.round(m.progress*100)+'%'}});photoText=result.data.text.trim();$('ocrText').textContent=photoText||'No readable text found. Try a clearer photo.';if(photoText){$('question').value=photoText;$('scanStatus').textContent='Text extracted';}else $('scanStatus').textContent='No text found';}catch(err){$('ocrText').textContent='Could not scan this image. Try another photo.';$('scanStatus').textContent='Scan failed';}};$('removePhoto').onclick=()=>{$('previewWrap').classList.add('hidden');$('photoInput').value='';photoText='';photoUrl='';$('scanStatus').textContent=''};
function getVoice(){const voices=speechSynthesis.getVoices();const lang=language()==='Assamese'?'as':language()==='Hindi'?'hi':'en';let list=voices.filter(v=>v.lang.toLowerCase().startsWith(lang));if(!list.length&&lang==='as')list=voices.filter(v=>v.lang.toLowerCase().startsWith('bn')||v.lang.toLowerCase().startsWith('hi'));if($('femaleVoice').checked){const f=list.find(v=>/female|woman|zira|samantha|google.*(বাংলা|हिन्दी|english)/i.test(v.name));if(f)return f;}return list[0]||voices.find(v=>v.lang.toLowerCase().startsWith('en'))||voices[0]}
$('micBtn').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast('Voice input is not supported in this browser. Try Chrome.');if(recognition){recognition.stop();recognition=null;$('micBtn').classList.remove('listening');return}recognition=new SR();recognition.lang=language()==='Assamese'?'as-IN':language()==='Hindi'?'hi-IN':'en-IN';recognition.interimResults=true;recognition.onstart=()=>{$('micBtn').classList.add('listening');$('micBtn').innerHTML='🔴 <span>Listening…</span>'};recognition.onresult=e=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;$('question').value=t;if(e.results[e.results.length-1].isFinal){recognition.stop();setTimeout(()=>ask(t),350)}};recognition.onerror=()=>toast('Could not recognise speech. Check microphone permission.');recognition.onend=()=>{$('micBtn').classList.remove('listening');$('micBtn').innerHTML='🎙 <span>Voice</span>';recognition=null};try{recognition.start()}catch(e){toast('Microphone is already active.')}};
$('speakBtn').onclick=()=>{if(!currentAnswer)return toast('Ask a question first.');if(!('speechSynthesis'in window))return toast('Text-to-speech is unavailable on this device.');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(currentAnswer.replace(/[#*_`>-]/g,' '));u.voice=getVoice();u.lang=language()==='Assamese'?'as-IN':language()==='Hindi'?'hi-IN':'en-IN';u.rate=.92;u.onstart=()=>{$('speechControls').classList.remove('hidden');$('speechStatus').textContent='Reading answer aloud…';$('speakBtn').textContent='🔊'};u.onend=()=>{$('speechControls').classList.add('hidden');$('speakBtn').textContent='🔊'};u.onerror=()=>toast('This voice may not be supported on your device.');speechSynthesis.speak(u)};$('pauseBtn').onclick=()=>{if(speechSynthesis.paused){speechSynthesis.resume();$('pauseBtn').textContent='Ⅱ Pause'}else{speechSynthesis.pause();$('pauseBtn').textContent='▶ Resume'}};$('stopBtn').onclick=()=>{speechSynthesis.cancel();$('speechControls').classList.add('hidden')};
$('copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(currentQuestion+'\n\n'+currentAnswer);toast('Answer copied.')}catch(e){toast('Copy is not available.')}};$('saveBtn').onclick=()=>{const a=JSON.parse(localStorage.getItem(SAVED)||'[]');a.unshift({question:currentQuestion,answer:currentAnswer,subject,date:new Date().toLocaleString()});localStorage.setItem(SAVED,JSON.stringify(a.slice(0,100)));$('saveBtn').textContent='★';toast('Answer saved in this browser.')};$('shareBtn').onclick=async()=>{const text=currentQuestion+'\n\n'+currentAnswer;if(navigator.share){try{await navigator.share({title:'Assamese Smart Study AI',text})}catch(e){}}else{await navigator.clipboard.writeText(text);toast('Copied. Paste it into WhatsApp or another app.')}};$('pdfBtn').onclick=()=>{const w=window.open('','_blank');if(!w)return toast('Allow pop-ups to print or save PDF.');w.document.write(`<html><head><title>Study answer</title><style>body{font:16px/1.7 Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px}h1{font-size:22px}h2,h3{margin-top:24px}</style></head><body><h1>${escapeHtml(currentQuestion)}</h1>${DOMPurify.sanitize(marked.parse(currentAnswer))}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()};$('regenBtn').onclick=()=>ask(currentQuestion);
function renderHistory(){$('historyList').innerHTML=history.map(h=>`<div class="history-item" data-id="${h.id}"><b>${escapeHtml(h.question.slice(0,90))}</b><small>${escapeHtml(h.subject)} · ${escapeHtml(h.date)}</small></div>`).join('')||'<p class="muted">No questions yet.</p>';document.querySelectorAll('.history-item').forEach(el=>el.onclick=()=>{const h=history.find(x=>x.id==el.dataset.id);if(h){setSubject(h.subject);currentQuestion=h.question;currentAnswer=h.answer;$('answerQuestion').textContent=h.question;$('answerText').innerHTML=DOMPurify.sanitize(marked.parse(h.answer));$('answerArea').classList.remove('hidden');$('welcomeEmpty').classList.add('hidden');$('historyPanel').classList.add('hidden')}})}renderHistory();$('historyBtn').onclick=()=>$('historyPanel').classList.toggle('hidden');$('closeHistory').onclick=()=>$('historyPanel').classList.add('hidden');$('clearHistory').onclick=()=>{if(confirm('Delete all question history from this browser?')){history=[];saveHistory();renderHistory();toast('History deleted.')}};$('settingsBtn').onclick=()=>$('settingsPanel').classList.toggle('hidden');$('closeSettings').onclick=()=>$('settingsPanel').classList.add('hidden');$('language2').onchange=e=>$('language').value=e.target.value;$('language').onchange=e=>$('language2').value=e.target.value;$('themeBtn').onclick=()=>document.body.classList.toggle('light');
fetch('/api/health').then(r=>r.json()).then(d=>{if(!d.configured)toast('Setup needed: add your Gemini API key on the server.')}).catch(()=>toast('Cannot connect to the AI server.'));
// ===== CLASS 11 POLITICAL SCIENCE QUESTION BANK =====
let politicalBank = [];

fetch('./political-science-assamese-class11-2026-27.json')
  .then(response => {
    if (!response.ok) throw new Error('Question bank file not found');
    return response.json();
  })
  .then(data => {
    politicalBank = data.chapters || [];
    console.log('Political Science question bank loaded:', politicalBank.length);
    toast('Political Science question bank ready!');
  })
  .catch(error => {
    console.error(error);
    toast('Could not load the question bank.');
  });

function findBankAnswer(question) {
  const clean = text => text.toLowerCase()
    .normalize('NFC')
    .replace(/[?!.,।ঃ]/g, '')
    .trim();

  const query = clean(question);
  const words = query.split(/\s+/).filter(w => w.length > 1);
  let best = null;
  let bestScore = 0;

  politicalBank.forEach(chapter => {
    const questions = [
      ...(chapter.short_questions || []),
      ...(chapter.detailed_questions || [])
    ];

    questions.forEach(item => {
      const target = clean(item.question);
      let score = 0;

      if (query === target) score = 1;
      else if (target.includes(query) || query.includes(target)) score = 0.9;
      else {
        const targetWords = target.split(/\s+/);
        const matches = words.filter(w => targetWords.some(t => t.includes(w) || w.includes(t)));
        score = words.length ? matches.length / words.length : 0;
      }

      if (score > bestScore) {
        bestScore = score;
        best = { item, chapter };
      }
    });
  });

  return bestScore >= 0.35 ? best : null;
}

window.ask = async function(q, follow = false) {
  q = (q || $('question').value).trim();
  if (!q) return toast('Please type a question first.');

  if (!politicalBank.length) {
    return toast('Question bank is still loading. Try again.');
  }

  if (!subject.toLowerCase().includes('political')) {
    return toast('The Political Science question bank is available. More subjects will be added soon.');
  }

  currentQuestion = q;
  $('question').value = q;
  $('welcomeEmpty').classList.add('hidden');
  $('answerArea').classList.remove('hidden');
  $('answerQuestion').textContent = q;
  $('answerText').innerHTML = '<p>Searching your question bank…</p>';

  const result = findBankAnswer(q);

  if (!result) {
    currentAnswer = 'এই প্ৰশ্নটোৰ উত্তৰ বৰ্তমান প্ৰশ্ন বেংকত উপলব্ধ নহয়। অনুগ্ৰহ কৰি আন শব্দ ব্যৱহাৰ কৰি সুধক অথবা আপোনাৰ শিক্ষকক পৰীক্ষা কৰক।';
    $('answerNote').textContent = 'Not found in the current question bank.';
  } else {
    const chapter = result.chapter;
    const shortItem = chapter.short_questions.find(x => x.question === result.item.question);
    const detailedItem = chapter.detailed_questions.find(x => x.question === result.item.question);

    let answer = mode === 'detailed'
      ? (detailedItem || shortItem).answer
      : (shortItem || detailedItem).answer;

    currentAnswer = `### ${chapter.chapter_title}\n\n${answer}`;
    $('answerNote').textContent = 'Class 11 Political Science · Assamese question bank · Verify with your textbook.';
  }

  $('answerText').innerHTML = DOMPurify.sanitize(marked.parse(currentAnswer));

  history.unshift({
    id: Date.now(),
    question: q,
    answer: currentAnswer,
    subject,
    language: language(),
    date: new Date().toLocaleString()
  });

  saveHistory();
  renderHistory();
};
