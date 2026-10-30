// Keep the complete app visible. Disable only output actions in the demo.
(()=>{'use strict';const selector="#export-button,#record-save-btn,#export-path-button,#export-presets-button,[data-preview-tool=\"snapshot\"]",note='Exporting is available in the paid Windows app.';
const lock=()=>{for(const e of document.querySelectorAll(selector)){if(!e.disabled)e.disabled=true;if(!e.classList.contains('demo-export-disabled'))e.classList.add('demo-export-disabled');if(e.title!==note)e.title=note;e.setAttribute('aria-disabled','true')}};
lock();new MutationObserver(lock).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
document.addEventListener('click',e=>{if(e.target.closest?.(selector)){e.preventDefault();e.stopImmediatePropagation()}},true);})();
