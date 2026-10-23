import os
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

src_path = r"C:\Users\krish\.gemini\antigravity-ide\brain\c45bf0ff-7a8a-49aa-8065-21f9f6ff0216\.user_uploaded\media_1792786176650.jpg"
out_dir = r"d:\whats-matter-series\cohort-2.0 restart\resume-projects\application\AajKyaBanaye\app\assets\images"

orig = Image.open(src_path).convert("RGBA")
arr = np.array(orig)
h, w, _ = arr.shape

# 1. Flood fill mask from the edges to separate background from foreground elements
visited = np.zeros((h, w), dtype=bool)
bg_mask = np.zeros((h, w), dtype=bool)

# Seed edges
queue = deque()
for x in range(w):
    queue.append((0, x))
    queue.append((h - 1, x))
    visited[0, x] = True
    visited[h - 1, x] = True
for y in range(h):
    queue.append((y, 0))
    queue.append((y, w - 1))
    visited[y, 0] = True
    visited[y, w - 1] = True

while queue:
    y, x = queue.popleft()
    r, g, b, _ = arr[y, x]
    # Check if pixel is background: cream/light off-white
    # Foreground lines are dark green (R<100, G<100, B<100), red tomato, orange spoon/text, leaves
    if r > 215 and g > 210 and b > 190:
        bg_mask[y, x] = True
        for ny, nx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

# Create RGBA array with transparent background
arr_transparent = arr.copy()
# Smooth alpha transition on edge
arr_transparent[bg_mask, 3] = 0

# Also check for isolated background pockets (e.g. between text or spoon)
# Any pixel where R>235, G>230, B>210 that is outside any dark boundary
# For now, arr_transparent has the main clean cutout
transparent_img = Image.fromarray(arr_transparent, "RGBA")

# 2. Solid #FFF9F0 Cream background version
cream_bg_color = (255, 249, 240, 255) # #FFF9F0
cream_img = Image.new("RGBA", (w, h), cream_bg_color)
cream_img.paste(transparent_img, (0, 0), transparent_img)

# 3. Save primary logo.png (1024x1024 with cream background and transparent option)
cream_img.save(os.path.join(out_dir, "logo.png"), "PNG")

# 4. App icon (1024x1024)
# Make sure the icon is well-framed with ~8% margin so rounded squircle icons look great
icon_canvas = Image.new("RGBA", (1024, 1024), cream_bg_color)
scaled_logo = cream_img.resize((920, 920), Image.Resampling.LANCZOS)
icon_canvas.paste(scaled_logo, (52, 52), scaled_logo)
icon_canvas.save(os.path.join(out_dir, "icon.png"), "PNG")

# 5. Android Adaptive Icon (adaptive-icon.png)
# Android renders adaptive icons inside a 66% safe zone circle (center 675x675 out of 1024x1024)
# We scale the logo to fit comfortably inside the safe zone (720x720) centered on #FFF9F0
adaptive_canvas = Image.new("RGBA", (1024, 1024), cream_bg_color)
adaptive_logo = transparent_img.resize((720, 720), Image.Resampling.LANCZOS)
adaptive_canvas.paste(adaptive_logo, (152, 152), adaptive_logo)
adaptive_canvas.save(os.path.join(out_dir, "adaptive-icon.png"), "PNG")

# 6. Navbar Logo & Header (navbar-logo.png)
# For header/navbar, create a crisp cropped version of the mascot + text
# Bounding box of non-bg: [81, 910], [213, 826]
# Let's crop with a 20px padding
bbox_crop = transparent_img.crop((190, 60, 850, 940))
navbar_canvas = Image.new("RGBA", (512, 512), cream_bg_color)
# resize crop to fit 480x480
w_c, h_c = bbox_crop.size
ratio = min(480 / w_c, 480 / h_c)
nw, nh = int(w_c * ratio), int(h_c * ratio)
resized_crop = bbox_crop.resize((nw, nh), Image.Resampling.LANCZOS)
navbar_canvas.paste(resized_crop, ((512 - nw) // 2, (512 - nh) // 2), resized_crop)
navbar_canvas.save(os.path.join(out_dir, "navbar-logo.png"), "PNG")

# 7. Pot icon (pot-icon.png) - focused crop of the mascot hat + pot + spoon (no bottom text)
# rows [81, 600]
pot_crop = transparent_img.crop((190, 60, 850, 600))
pot_canvas = Image.new("RGBA", (512, 512), (255, 249, 240, 0)) # transparent
pw, ph = pot_crop.size
pratio = min(460 / pw, 460 / ph)
pnw, pnh = int(pw * pratio), int(ph * pratio)
resized_pot = pot_crop.resize((pnw, pnh), Image.Resampling.LANCZOS)
pot_canvas.paste(resized_pot, ((512 - pnw) // 2, (512 - pnh) // 2), resized_pot)
pot_canvas.save(os.path.join(out_dir, "pot-icon.png"), "PNG")

# 8. Web Favicon (favicon.png: 192x192)
fav = Image.new("RGBA", (192, 192), cream_bg_color)
fav_logo = transparent_img.resize((172, 172), Image.Resampling.LANCZOS)
fav.paste(fav_logo, (10, 10), fav_logo)
fav.save(os.path.join(out_dir, "favicon.png"), "PNG")

# 9. Splash icon & Splash screen (splash-icon.png, splash.png)
# Expo splash-screen expects splash-icon.png to be centered on backgroundColor (#FFF9F0)
# We provide splash-icon.png as the clean mascot logo (512x512)
splash_icon = Image.new("RGBA", (512, 512), (255, 249, 240, 0)) # transparent
si_logo = transparent_img.resize((480, 480), Image.Resampling.LANCZOS)
splash_icon.paste(si_logo, (16, 16), si_logo)
splash_icon.save(os.path.join(out_dir, "splash-icon.png"), "PNG")

# Full resolution splash screen for native mobile & web fallback (1242 x 2688, iPhone/Android full portrait)
splash_canvas = Image.new("RGBA", (1242, 2688), cream_bg_color)
# Place logo centered around y = 42% height
sw, sh = 720, 720
full_logo = transparent_img.resize((sw, sh), Image.Resampling.LANCZOS)
splash_canvas.paste(full_logo, ((1242 - sw) // 2, int(2688 * 0.38)), full_logo)
splash_canvas.save(os.path.join(out_dir, "splash.png"), "PNG")

print("All brand assets generated successfully from user's official cartoon logo!")
