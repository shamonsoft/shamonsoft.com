(() => {
 const link=document.getElementById('fw-launch-demo');if(!link)return;
 let demo;
 link.addEventListener('click',e=>{
  if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  if(demo&&!demo.closed){try{if(demo.location.href!==link.href)demo.location.replace(link.href);demo.focus();e.preventDefault();return}catch{}}
  demo=window.open(link.href,'ShamonSoftFireworksPremierDemo','popup=yes,width=1728,height=972,resizable=yes,scrollbars=yes');
  if(demo){try{demo.opener=null;demo.focus()}catch{}e.preventDefault()}
  else {e.preventDefault();location.assign(link.href)}
 });
})();
