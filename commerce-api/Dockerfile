FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATABASE_PATH=/var/lib/osgard-commerce/commerce.sqlite3

WORKDIR /app
RUN mkdir -p /var/lib/osgard-commerce \
    && groupadd --system --gid 10001 commerce \
    && useradd --system --uid 10001 --gid commerce --home-dir /nonexistent --shell /usr/sbin/nologin commerce \
    && chown -R commerce:commerce /var/lib/osgard-commerce
COPY --chown=commerce:commerce app.py /app/app.py
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2)"
CMD ["python", "-u", "/app/app.py"]
