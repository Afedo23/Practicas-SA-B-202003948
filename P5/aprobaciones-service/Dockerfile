# ---- build stage ----
FROM python:3.12-slim AS build
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---- runtime stage (imagen minima, no-root) ----
FROM python:3.12-slim
RUN addgroup --gid 10001 --system app && adduser --uid 10001 --system --ingroup app app
WORKDIR /app
COPY --from=build /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY app ./app
USER app
EXPOSE 4003
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4003"]
