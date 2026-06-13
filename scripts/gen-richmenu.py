from PIL import Image, ImageDraw, ImageFont
import os, math

W, H = 2500, 843
CREAM="#ffefdd"; GOLD="#f2b450"; TERRA="#e2725b"; DEEP="#c95b3f"; BROWN="#5c4033"

img = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(img)
FONT="/System/Library/Fonts/Supplemental/SukhumvitSet.ttc"
def font(sz, idx=4):
    try: return ImageFont.truetype(FONT, sz, index=idx)
    except Exception: return ImageFont.truetype("/System/Library/Fonts/Supplemental/Thonburi.ttc", sz, index=1)

d.rectangle([0, H-14, W, H], fill=TERRA)

# left circle
cx, cy, r = 430, H//2, 300
d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=TERRA)

# steam: gentle wavy vertical strokes
for sx in (cx-78, cx, cx+78):
    pts=[]
    for t in range(0, 101, 5):
        y = (cy-150) - t*1.0          # rise upward
        x = sx + 22*math.sin(t/100*2*math.pi*1.5)
        pts.append((x, y))
    d.line(pts, fill="#ffffff", width=13, joint="curve")

# lid
d.rounded_rectangle([cx-150, cy-118, cx+150, cy-76], radius=20, fill="#ffffff")
d.ellipse([cx-26, cy-150, cx+26, cy-104], fill="#ffffff")
# body
d.rounded_rectangle([cx-160, cy-68, cx+160, cy+152], radius=46, fill="#ffffff")
# handles
d.rounded_rectangle([cx-205, cy-38, cx-160, cy+52], radius=22, fill="#ffffff")
d.rounded_rectangle([cx+160, cy-38, cx+205, cy+52], radius=22, fill="#ffffff")
# accent stripe
d.rounded_rectangle([cx-160, cy-8, cx+160, cy+36], radius=10, fill=GOLD)

# right text
tx = 880
d.text((tx, 215), "เย็นนี้กินอะไรดี", font=font(170,5), fill=BROWN)
d.text((tx, 410), "ผู้ช่วยจัดการวัตถุดิบ ลดของเสียในครัว", font=font(74,2), fill=DEEP)

# CTA pill + manual arrow
cta="แตะเพื่อเปิดแอป"
ft_cta=font(60,5)
tw=d.textlength(cta, font=ft_cta)
pad_l=58; pill_y0=530; pill_y1=662
pill=[tx, pill_y0, tx+pad_l*2+int(tw)+96, pill_y1]
d.rounded_rectangle(pill, radius=66, fill=TERRA)
d.text((tx+pad_l, 560), cta, font=ft_cta, fill="#ffffff")
# arrow triangle
ax = tx+pad_l+tw+38; ay=(pill_y0+pill_y1)//2
d.polygon([(ax,ay-26),(ax,ay+26),(ax+40,ay)], fill="#ffffff")

img.save("/tmp/richmenu.png","PNG")
print("saved", img.size, os.path.getsize("/tmp/richmenu.png"),"bytes")
