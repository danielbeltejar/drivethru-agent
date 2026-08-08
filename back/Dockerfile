FROM python:3.11-slim-bookworm AS builder

COPY requirements.txt .

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim-bookworm

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --gid 10001 --system app \
    && adduser --uid 10001 --gid 10001 --system --home /app app

ENV PYTHONUNBUFFERED 1

COPY --from=builder /install /usr/local

COPY --chown=app:app . /app
WORKDIR /app

EXPOSE 8000

ENV PYTHONPATH=/usr/local/lib/python3.11/site-packages

RUN python -m pip uninstall -y pip setuptools wheel \
    && chown -R app:app /app

USER app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
