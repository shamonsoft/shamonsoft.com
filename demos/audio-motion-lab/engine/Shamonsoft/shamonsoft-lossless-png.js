// Direct, deterministic 8-bit RGBA PNG: no lossy video intermediate or alpha re-rounding.
(() => {
  const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0}
  const integer=n=>new Uint8Array([n>>>24,n>>>16,n>>>8,n]);
  function chunk(type,data){const label=new TextEncoder().encode(type),out=new Uint8Array(data.length+12);out.set(integer(data.length));out.set(label,4);out.set(data,8);let crc=0xffffffff;for(let i=4;i<out.length-4;i++)crc=table[(crc^out[i])&255]^(crc>>>8);out.set(integer((crc^0xffffffff)>>>0),out.length-4);return out}
  async function encode(canvas){const width=canvas.width,height=canvas.height,pixels=canvas.getContext('2d').getImageData(0,0,width,height).data,stride=width*4,filtered=new Uint8Array((stride+1)*height);for(let row=0;row<height;row++){let sub=0,up=0;const start=row*stride;for(let x=0;x<stride;x++){let a=(pixels[start+x]-(x>=4?pixels[start+x-4]:0))&255,b=(pixels[start+x]-(row?pixels[start+x-stride]:0))&255;sub+=Math.min(a,256-a);up+=Math.min(b,256-b)}const type=up<sub?2:1,target=row*(stride+1);filtered[target]=type;for(let x=0;x<stride;x++)filtered[target+1+x]=(pixels[start+x]-(type===2?(row?pixels[start+x-stride]:0):(x>=4?pixels[start+x-4]:0)))&255}
    const compressor=new CompressionStream('deflate'),writer=compressor.writable.getWriter(),compressed=new Response(compressor.readable).arrayBuffer();await writer.write(filtered);await writer.close();const header=new Uint8Array(13);header.set(integer(width));header.set(integer(height),4);header[8]=8;header[9]=6;return new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',new Uint8Array(await compressed)),chunk('IEND',new Uint8Array())],{type:'image/png'});
  }
  window.__amlLosslessPng={encode};
})();
