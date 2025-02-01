FROM python:3.13-slim

RUN apt-get update && apt-get install -y pkg-config libmariadb-dev build-essential

ENV USER=docker
ENV GROUPNAME=$USER
ENV UID=12345
ENV GID=23456

RUN addgroup \
    --gid "$GID" \
    "$GROUPNAME" \
&&  adduser \
    --disabled-password \
    --gecos "" \
    --home "$(pwd)" \
    --ingroup "$GROUPNAME" \
    --no-create-home \
    --uid "$UID" \
    "$USER"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY .. .

RUN mkdir -p /app/logs && chown -R "$GROUPNAME":"$USER" /app

ENV PYTHONPATH=/app

USER "$USER"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-config", "logging.yaml"]
