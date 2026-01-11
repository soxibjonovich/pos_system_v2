# auth/Dockerfile
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

COPY . ./

CMD [ "uvicorn", "__init__:auth_app", "--host", "0.0.0.0", "--port", "8003" ]
