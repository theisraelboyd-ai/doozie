NAVY='#0d1b2a'; YEL='#ffca28'; YEL_D='#b37800'; RED='#c62828'; RED_D='#7f1416'
def chrome_defs(p):
    return f'''<defs>
<linearGradient id="{p}chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"></stop><stop offset="0.42" stop-color="#d7dee3"></stop><stop offset="0.52" stop-color="#7d8e99"></stop><stop offset="0.7" stop-color="#c9d3da"></stop><stop offset="1" stop-color="#f4f7f9"></stop></linearGradient>
<linearGradient id="{p}pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7f9"></stop><stop offset="0.5" stop-color="#9aa9b3"></stop><stop offset="1" stop-color="#e3e8ec"></stop></linearGradient>
</defs>'''

def bird(p, x, y, s, outline='#1b2731'):
    # an original art deco bird mascot in full flight: faceted body, stepped (terraced) wing, facing right, perch at (x, y)
    sw = 3 / s
    st = f'stroke="{outline}" stroke-width="{sw}" stroke-linejoin="miter"'
    parts = [
        # tail streamers
        f'<path d="M -78 -34 L -214 -46 L -74 -28 Z" fill="url(#{p}chrome)" {st}></path>',
        f'<path d="M -74 -28 L -196 -28 L -70 -22 Z" fill="url(#{p}chrome)" {st}></path>',
        f'<path d="M -68 -22 L -176 -10 L -62 -17 Z" fill="url(#{p}chrome)" {st}></path>',
        # far wing, darker, behind the body
        f'<path d="M 22 -58 L -238 -118 L -222 -106 L 10 -52 Z" fill="#8a9aa5" {st}></path>',
        # faceted body and head
        f'<path d="M -86 -32 L -22 -54 L 68 -62 L 104 -54 L 160 -45 L 104 -36 L 62 -22 L -12 -16 L -62 -20 Z" fill="url(#{p}chrome)" {st}></path>',
        f'<path d="M 68 -62 L 84 -42 L 104 -36" fill="none" stroke="{outline}" stroke-width="{sw*0.8}"></path>',
        f'<path d="M 104 -54 L 104 -36" fill="none" stroke="{outline}" stroke-width="{sw*0.8}"></path>',
        f'<path d="M -22 -54 L 12 -30 L 62 -22" fill="none" stroke="{outline}" stroke-width="{sw*0.6}" opacity="0.6"></path>',
        f'<path d="M 90 -54 L 95 -50 L 90 -46 L 85 -50 Z" fill="{outline}"></path>',
        # stepped wing: four terraced blades, each shorter than the one above
        f'<path d="M 46 -56 L -272 -106 L -252 -94 L 34 -47 Z" fill="url(#{p}chrome)" {st}></path>',
        f'<path d="M 36 -45 L -234 -84 L -214 -73 L 24 -37 Z" fill="url(#{p}chrome)" {st}></path>',
        f'<path d="M 26 -35 L -192 -63 L -174 -54 L 14 -28 Z" fill="url(#{p}chrome)" {st}></path>',
        f'<path d="M 16 -26 L -146 -42 L -130 -35 L 6 -20 Z" fill="url(#{p}chrome)" {st}></path>',
        # perch
        f'<path d="M -7 -17 L 7 -17 L 10 0 L -10 0 Z" fill="url(#{p}chrome)" {st}></path>',
    ]
    return f'<g transform="translate({x} {y}) scale({s})">' + ''.join(parts) + '</g>'

