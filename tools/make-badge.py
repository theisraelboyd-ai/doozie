# Builds the game's badge (lobby logo, app icons) from the same drawing as the logo canvas.
#   python3 tools/make-badge.py          -> assets/badge.svg (+ icons when --icons)
import sys, base64, os
sys.path.insert(0, os.path.dirname(__file__))
from badge_parts import *

def badge_svg(p='bd', animated=True, font_url=None):
    cyl = []
    for i, L in enumerate('DOOZIE'):
        x = 128 + i * 58; cx = x + 26
        cyl.append(f'''<g class="cyl c{i}"><g class="piston">
<rect x="{x}" y="380" width="52" height="80" rx="16" fill="{RED_D}"></rect>
<rect x="{x}" y="372" width="52" height="80" rx="16" fill="{YEL}" stroke="{YEL_D}" stroke-width="5"></rect>
<line x1="{x+10}" y1="384" x2="{x+42}" y2="384" stroke="{YEL_D}" stroke-width="4" stroke-linecap="round"></line>
<text x="{cx}" y="432" text-anchor="middle" font-family="DoozieBungee, Bungee, Impact, sans-serif" font-size="44" fill="{NAVY}">{L}</text>
</g><circle class="pop" cx="{cx}" cy="350" r="16" fill="#fff3c4" opacity="0"></circle></g>''')
    style = ''
    if font_url:
        style = f"<style>@font-face{{font-family:DoozieBungee;src:url({font_url}) format('woff2')}}</style>"
    return f'''<svg class="badge" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Doozie!">
{style}{chrome_defs(p)}
<circle cx="300" cy="300" r="276" fill="{RED}"></circle>
<circle cx="300" cy="300" r="256" fill="{NAVY}" stroke="{YEL}" stroke-width="14"></circle>
<circle cx="300" cy="300" r="232" fill="none" stroke="{YEL}" stroke-width="2" opacity="0.5"></circle>
<g class="speed">{''.join(f'<line x1="{a}" y1="{y}" x2="{b}" y2="{y}" stroke="{YEL}" stroke-width="7" stroke-linecap="round" opacity="{o}"></line>' for a, b, y, o in [(60, 116, 300, .7), (52, 110, 322, .5), (66, 116, 344, .35)])}</g>
<g class="mascot">{bird(p, 362, 336, 1.0)}</g>
{''.join(cyl)}
<rect class="head" x="122" y="358" width="356" height="16" rx="7" fill="{RED}" stroke="#4a0b0c" stroke-width="3"></rect>
<text x="300" y="506" text-anchor="middle" font-family="DoozieBungee, Bungee, Impact, sans-serif" font-size="40" fill="{RED}">!</text>
</svg>'''

if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    open(os.path.join(root, 'assets/badge.svg'), 'w').write(badge_svg())
    if '--icons' in sys.argv:
        font = base64.b64encode(open(os.path.join(root, 'assets/bungee-doozie.woff2'), 'rb').read()).decode()
        svg = badge_svg('ic', font_url='data:font/woff2;base64,' + font)
        from playwright.sync_api import sync_playwright
        from PIL import Image
        out = os.path.join(root, 'docs/icons'); os.makedirs(out, exist_ok=True)
        with sync_playwright() as pw:
            b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1024, 'height': 1024})
            for name, bg, scale in [('icon-any', 'transparent', 1.0), ('icon-maskable', '#0d1b2a', 0.78)]:
                pg.set_content(f'<html><body style="margin:0;background:{bg};width:1024px;height:1024px;display:flex;align-items:center;justify-content:center">'
                               f'<div style="width:{int(1024*scale)}px;height:{int(1024*scale)}px">{svg.replace("<svg ", "<svg width=\"100%\" height=\"100%\" ")}</div></body></html>')
                pg.wait_for_timeout(400)
                pg.screenshot(path=f'/tmp/{name}.png', omit_background=(bg == 'transparent'))
            b.close()
        any_ = Image.open('/tmp/icon-any.png').convert('RGBA'); mask = Image.open('/tmp/icon-maskable.png').convert('RGBA')
        for s in (512, 192): any_.resize((s, s), Image.LANCZOS).save(f'{out}/icon-{s}.png'); mask.resize((s, s), Image.LANCZOS).save(f'{out}/maskable-{s}.png')
        flat = Image.new('RGBA', any_.size, (13, 27, 42, 255)); flat.alpha_composite(any_)
        flat.convert('RGB').resize((180, 180), Image.LANCZOS).save(f'{out}/apple-touch-icon.png')
        any_.resize((64, 64), Image.LANCZOS).save(f'{out}/favicon-64.png')
        any_.resize((32, 32), Image.LANCZOS).save(f'{out}/favicon-32.png')
        print('icons written')
