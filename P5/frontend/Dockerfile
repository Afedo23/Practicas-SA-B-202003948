# Frontend estatico (HTML/CSS/JS sin build step) servido con nginx.
# Imagen minima, no-root, filesystem de solo lectura.
FROM nginx:1.27-alpine

RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app \
    && rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf \
    && mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    && chown -R app:app /usr/share/nginx/html /var/log/nginx /tmp

COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/index.html

USER app
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
