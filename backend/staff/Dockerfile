# order/Dockerfile
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

COPY . ./

EXPOSE 8005

CMD [ "uvicorn", "__init__:router", "--host", "0.0.0.0", "--port", "8005" ]
