export default function RingSVG() {
  return (
            <svg viewBox="0 0 600 600" width="100%" height="100%" style={{overflow: 'visible'}}>
              <defs>
                <filter id="rg" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation={10} result="b1" />
                  <feGaussianBlur stdDeviation={3} result="b2" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="rgt" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="1.6" />
                </filter>
                <filter id="fkg" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation={4} />
                </filter>
                <filter id="smokeO" x="-45%" y="-45%" width="190%" height="190%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.013 0.026" numOctaves={1} seed={7} result="noiseO" />
                  <feDisplacementMap in="SourceGraphic" in2="noiseO" scale={34} xChannelSelector="R" yChannelSelector="G" result="disp" />
                  <feGaussianBlur in="disp" stdDeviation={16} />
                </filter>
                <filter id="smokeM" x="-35%" y="-35%" width="170%" height="170%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.019 0.038" numOctaves={1} seed={4} result="noiseM" />
                  <feDisplacementMap in="SourceGraphic" in2="noiseM" scale={16} xChannelSelector="R" yChannelSelector="G" result="disp" />
                  <feGaussianBlur in="disp" stdDeviation={6} />
                </filter>
                <filter id="smokeC" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.03 0.06" numOctaves={1} seed={9} result="noiseC" />
                  <feDisplacementMap in="SourceGraphic" in2="noiseC" scale={6} xChannelSelector="R" yChannelSelector="G" result="disp" />
                  <feGaussianBlur in="disp" stdDeviation="1.4" />
                </filter>
              </defs>
              <g id="swirlOuter" style={{transformOrigin: '300px 300px'}}>
                <circle id="ro" cx={300} cy={300} r={260} fill="none" stroke="rgba(120,50,225,.36)" strokeWidth={46} transform="rotate(-90 300 300)" filter="url(#smokeO)" style={{opacity: 0}} />
              </g>
              <circle id="rimI" cx={300} cy={300} r={248} fill="none" stroke="rgba(35,8,75,.5)" strokeWidth={5} filter="url(#rgt)" />
              <circle id="rimO" cx={300} cy={300} r={272} fill="none" stroke="rgba(35,8,75,.4)" strokeWidth={5} filter="url(#rgt)" />
              <g id="swirlMid" style={{transformOrigin: '300px 300px'}}>
                <circle id="rb" cx={300} cy={300} r={260} fill="none" stroke="rgba(155,75,255,.62)" strokeWidth={14} transform="rotate(-90 300 300)" filter="url(#smokeM)" style={{opacity: 0}} />
              </g>
              <circle id="rd" cx={300} cy={300} r={260} fill="none" stroke="#b366ff" strokeWidth="3.4" transform="rotate(-90 300 300)" filter="url(#smokeC)" style={{opacity: 0}} />
              <circle id="rt" cx={300} cy={300} r={260} fill="none" stroke="rgba(245,230,255,.9)" strokeWidth="1.2" strokeDasharray="1633.6" strokeDashoffset="1633.6" transform="rotate(-90 300 300)" filter="url(#rgt)" />
              <g id="forksA" opacity={0}><path id="fkA0" d="M 432.4,523.8 L 436.9,531.0 L 443.2,536.9 L 445.2,545.2" fill="none" stroke="rgba(220,180,255,0.85)" strokeWidth="1.58" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkA1" d="M 40.8,279.7 L 30.0,275.5 L 19.4,280.1" fill="none" stroke="rgba(220,180,255,0.85)" strokeWidth="1.66" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkA2" d="M 66.0,413.4 L 57.0,413.6 L 48.3,415.9" fill="none" stroke="rgba(220,180,255,0.85)" strokeWidth="1.36" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkA3" d="M 559.9,292.4 L 568.8,293.2 L 576.6,289.0 L 585.4,287.2" fill="none" stroke="rgba(220,180,255,0.85)" strokeWidth="1.40" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkA4" d="M 494.2,472.9 L 503.6,475.4 L 509.2,483.4 L 518.4,486.5" fill="none" stroke="rgba(220,180,255,0.85)" strokeWidth="1.59" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkA5" d="M 558.0,331.9 L 564.1,332.0 L 570.1,330.6 L 575.9,332.4" fill="none" stroke="rgba(220,180,255,0.85)" strokeWidth="1.38" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkA6" d="M 410.9,64.8 L 412.2,56.4 L 418.9,51.2" fill="none" stroke="rgba(220,180,255,0.85)" strokeWidth="1.64" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /></g>
              <g id="forksB" opacity={0}><path id="fkB0" d="M 551.1,232.5 L 564.5,230.5 L 577.4,226.3" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="2.10" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB1" d="M 283.0,40.6 L 275.9,20.1 L 284.2,0.1" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="1.72" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB2" d="M 90.8,145.7 L 80.9,134.6 L 66.3,131.9 L 58.5,119.3" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="1.99" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB3" d="M 203.3,541.3 L 196.9,553.9 L 186.7,563.6" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="2.17" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB4" d="M 552.3,237.2 L 564.4,235.6 L 575.1,230.0 L 587.0,232.5" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="1.71" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB5" d="M 350.5,45.0 L 349.9,22.5 L 349.2,-0.0" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="2.09" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB6" d="M 63.4,407.9 L 49.7,415.5 L 37.4,425.4" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="1.68" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB7" d="M 492.0,124.7 L 501.8,111.6 L 512.4,99.1" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="1.98" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB8" d="M 223.8,548.6 L 217.3,559.1 L 209.4,568.6 L 206.6,580.7" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="1.49" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /><path id="fkB9" d="M 56.1,390.0 L 50.0,396.2 L 41.3,396.3 L 34.3,401.7" fill="none" stroke="rgba(220,180,255,0.9)" strokeWidth="1.64" strokeLinecap="round" strokeLinejoin="round" filter="url(#fkg)" /></g>
            </svg>
  );
}
