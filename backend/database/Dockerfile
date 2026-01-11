# database/Dockerfile
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Copy uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

# Copy application code
COPY . ./

# Create data directory
RUN mkdir -p /app/data

CMD [ "uvicorn", "__init__:app", "--host", "0.0.0.0", "--port", "8002" ]
