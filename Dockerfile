# minesweeper — statik dosya servisi (bkz. docs/05-architecture.md NFR-3: derlemesiz saf HTML/CSS/JS).
# Sıfır bağımlılık ilkesi yalnız uygulama koduna dairdir; paketleme için hafif nginx yeterli.
FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY src/ /usr/share/nginx/html/src/
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
