// Authored compositions: fixed visual structure, bounded work and music-led accents.
// No textures, external assets, extra render passes or runtime dependencies.
(() => {
  const common = `
    #define AML_AUTHORED_COLOR
    vec3 ink(float offset) {
      return hsl2rgb(vec3(fract(u_baseHue / 360.0 + offset * u_hueSpread / 360.0), clamp(u_saturation,0.0,1.0), .58));
    }
    float lineAA(float d, float width) {
      float px = 1.6 / max(u_resolution.y, 1.0);
      #ifdef PIXEL_DERIVATIVES
        px = max(px, fwidth(d));
      #endif
      return 1.0-smoothstep(width, width+px, abs(d));
    }
    vec3 litInk(float offset, float light) {return mix(ink(offset),vec3(1.0),clamp(light,0.0,.8));}
    vec4 scene(vec2 p,float t){return vec4(0.0);}
  `;
  const scenes = [
    { name:'Prism Atrium', preset:{BaseHue:194,HueSpread:68,Saturation:.68,Speed:.28,Turbulence:.015,Drift:.035,Pulse:.06,Trail:0,Bloom:.35,Glow:.6,ParticleCount:0,Vignette:.24,BackgroundLift:.035}, source:`
      vec3 authoredColor(vec2 p,float t) {
        vec3 c=ink(.1)*.008; float drive=bassDrive();
        vec2 center=vec2(.10*sin(t*.16),.055*cos(t*.13));
        vec2 q=p-center; float depth=0.0;
        for(int i=0;i<14;i++) {
          float k=float(i),z=1.0+mod(k-t*.28,14.0);
          float scale=2.4/(z+.8);vec2 r=rot(.15*sin(z*.19+t*.10))*q/scale;
          float box=max(abs(r.x)*.77,abs(r.y));
          float d=box-.94;float edge=lineAA(d,.026+.004*drive);
          float halo=exp(-abs(d)*42.0)*.10;
          float attenuation=exp(-z*.135);
          float bevel=exp(-abs(d+.024)*145.0)+exp(-abs(d-.024)*145.0)*.40;
          float facing=.35+.65*clamp((r.x*.30+r.y*.5)+.5,0.0,1.0);
          vec3 frameColor=ink(k*.045)*(.20+facing*.33)+litInk(.35,.6)*bevel*.33;
          c+=(frameColor*edge+ink(.45)*halo)*attenuation*(.85+drive*.25);
          float corners=exp(-pow(abs(r.x)*.77-.94,2.0)*950.0)*exp(-pow(abs(r.y)-.94,2.0)*950.0);
          c+=litInk(.2,.65)*corners*attenuation*.7;
          depth+=halo*attenuation;
        }
        if(p.y<-.10){
          float z=1.0/max(.08,-p.y+.10),x=p.x*z;
          float tiles=min(abs(fract(x*.65)-.5),abs(fract(z*.8-t*.22)-.5));
          float seams=1.0-smoothstep(.018,.036,tiles);
          c+=ink(.35)*(.025+seams*.065)*(1.0-smoothstep(-.8,-.1,p.y));
        }
        float floorY=p.y+.94;float floorFade=exp(-abs(floorY)*13.0);
        c+=ink(-.25)*floorFade*(.04+depth*.05);
        c+=ink(.7)*exp(-dot(q,q)*28.0)*(.04+midDrive()*.1);
        return c;
      }` },
    { name:'Ribbon Loom', preset:{BaseHue:282,HueSpread:100,Saturation:.65,Speed:.24,Turbulence:.03,Drift:.06,Pulse:.04,Trail:0,Bloom:.22,Glow:.46,ParticleCount:0,RibbonWidth:1.05,WaveDensity:1.08,Vignette:.2}, source:`
      vec3 authoredColor(vec2 p,float t) {
        vec3 c=ink(-.3)*.009;float width=.045+u_ribbonWidth*.055;
        for(int i=0;i<7;i++) {
          float f=float(i),phase=f*.68+t*.16;
          float y=(f-3.0)*.17+sin(p.x*(1.18+u_waveDensity*.32)+phase)*(.18+midDrive()*.055);
          y+=sin(p.x*.47-phase*.55)*.12;
          float d=p.y-y,body=1.0-smoothstep(width,width+.006,abs(d));
          float normal=clamp(d/width,-1.0,1.0),z=sqrt(max(0.0,1.0-normal*normal));
          float diffuse=.15+.75*max(0.0,z*.7-normal*.54);
          float spec=pow(max(0.0,z*.60-normal*.8),22.0);
          float shadow=exp(-pow((d+.055)/max(width,.01),2.0)*2.0)*.26;
          c*=1.0-shadow;
          vec3 silk=ink((f-3.0)*.17)*diffuse+litInk(.2,.65)*spec*(.32+highDrive()*.15);
          c=mix(c,silk,body*.93);
          c+=ink(f*.08)*exp(-abs(abs(d)-width)*95.0)*.035;
        }
        return c;
      }` },
    { name:'Orbital Sculpture', preset:{BaseHue:34,HueSpread:72,Saturation:.55,Speed:.17,Turbulence:0,Drift:.02,Pulse:.07,Trail:0,Bloom:.18,Glow:.6,ParticleCount:0,OrbCount:8,LayerComplexity:1.2,Vignette:.26}, source:`
      vec3 authoredColor(vec2 p,float t) {
        vec3 c=ink(.1)*.006;vec2 q=p*1.04;
        for(int i=0;i<9;i++) {
          float k=float(i),gate=1.0-step(u_orbCount,k);
          float radius=.32+k*.075;float tilt=.30+.06*k;
          vec2 r=rot((k-4.0)*.25+t*.10)*q;
          vec2 ellipse=vec2(r.x,r.y/tilt);float a=atan(ellipse.y,ellipse.x);
          float d=(length(ellipse)-radius)*tilt;
          float rim=lineAA(d,.007+u_ribbonWidth*.004);
          float glow=exp(-abs(d)*90.0)*.08;
          float key=.30+.65*pow(.5+.5*cos(a-1.1),3.0);
          c+=(litInk((k-4.0)*.07,key*.45)*rim*key+ink(.2)*glow)*gate;
        }
        float r=length(q),orb=1.0-smoothstep(.168,.175,r);
        float z=sqrt(max(0.0,1.0-pow(r/.175,2.0)));
        vec3 n=normalize(vec3(q/.175,z));float light=max(0.0,dot(n,normalize(vec3(-.5,.7,.6))));
        c=mix(c,ink(-.1)*(.08+light*.65)+vec3(pow(light,28.0))*.6,orb);
        c+=ink(.5)*exp(-r*r*26.0)*(.035+bassDrive()*.07);
        return c;
      }` },
    { name:'Sculpted Tide', preset:{BaseHue:184,HueSpread:74,Saturation:.62,Speed:.16,Turbulence:.01,Drift:.02,Pulse:.04,Trail:0,Bloom:.16,Glow:.48,ParticleCount:0,WaveDensity:1.2,LayerComplexity:1.3,Vignette:.25}, source:`
      float strata(vec2 p,float t) {
        vec2 q=rot(-.24)*p;
        float ridge=q.y+.23*sin(q.x*1.8+t*.14)+.08*sin(q.x*3.2-t*.10);
        float basin=exp(-dot(p-vec2(.22,-.05),p-vec2(.22,-.05))*2.6);
        return ridge*.7+basin*.66;
      }
      vec3 authoredColor(vec2 p,float t) {
        float f=strata(p,t),density=11.0+u_waveDensity*6.0;
        float cell=floor(f*density),local=fract(f*density);
        float gx=(strata(p+vec2(.005,0.0),t)-f)/.005;
        float gy=(strata(p+vec2(0.0,.005),t)-f)/.005;
        vec3 n=normalize(vec3(-gx,-gy,1.0));float light=.3+.7*max(0.0,dot(n,normalize(vec3(-.4,.7,1.0))));
        float lip=lineAA(local-.06,.025),shadow=exp(-local*15.0);
        float hue=.35*sin(cell*.32);
        vec3 c=ink(hue)*(.16+.35*light+.18*local)*(1.0-shadow*.7);
        c+=litInk(.55,.30)*lip*(.30+highDrive()*.12);
        c+=ink(-.3)*exp(-pow(local-.22,2.0)*50.0)*.07;
        return c;
      }` },
    { name:'Liquid Chrome', revised:true, preset:{BaseHue:210,HueSpread:36,Saturation:.24,Speed:.16,Turbulence:0,Drift:.02,Pulse:.08,Trail:0,Bloom:.12,Glow:.5,ParticleCount:0,RibbonWidth:.6,Vignette:.24}, source:`
      vec3 authoredColor(vec2 p,float t) {
        vec2 q=p-vec2(0.0,.055);float a=atan(q.y,q.x);
        float radius=.77+.035*sin(a*3.0+t*.20)+.024*sin(a*5.0-t*.17)+bassDrive()*.018;
        float r=length(q)/radius;
        vec3 c=ink(.2)*.008;
        c+=ink(-.2)*exp(-pow((p.y+.88)*20.0,2.0))*exp(-p.x*p.x*1.8)*.07;
        if(r<1.0) {
          float z=sqrt(max(0.0,1.0-r*r));
          vec3 n=normalize(vec3(q/radius,z+.035*sin(q.x*7.0+q.y*3.0+t*.11)));
          vec3 reflected=reflect(vec3(0.0,0.0,-1.0),n);
          float bandA=exp(-pow((reflected.x+.18*reflected.z+.27)*7.0,2.0));
          float bandB=exp(-pow((reflected.y-.4)*13.0,2.0));
          float env=.055+.44*smoothstep(-.18,.12,reflected.y)+bandA*.95+bandB*.28;
          float rim=pow(1.0-z,3.0);
          vec3 metal=mix(vec3(env),ink(.4)*env,.14+u_saturation*.15);
          metal+=litInk(.1,.7)*rim*.22;
          metal*=.6+.4*z;
          c=mix(c,metal,1.0-smoothstep(.995,1.0,r));
        }
        return c;
      }` },
    { name:'Nebula Bloom', revised:true, preset:{BaseHue:254,HueSpread:110,Saturation:.62,Speed:.13,Turbulence:.08,Drift:.045,Pulse:.055,Trail:0,Bloom:.48,Glow:.65,ParticleCount:36,LayerComplexity:1.2,Vignette:.32}, source:`
      vec3 authoredColor(vec2 p,float t) {
        vec2 q=rot(-.34)*p;q.y*=1.72;float r=length(q),a=atan(q.y,q.x);
        float spin=a-r*4.6+t*.12;
        float arms=pow(.5+.5*cos(spin*3.0),5.0);
        float envelope=exp(-r*r*1.8);
        float detail=.45+.55*noise(q*7.0+vec2(t*.07,0.0));
        float clusters=pow(noise(q*34.0+vec2(-t*.04,t*.025)),4.0)*5.0;
        float dust=pow(.5+.5*cos(spin*3.0+.7),8.0)*exp(-r*1.4);
        vec3 c=ink(-.35)*.006;
        c+=ink(.25)*arms*envelope*(detail*.52+clusters*.7)*(.84+midDrive()*.24);
        c+=litInk(.4,.34)*pow(arms,2.0)*envelope*.19;
        c*=1.0-dust*.6;
        c+=litInk(-.1,.7)*exp(-r*r*70.0)*(.95+bassDrive()*.28);
        vec2 grid=p*17.0,id=floor(grid),local=fract(grid)-.5;
        vec2 star=(hash2(id+u_seed)-.5)*.65;
        float gate=step(.92,hash(id+5.7))*clamp(u_particleCount/25.0,0.0,1.0);
        c+=vec3(1.0)*exp(-dot(local-star,local-star)*1100.0)*gate*(.25+highDrive()*.3);
        return c;
      }` }
  ];
  window.AML_AUTHORED_SCENES=scenes.map(s=>({...s,source:common+s.source}));
})();
