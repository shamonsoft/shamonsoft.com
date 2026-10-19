// Fireworks-style help, isolated from AML's project and export state.
(() => {
const Q=selector=>document.querySelector(selector);
const esc=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const HELP_ARTICLES=window.AML_HELP_ARTICLES;
const post=(action,payload=null)=>{
 if(window.__amlBrowserHost)window.__amlBrowserHost.postMessage({type:'aml-help',action,payload});
 else if(action.startsWith('support-'))Q('#supportStatus').textContent='Use the packaged Windows app, or copy support@shamonsoft.com into your mail app.';
 else alert('Licenses and component sources are included in the packaged Windows app.');
};
for(const label of document.querySelectorAll('.app-version'))label.textContent=window.__amlAppVersion||'6.4';
const helpDialog=Q('#helpCenter'),supportDialog=Q('#supportDialog'),helpSearch=Q('#helpSearch'),helpMain=Q('#helpMain');
let helpArticleId='first-scene';
const helpCategories=[...new Set(HELP_ARTICLES.map(a=>a.category))];
const normalizeHelp=text=>String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const helpIndex=HELP_ARTICLES.map(article=>({...article,searchTitle:normalizeHelp(article.title),searchTags:normalizeHelp(article.tags),searchBody:normalizeHelp(article.summary+' '+article.body.replace(/<[^>]*>/g,' '))}));
function helpTerms(){const skip=new Set(['a','an','the','how','to','do','i','can','of','for','my','what','is','in','and']);return normalizeHelp(helpSearch.value).split(' ').filter(t=>t&&!skip.has(t))}
function helpMatches(){const terms=helpTerms();return helpIndex.map(a=>{let score=0;for(const term of terms){if(a.searchTitle.includes(term))score+=8;else if(a.searchTags.includes(term))score+=5;else if(a.searchBody.includes(term))score+=1;else return null}return{article:a,score}}).filter(Boolean).sort((a,b)=>b.score-a.score)}
function highlightHelpMatches(){const terms=helpTerms();if(!terms.length)return;const pattern=new RegExp('('+terms.join('|')+')','gi'),walker=document.createTreeWalker(helpMain,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement.closest('button,mark,script,style'))nodes.push(node)}for(const node of nodes){pattern.lastIndex=0;if(!pattern.test(node.nodeValue))continue;pattern.lastIndex=0;const fragment=document.createDocumentFragment();node.nodeValue.split(pattern).forEach((piece,index)=>{if(index%2){const mark=document.createElement('mark');mark.textContent=piece;fragment.append(mark)}else fragment.append(document.createTextNode(piece))});node.replaceWith(fragment)}}
function renderHelp(){
 const matches=helpMatches(),searching=!!helpSearch.value.trim(),nav=Q('#helpCategories'),navScroll=nav.scrollTop;
 if(!matches.some(m=>m.article.id===helpArticleId))helpArticleId=matches[0]?.article.id||null;
 const topic=a=>`<button data-help-article="${a.id}" class="${a.id===helpArticleId?'active':''}" ${a.id===helpArticleId?'aria-current="page"':''}>${esc(a.title)}${searching?`<small>${esc(a.category)}</small>`:''}</button>`;
 nav.innerHTML=searching?`<h3>Search results</h3>${matches.map(m=>topic(m.article)).join('')}`:helpCategories.map(category=>`<section><h3>${esc(category)}</h3>${HELP_ARTICLES.filter(a=>a.category===category).map(topic).join('')}</section>`).join('');
 nav.scrollTop=navScroll;
 Q('#helpResultCount').textContent=searching?`${matches.length} matching topic${matches.length===1?'':'s'}`:'Contents';
 Q('#helpClearSearch').hidden=!searching;
 const article=HELP_ARTICLES.find(a=>a.id===helpArticleId);
 if(article){const related=(article.related||[]).map(id=>HELP_ARTICLES.find(a=>a.id===id)).filter(Boolean);helpMain.innerHTML=`<article class="help-article"><header><h2>${esc(article.title)}</h2><p>${esc(article.summary)}</p></header>${article.body}${related.length?`<div class="help-related"><h3>See also</h3><div>${related.map(a=>`<button data-help-related="${a.id}">${esc(a.title)}</button>`).join('')}</div></div>`:''}</article>`}
 else helpMain.innerHTML='<div class="help-empty"><h2>No matching topics</h2><p>Try a shorter search, such as “music”, “tunnel” or “video”.</p><button data-help-reset>Show all topics</button></div>';
 helpMain.scrollTop=0;highlightHelpMatches();
}
function openHelp(){if(supportDialog.open)supportDialog.close();if(!helpDialog.open){helpDialog.showModal();renderHelp();Q('#helpCategories .active')?.scrollIntoView({block:'nearest'})}helpSearch.focus();helpSearch.select()}
function openSupport(){if(helpDialog.open)helpDialog.close();if(!supportDialog.open)supportDialog.showModal();Q('#supportStatus').textContent='';Q('#supportMailClients').innerHTML='<button data-support-mail="default">Default email app</button>';post('support-clients');Q('#copySupportAddress').focus()}

helpSearch.oninput=()=>{helpArticleId=null;Q('#helpCategories').scrollTop=0;renderHelp()};
function clearHelpSearch(){helpSearch.value='';renderHelp();Q('#helpCategories .active')?.scrollIntoView({block:'nearest'});helpSearch.focus()}
Q('#helpClearSearch').onclick=clearHelpSearch;
helpSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();helpMain.focus()}});
helpDialog.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-help-close')){helpDialog.close();return}
 if(button.hasAttribute('data-help-licenses')){post('export-licenses');return}
 if(button.hasAttribute('data-help-sources')){post('export-sources');return}
 if(button.hasAttribute('data-help-support')){openSupport();return}
 if(button.dataset.helpArticle||button.dataset.helpRelated){const related=button.dataset.helpRelated;helpArticleId=related||button.dataset.helpArticle;if(related)helpSearch.value='';renderHelp();if(related)Q('#helpCategories .active')?.scrollIntoView({block:'nearest'});helpMain.focus();return}
 if(button.hasAttribute('data-help-reset'))clearHelpSearch();
});
supportDialog.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-support-close'))supportDialog.close();if(button.dataset.supportMail){Q('#supportStatus').textContent='Opening your email app…';post('support-open-mail',button.dataset.supportMail)}});
Q('#copySupportAddress').onclick=()=>post('support-copy-address');Q('#supportAddress').onclick=e=>e.target.select();
for(const dialog of [helpDialog,supportDialog]){dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('change',e=>e.stopPropagation());}
document.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();e.stopPropagation();openHelp()}},true);
document.body.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='help-center')openHelp();if(action==='contact-support')openSupport()});
window.__amlBrowserHost?.addEventListener('message',e=>{
 if(e.data?.type==='support-clients'){const host=Q('#supportMailClients');host.innerHTML='<button data-support-mail="default">Default email app</button>';for(const client of e.data.clients||[]){const button=document.createElement('button');button.dataset.supportMail=client.id;button.textContent='Open in '+client.name;host.append(button)}}
 if(e.data?.type==='support-result')Q('#supportStatus').textContent=e.data.message;
});

})();

