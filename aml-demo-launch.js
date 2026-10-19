(() => {
 const link=document.getElementById('aml-launch-demo');if(!link)return;
 let demo;
 link.addEventListener('click',e=>{
  if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  if(demo&&!demo.closed){demo.focus();e.preventDefault();return}
  demo=window.open(link.href,'ShamonSoftAudioMotionLabDemo','popup=yes,width=1728,height=972,resizable=yes,scrollbars=yes');
  if(demo){try{demo.opener=null;demo.focus()}catch{}e.preventDefault()}
  else {e.preventDefault();location.assign(link.href)}
 });
})();
