# ---- build stage: instala dependencias en un venv aislado ----
FROM python:3.12-slim AS build
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---- runtime stage: imagen minima, sin toolchain de compilacion ----
FROM python:3.12-slim
RUN addgroup --gid 10001 --system app && adduser --uid 10001 --system --ingroup app app
WORKDIR /app
COPY --from=build /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY app.py consumer.py ./
USER app
EXPOSE 4004
CMD ["python", "app.py"]
